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
      name: 'session_id', // Change session cookie name from default 'connect.sid'
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

  // Get the current Replit environment URL
  const getReplitURL = (req: Express.Request) => {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
    const host = req.get('host') || req.hostname;
    return `${protocol}://${host}`;
  };

  // Dynamically configure Google Strategy on each request
  app.use((req, res, next) => {
    const baseURL = getReplitURL(req);
    const redirectURI = `${baseURL}/auth/google/callback`;

    console.log('OAuth Configuration:', {
      baseURL,
      redirectURI,
      clientID: process.env.GOOGLE_CLIENT_ID?.substring(0, 8) + '...',
      env: process.env.NODE_ENV || 'development'
    });

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET.trim(),
          callbackURL: redirectURI,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
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
    next();
  });

  // Auth routes
  app.get("/auth/google", (req, res, next) => {
    const baseURL = getReplitURL(req);
    console.log('Starting OAuth flow:', {
      url: baseURL,
      path: '/auth/google'
    });
    passport.authenticate("google", {
      scope: ["profile", "email"]
    })(req, res, next);
  });

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      console.log('OAuth callback received:', {
        query: req.query,
        headers: {
          host: req.get('host'),
          referer: req.get('referer')
        }
      });

      if (req.query.error) {
        console.error('Google OAuth error:', {
          error: req.query.error,
          details: req.query.error_description
        });
        return res.redirect('/login?error=auth_failed');
      }

      passport.authenticate("google", {
        failureRedirect: "/login?error=auth_failed",
        successRedirect: "/",
      })(req, res, next);
    }
  );

  app.get("/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/login");
    });
  });

  // Auth status endpoint
  app.get("/api/auth/status", (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
    });
  });
}