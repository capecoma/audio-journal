import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

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

export function setupAuth(app: Express) {
  console.log('Starting authentication setup...');

  // Set up session store
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "repl-auth-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: 'none' // Required for cross-site authentication
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  // Get callback URL (always use Replit URL)
  const replitUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  const callbackUrl = `${replitUrl}/auth/google/callback`;

  // Initialize session and passport
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Get and validate credentials
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    console.error("Missing OAuth credentials");
    return;
  }

  // Configure Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackUrl,
        proxy: true
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('Processing OAuth callback for profile:', {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value
          });

          // Find or create user
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

  // Serialize/Deserialize user
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
  app.get(
    "/auth/google",
    (req, res, next) => {
      console.log('Starting Google OAuth flow from:', req.headers.referer);
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
      failureRedirect: "/login?error=auth_failed",
      successReturnToOrRedirect: "/",
    })
  );

  // Auth status endpoint
  app.get("/api/auth/status", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      } : null
    });
  });

  console.log('Auth setup completed with config:', {
    callbackUrl,
    cookieSecure: sessionSettings.cookie?.secure,
    cookieSameSite: sessionSettings.cookie?.sameSite
  });
}