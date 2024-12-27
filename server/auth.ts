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

  // Clean credentials
  const clientId = rawClientId.trim();
  const clientSecret = rawClientSecret.trim();

  // Detailed validation logging
  console.log('OAuth Configuration Debug:', {
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      REPL_SLUG: process.env.REPL_SLUG,
      REPL_OWNER: process.env.REPL_OWNER,
    },
    clientId: {
      present: !!clientId,
      length: clientId.length,
      format: {
        hasSpaces: /\s/.test(clientId),
        startsWithNumbers: /^\d/.test(clientId),
        endsWithGoogleusercontent: clientId.toLowerCase().includes('googleusercontent.com'),
        hasAppsPrefix: clientId.includes('apps.'),
        preview: clientId ? `${clientId.substring(0, 8)}...${clientId.substring(Math.max(0, clientId.length - 20))}` : 'not present'
      }
    },
    clientSecret: {
      present: !!clientSecret,
      length: clientSecret.length,
      format: {
        hasSpaces: /\s/.test(clientSecret),
        preview: clientSecret ? `${clientSecret.substring(0, 4)}...` : 'not present'
      }
    },
    callbackUrl: process.env.NODE_ENV === "production"
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`
      : "http://localhost:5000/auth/google/callback"
  });

  // Additional space validation
  if (clientId !== rawClientId.trim() || clientSecret !== rawClientSecret.trim()) {
    throw new Error("OAuth credentials contain leading or trailing spaces. Please remove any extra spaces.");
  }

  // Validate client ID format
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    throw new Error("Invalid Google OAuth client ID format. Must end with .apps.googleusercontent.com");
  }

  // Validate lengths
  if (clientId.length < 50) {
    throw new Error("Client ID appears too short after cleaning");
  }

  if (clientSecret.length < 20) {
    throw new Error("Client secret appears too short after cleaning");
  }

  return { clientId, clientSecret };
}

export function setupAuth(app: Express) {
  console.log('Starting authentication setup...');

  // Validate OAuth credentials
  const { clientId, clientSecret } = validateAndCleanOAuthCredentials();

  console.log('Setting up session middleware...');
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
    console.log('Configuring for production environment...');
    app.set("trust proxy", 1);
  }

  console.log('Initializing session and passport middleware...');
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  const callbackURL = process.env.NODE_ENV === "production"
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`
    : "http://localhost:5000/auth/google/callback";

  console.log('Configuring Google OAuth strategy...');
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
          console.log('Processing OAuth callback for profile:', {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value
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
              console.log('Creating new user account...');
              [user] = await db
                .insert(users)
                .values({
                  username: profile.displayName || profile.emails?.[0]?.value || profile.id,
                  email: profile.emails?.[0]?.value,
                  googleId: profile.id,
                })
                .returning();
            } else {
              console.log('Linking existing account with Google...');
              [user] = await db
                .update(users)
                .set({ googleId: profile.id })
                .where(eq(users.id, user.id))
                .returning();
            }
          }

          return done(null, user);
        } catch (err) {
          console.error("Error in Google OAuth callback:", err);
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(new Error('User not found'));
      }
      done(null, user);
    } catch (err) {
      console.error('Error deserializing user:', err);
      done(err);
    }
  });

  // Auth routes
  console.log('Setting up authentication routes...');

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
        code: !!req.query.code
      });
      next();
    },
    passport.authenticate("google", {
      failureRedirect: "/login?error=auth_failed",
      failureMessage: true,
      successReturnToOrRedirect: "/"
    }),
    (req, res) => {
      const user = req.user as Express.User;
      console.log('OAuth authentication successful:', {
        id: user.id,
        username: user.username
      });
      res.redirect("/");
    }
  );

  // Auth status endpoint
  app.get("/api/auth/status", (req, res) => {
    const user = req.user as Express.User | undefined;
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: user ? {
        id: user.id,
        username: user.username,
        email: user.email
      } : null
    });
  });

  console.log('Authentication setup completed');
}