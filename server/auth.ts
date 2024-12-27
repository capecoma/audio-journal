import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import type { User } from "@db/schema";

declare global {
  namespace Express {
    interface User extends Omit<User, "password"> {}
  }
}

export function setupAuth(app: Express) {
  // Validate OAuth credentials
  let googleClientId = process.env.GOOGLE_CLIENT_ID;
  let googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Debug credential presence and format
  console.log('OAuth Credentials Debug:', {
    clientId: {
      present: !!googleClientId,
      format: googleClientId ? {
        length: googleClientId.length,
        hasWhitespace: /^\s|\s$/.test(googleClientId),
        preview: googleClientId ? `${googleClientId.substring(0, 8)}...${googleClientId.substring(Math.max(0, googleClientId.length - 20))}` : 'not present'
      } : null
    },
    clientSecret: {
      present: !!googleClientSecret,
      length: googleClientSecret?.length
    }
  });

  // Validate and clean credentials
  if (!googleClientId || !googleClientSecret) {
    console.error("Missing OAuth credentials:", {
      clientIdMissing: !googleClientId,
      clientSecretMissing: !googleClientSecret
    });
    throw new Error("Google OAuth credentials are not set. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
  }

  // Clean up credentials
  googleClientId = googleClientId.trim();
  googleClientSecret = googleClientSecret.trim();

  // Validate client ID format
  if (!googleClientId.includes('.apps.googleusercontent.com')) {
    console.error("Invalid client ID format. Expected to end with .apps.googleusercontent.com");
    throw new Error("Invalid Google OAuth client ID format");
  }

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

  console.log('OAuth Configuration:', {
    environment: process.env.NODE_ENV || 'development',
    callbackURL,
    clientIdValid: googleClientId.includes('.apps.googleusercontent.com'),
    sessionConfig: {
      secure: sessionSettings.cookie?.secure,
      sameSite: sessionSettings.cookie?.sameSite,
      proxy: app.get("env") === "production"
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
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
    if (!user || !('id' in user)) {
      return done(new Error('Invalid user object during serialization'));
    }
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
        error: req.query.error
      });
      next();
    },
    passport.authenticate("google", {
      failureRedirect: "/login",
      failureMessage: true
    }),
    (req, res) => {
      console.log('OAuth authentication successful, redirecting to home');
      res.redirect("/");
    }
  );

  // Auth status endpoint
  app.get("/api/auth/status", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      session: {
        exists: !!req.session,
        cookie: req.session?.cookie ? {
          maxAge: req.session.cookie.maxAge,
          secure: req.session.cookie.secure,
          sameSite: req.session.cookie.sameSite
        } : null
      }
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