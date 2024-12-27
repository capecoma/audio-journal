import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import session from "express-session";
import MemoryStore from "memorystore";

// Initialize session store
const SessionStore = MemoryStore(session);

export function setupAuth(app: Express) {
  // Configure session middleware with better security
  app.use(
    session({
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
      },
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user for the session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });

  // Deserialize user from the session
  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  // Set up Google OAuth strategy
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("Missing required Google OAuth credentials");
    process.exit(1);
  }

  // Get the current host for dynamic callback URL
  const host = process.env.NODE_ENV === 'production' 
    ? process.env.HOST_URL 
    : 'http://localhost:5000';

  console.log('Configuring Google OAuth with callback URL:', `${host}/auth/google/callback`);
  console.log('Using client ID:', process.env.GOOGLE_CLIENT_ID.substring(0, 8) + '...');

  // Configure Google Strategy with detailed error logging
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${host}/auth/google/callback`,
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          console.log('Google OAuth callback received:', {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName
          });

          const user = {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value
          };
          return done(null, user);
        } catch (error) {
          console.error('Error in Google OAuth callback:', error);
          return done(error as Error);
        }
      }
    )
  );

  // Auth routes with error handling
  app.get(
    "/auth/google",
    (req, res, next) => {
      console.log('Starting Google OAuth flow...');
      passport.authenticate("google", {
        scope: ["profile", "email"],
      })(req, res, next);
    }
  );

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      console.log('Received callback from Google OAuth');
      if (req.query.error) {
        console.error('Google OAuth error:', req.query);
      }
      passport.authenticate("google", {
        failureRedirect: "/login?error=auth_failed",
        successRedirect: "/",
        failWithError: true,
      })(req, res, next);
    }
  );

  app.get("/auth/logout", (req, res) => {
    console.log('User logging out');
    req.logout(() => {
      res.redirect("/login");
    });
  });

  // Auth status endpoint with detailed user info
  app.get("/api/auth/status", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
    });
  });
}