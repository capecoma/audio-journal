import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users as usersTable, insertUserSchema, type SelectUser } from "@db/schema";
import { getDb } from "@db";
import { eq, or } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID || "development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
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

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const db = getDb();
        const foundUsers = await db
          .select()
          .from(usersTable)
          .where(or(eq(usersTable.username, username), eq(usersTable.email, username)))
          .limit(1);

        if (!foundUsers.length) {
          return done(null, false, { message: "Invalid username or email." });
        }

        const user = foundUsers[0];
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const db = getDb();
      const foundUsers = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);

      if (!foundUsers.length) {
        return done(null, false);
      }
      done(null, foundUsers[0]);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid input",
          details: result.error.issues.map(i => i.message)
        });
      }

      const db = getDb();
      const { username, email, password } = result.data;

      // Check for existing username or email
      const existingUsers = await db
        .select()
        .from(usersTable)
        .where(or(eq(usersTable.username, username), eq(usersTable.email, email)))
        .limit(1);

      if (existingUsers.length) {
        return res.status(400).json({ 
          error: existingUsers[0].username === username 
            ? "Username already exists" 
            : "Email already exists" 
        });
      }

      // Hash password and create user
      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(usersTable)
        .values({
          username,
          email,
          password: hashedPassword,
          createdAt: new Date().toISOString(),
          preferences: { aiJournalingEnabled: false }
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          ok: true,
          user: { 
            id: newUser.id, 
            username: newUser.username, 
            email: newUser.email 
          }
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({ 
          ok: false,
          error: info.message ?? "Login failed" 
        });
      }

      req.login(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          ok: true,
          user: { 
            id: user.id, 
            username: user.username, 
            email: user.email 
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ 
          ok: false,
          error: "Logout failed" 
        });
      }
      res.json({ ok: true });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  });
}