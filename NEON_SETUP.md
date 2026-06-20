# Neon + Better Auth Setup Instructions

Your LORD AI application has been successfully migrated from Supabase to **Neon PostgreSQL + Better Auth**. Follow these steps to get up and running.

## 🚀 Quick Setup (5 minutes)

### Step 1: Add Environment Variables to Vercel

Go to your [Vercel project settings](https://vercel.com/dashboard) → Settings → Environment Variables and add:

```
DATABASE_URL = postgresql://user:password@ep-xxxxx.us-east-1.neon.tech/dbname?sslmode=require
BETTER_AUTH_SECRET = [generate with: openssl rand -base64 32]
```

**Get DATABASE_URL from:**
1. Visit [Neon Console](https://console.neon.tech)
2. Select your project → Database
3. Click "Connection string" → copy full PostgreSQL connection string

**Generate BETTER_AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 2: Create Database Schema

1. Go to Neon Console → SQL Editor
2. Copy all SQL from [Schema Setup Section](#database-schema) below
3. Run it to create all tables

### Step 3: Test Locally

```bash
# Set environment variables in .env.local
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...

# Install and run
npm install
npm run dev
```

Visit `http://localhost:3000/auth` → Create account → Should redirect to chat

### Step 4: Deploy

Push your changes to GitHub. Vercel will automatically deploy with the environment variables you set.

---

## 📋 Database Schema

Copy and run this SQL in your Neon Console → SQL Editor:

```sql
-- Better Auth Tables (Required)
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  expiresAt TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TIMESTAMP,
  refreshTokenExpiresAt TIMESTAMP,
  scope TEXT,
  password TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- App Tables
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  conversationId INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memories (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  importance TEXT DEFAULT 'medium',
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL UNIQUE,
  model TEXT DEFAULT 'gpt-4',
  temperature TEXT DEFAULT '0.7',
  systemPrompt TEXT,
  theme TEXT DEFAULT 'light',
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## ✅ What's Changed

### Authentication
- **Old**: Supabase Auth (`supabase.auth.signIn()`, etc.)
- **New**: Better Auth (`authClient.signIn.email()`, etc.)
- Users sign up with email/password at `/auth`
- Session automatically stored in PostgreSQL

### Database
- **Old**: Supabase RLS policies + client queries
- **New**: Neon PostgreSQL + Drizzle ORM + server functions
- All queries automatically scoped to logged-in user
- Type-safe database operations

### Deployment
- No changes needed! Push to GitHub, Vercel deploys automatically
- Just add the 2 environment variables in Vercel Settings

---

## 🔗 Files Changed

- `src/lib/auth.ts` - Better Auth configuration
- `src/lib/auth-client.ts` - Auth client for browser
- `src/lib/db.ts` - Drizzle + PostgreSQL setup
- `src/lib/schema.ts` - All table definitions
- `src/lib/actions.ts` - Server functions for database ops
- `src/routes/auth.tsx` - Sign in/up page (uses Better Auth)
- `src/routes/_authenticated/*` - Updated to use server functions
- `package.json` - Added better-auth, pg, drizzle-orm

See `MIGRATION_NEON.md` for detailed technical breakdown.

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "DATABASE_URL is not set" | Add it to Vercel Settings → Environment Variables |
| "Session not persisting" | Check BETTER_AUTH_SECRET is set (≥32 chars) |
| "Tables don't exist" | Run the SQL schema above in Neon Console |
| Sign up/in not working | Check browser console for errors, verify env vars |
| Build fails locally | Run `npm install` and `npm run build` |

---

## 📚 Documentation

- Full migration details: `MIGRATION_NEON.md`
- Neon docs: https://neon.tech/docs
- Better Auth docs: https://betterauth.dev
- Drizzle ORM: https://orm.drizzle.team

---

## ✨ Key Features

✅ Email/password authentication  
✅ Secure session management  
✅ Automatic user data scoping  
✅ Type-safe database queries  
✅ PostgreSQL full-text search ready  
✅ Zero-downtime deployments  
✅ Automatic backups (Neon)  

Ready to go! Push to GitHub and watch it deploy. 🚀
