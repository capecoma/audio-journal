import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import type { User } from "@db/schema";

// Extend express session to include our user type
declare global {
  namespace Express {
    interface User extends Omit<User, "password"> {}
  }
}

export function setupAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not set. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
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
    callbackURL,
    clientID: process.env.GOOGLE_CLIENT_ID?.slice(0, 8) + '...',
    environment: process.env.NODE_ENV || 'development'
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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

          // Check if user exists by googleId
          let [user] = await db
            .select()
            .from(users)
            .where(eq(users.googleId, profile.id))
            .limit(1);

          if (!user) {
            // Check if user exists by email
            const email = profile.emails?.[0]?.value;
            if (email) {
              [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
            }

            if (!user) {
              // Create new user
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
              // Update existing user with Google ID
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
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.get(
    "/auth/google",
    (req, res, next) => {
      console.log('Starting Google OAuth flow:', {
        path: req.path,
        callbackURL,
        headers: {
          origin: req.headers.origin,
          referer: req.headers.referer
        }
      });
      next();
    },
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: "select_account",
      accessType: "offline",
      includeGrantedScopes: true
    })
  );

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      console.log('Received Google OAuth callback:', {
        query: req.query,
        headers: {
          origin: req.headers.origin,
          referer: req.headers.referer
        }
      });
      next();
    },
    passport.authenticate("google", { 
      failureRedirect: "/login",
      failureMessage: true
    }),
    (req, res) => {
      console.log('OAuth callback successful, redirecting to home');
      res.redirect("/");
    }
  );

  // Auth status endpoint
  app.get("/api/auth/status", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });
  });

  // User info endpoint
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
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