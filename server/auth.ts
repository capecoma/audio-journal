import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import type { User } from "@db/schema";

// extend express user object with our schema
declare global {
  namespace Express {
    // Use the imported User type instead of recursive reference
    interface User extends Omit<User, keyof Express.User> {}
  }
}

export function setupAuth(app: Express) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials are not set");
  }

  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "repl-auth-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "none",
      secure: true
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

  // Get the callback URL based on the environment
  const callbackURL = app.get("env") === "production"
    ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`
    : "http://localhost:5000/auth/google/callback";

  console.log('Setting up Google OAuth with callback URL:', callbackURL);

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
          console.log('Google OAuth callback received for profile:', profile.id);

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
              // Create new user if doesn't exist
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

  // Google OAuth routes
  app.get(
    "/auth/google",
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: "select_account"
    })
  );

  app.get(
    "/auth/google/callback",
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