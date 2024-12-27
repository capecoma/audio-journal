import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import session from "express-session";
import MemoryStore from "memorystore";

// Initialize session store
const SessionStore = MemoryStore(session);

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("No SESSION_SECRET set, using fallback secret. This is not secure for production.");
  }

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

  console.log('Google OAuth Configuration:');
  console.log('- Callback URL:', `${host}/auth/google/callback`);
  console.log('- Client ID:', `${process.env.GOOGLE_CLIENT_ID.substring(0, 8)}...`);
  console.log('- Environment:', process.env.NODE_ENV || 'development');

  // Configure Google Strategy with detailed error logging
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
        callbackURL: `${host}/auth/google/callback`,
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          console.log('Google OAuth callback received for profile:', {
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
      console.log('Starting Google OAuth flow:', {
        timestamp: new Date().toISOString(),
        headers: req.headers['user-agent']
      });
      passport.authenticate("google", {
        scope: ["profile", "email"],
        prompt: 'select_account',  // Always show account selector
        accessType: 'offline',     // Request refresh token
        includeGrantedScopes: true // Include granted scopes in the response
      })(req, res, next);
    }
  );

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      console.log('OAuth callback received:', {
        query: req.query,
        timestamp: new Date().toISOString()
      });

      if (req.query.error) {
        console.error('Google OAuth error:', {
          error: req.query.error,
          details: req.query.error_description,
          timestamp: new Date().toISOString()
        });
        return res.redirect('/login?error=auth_failed');
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