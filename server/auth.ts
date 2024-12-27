import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import type { User } from "@db/schema";

// Fix recursive type reference by explicitly defining session user type
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string | null;
      googleId: string | null;
      createdAt: string;
    }
  }
}

function validateAndCleanOAuthCredentials() {
  // Get and clean credentials
  const rawClientId = process.env.GOOGLE_CLIENT_ID;
  const rawClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!rawClientId || !rawClientSecret) {
    throw new Error("Missing OAuth credentials. Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.");
  }

  // Clean credentials and log original state
  console.log('Raw credentials state:', {
    clientId: {
      length: rawClientId.length,
      hasLeadingSpace: rawClientId.startsWith(' '),
      hasTrailingSpace: rawClientId.endsWith(' ')
    },
    clientSecret: {
      length: rawClientSecret.length,
      hasLeadingSpace: rawClientSecret.startsWith(' '),
      hasTrailingSpace: rawClientSecret.endsWith(' ')
    }
  });

  const clientId = rawClientId.trim();
  const clientSecret = rawClientSecret.trim();

  // Log cleaned state
  console.log('Cleaned credentials state:', {
    clientId: {
      length: clientId.length,
      hasLeadingSpace: clientId.startsWith(' '),
      hasTrailingSpace: clientId.endsWith(' ')
    },
    clientSecret: {
      length: clientSecret.length,
      hasLeadingSpace: clientSecret.startsWith(' '),
      hasTrailingSpace: clientSecret.endsWith(' ')
    }
  });

  // Validate client ID format
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    console.error("Invalid client ID format:", {
      length: clientId.length,
      endsWithCorrectDomain: clientId.endsWith('.apps.googleusercontent.com'),
      containsSpaces: /\s/.test(clientId)
    });
    throw new Error("Invalid Google OAuth client ID format. Must end with .apps.googleusercontent.com");
  }

  // Validate lengths after trimming
  if (clientId.length < 50) {
    throw new Error("Client ID appears too short after cleaning. Please check the credential.");
  }

  if (clientSecret.length < 20) {
    throw new Error("Client secret appears too short after cleaning. Please check the credential.");
  }

  return { clientId, clientSecret };
}

export function setupAuth(app: Express) {
  // Validate OAuth credentials
  const { clientId, clientSecret } = validateAndCleanOAuthCredentials();

  console.log('OAuth Configuration:', {
    environment: process.env.NODE_ENV || 'development',
    clientIdValid: clientId.endsWith('.apps.googleusercontent.com'),
    clientIdLength: clientId.length,
    clientSecretLength: clientSecret.length,
    callbackUrl: process.env.NODE_ENV === "production"
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`
      : "http://localhost:5000/auth/google/callback"
  });

  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "repl-auth-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  const callbackURL = process.env.NODE_ENV === "production"
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`
    : "http://localhost:5000/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL,
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('Google OAuth callback received:', {
            profileId: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName
          });

          let [user] = await db
            .select()
            .from(users)
            .where(eq(users.googleId, profile.id))
            .limit(1);

          if (!user) {
            const email = profile.emails?.[0]?.value;
            if (email) {
              [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
            }

            if (!user) {
              console.log('Creating new user for:', profile.displayName);
              [user] = await db
                .insert(users)
                .values({
                  username: profile.displayName || profile.emails?.[0]?.value || profile.id,
                  email: profile.emails?.[0]?.value,
                  googleId: profile.id,
                })
                .returning();
            } else {
              console.log('Updating existing user with Google ID:', user.username);
              [user] = await db
                .update(users)
                .set({ googleId: profile.id })
                .where(eq(users.id, user.id))
                .returning();
            }
          }

          return done(null, user);
        } catch (err) {
          console.error("Google OAuth error:", err);
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(new Error('User not found during deserialization'));
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.get(
    "/auth/google",
    (req, res, next) => {
      console.log('Starting Google OAuth flow:', {
        headers: {
          origin: req.headers.origin,
          referer: req.headers.referer
        }
      });
      next();
    },
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account"
    })
  );

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      console.log('Received OAuth callback:', {
        query: req.query,
        error: req.query.error,
        state: req.query.state,
        code: !!req.query.code
      });

      // Handle OAuth errors explicitly
      if (req.query.error) {
        console.error('OAuth error:', req.query.error);
        return res.redirect('/login?error=' + encodeURIComponent(req.query.error as string));
      }
      next();
    },
    passport.authenticate("google", {
      failureRedirect: "/login?error=auth_failed",
      failureMessage: true,
      successReturnToOrRedirect: "/"
    }),
    (req, res) => {
      const user = req.user as Express.User;
      console.log('OAuth authentication successful, user:', {
        id: user.id,
        username: user.username,
        email: user.email
      });
      res.redirect("/");
    }
  );

  // Enhanced auth status endpoint
  app.get("/api/auth/status", (req, res) => {
    const user = req.user as Express.User | undefined;
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: user ? {
        id: user.id,
        username: user.username,
        email: user.email
      } : null,
      session: req.session ? {
        id: req.session.id,
        cookie: {
          maxAge: req.session.cookie.maxAge,
          secure: req.session.cookie.secure,
          sameSite: req.session.cookie.sameSite
        }
      } : null
    });
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logout successful" });
    });
  });
}