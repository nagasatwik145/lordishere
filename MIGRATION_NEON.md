# Supabase → Neon Migration Guide

This project has been successfully migrated from Supabase Auth + Supabase Database to **Neon PostgreSQL + Better Auth**.

## What Changed

### ✅ Removed
- `@supabase/supabase-js` package
- Supabase auth client integration (`/src/integrations/supabase/`)
- Supabase database queries throughout the application

### ✅ Added
- **Better Auth** for authentication (`src/lib/auth.ts`, `src/lib/auth-client.ts`)
- **Neon PostgreSQL** with Drizzle ORM (`src/lib/db.ts`, `src/lib/schema.ts`)
- **TanStack server functions** for database operations (`src/lib/actions.ts`)
- Neon schema with user auth tables + app data tables (conversations, messages, memories)

## Architecture

### Authentication Flow
- **Before**: Supabase Auth → Custom user session
- **After**: Better Auth + PostgreSQL → Email/password authentication with secure session management

### Data Operations
- **Before**: Direct Supabase client calls throughout components
- **After**: TanStack React Start server functions → Drizzle ORM queries → Neon PostgreSQL

### Security
- **Row-level scoping**: All queries automatically scoped to authenticated user ID via `getUserId()` helper
- **No ORM SQL injection**: Drizzle prevents SQL injection through parameterized queries
- **Session-based auth**: Better Auth handles secure session cookies with proper same-site attributes

## Updated Files

### Core Files
| File | Changes |
|------|---------|
| `src/lib/auth.ts` | New Better Auth configuration |
| `src/lib/auth-client.ts` | New Better Auth React client |
| `src/lib/db.ts` | New Drizzle + PostgreSQL setup |
| `src/lib/schema.ts` | All table schemas (auth + app tables) |
| `src/lib/actions.ts` | Server functions for database operations |
| `src/routes/auth.tsx` | Updated to use Better Auth |
| `src/routes/_authenticated/route.tsx` | Updated session check with Better Auth |
| `src/routes/_authenticated/chat.tsx` | Updated to use server functions |
| `src/routes/_authenticated/memory.tsx` | Updated to use server functions |
| `src/start.ts` | Removed Supabase auth middleware |
| `package.json` | Replaced Supabase with better-auth, pg, drizzle-orm |

## Quick Start

### 1. Set Environment Variables

Create a `.env.local` file (or use `.env.example` as template):

```bash
# Get DATABASE_URL from Neon console
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-1.neon.tech/dbname?sslmode=require

# Generate BETTER_AUTH_SECRET
BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# Optional: customize auth URL
# BETTER_AUTH_URL=https://yourdomain.com
```

### 2. Create Database Tables

The database tables are defined in `src/lib/schema.ts`. You'll need to create them in your Neon database:

```sql
-- Better Auth tables
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "session" (
  id TEXT PRIMARY KEY,
  expiresAt TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW(),
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE "account" (
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

CREATE TABLE "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- App tables
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  conversationId INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE memories (
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

CREATE TABLE user_settings (
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

### 3. Run the Development Server

```bash
npm install
npm run dev
```

The server runs at `http://localhost:3000`.

### 4. Test Authentication

1. Go to `/auth`
2. Create a new account or sign in
3. You should be redirected to `/chat` on successful authentication
4. Conversations and memories are automatically saved to Neon

## Server Functions

Data operations use TanStack React Start server functions defined in `src/lib/actions.ts`:

```typescript
// Fetch conversations (automatically scoped to current user)
const conversations = await getConversations();

// Create a new conversation
const newConv = await createConversation({ title: "My Chat" });

// Get messages for a conversation
const messages = await getMessages(conversationId);

// Upsert messages
await upsertMessages({
  conversationId,
  messageRows: [{ id, role: "user", content: "..." }]
});

// Memory operations
const memories = await getMemories();
await createMemory({ title, content, category });
await deleteMemory(id);
```

## Key Differences from Supabase

| Aspect | Supabase | Neon (Better Auth) |
|--------|----------|-------------------|
| Auth Client | `supabase.auth.*` | `authClient.*` |
| Session Check | `supabase.auth.getUser()` | `authClient.getSession()` |
| DB Queries | `supabase.from().select()` | Server functions → Drizzle |
| User Scoping | RLS policies | Manual `userId` filtering |
| Transactions | Limited | Full PostgreSQL transactions |
| Type Safety | Basic | Full TypeScript with Drizzle |

## Troubleshooting

### `DATABASE_URL` is not set
Set the environment variable from your Neon console connection string.

### Session not persisting
Ensure `BETTER_AUTH_SECRET` is set (≥32 characters). Without it, Better Auth will throw at runtime.

### Tables don't exist
Run the SQL setup script above to create all tables in your Neon database.

### Sign up/sign in not working
1. Check that `BETTER_AUTH_SECRET` is set
2. Verify database connectivity: `psql $DATABASE_URL -c "SELECT 1"`
3. Check browser console for CORS or auth errors

## Deployment

### Vercel
1. Connect your GitHub repository
2. Add environment variables in Vercel project settings:
   - `DATABASE_URL` (your Neon connection string)
   - `BETTER_AUTH_SECRET` (≥32 character random string)
3. Deploy as usual - Better Auth handles everything automatically

### Self-Hosted
1. Set environment variables on your server
2. Run migrations (create tables as shown above)
3. Start the app: `npm run dev` or `npm run build && npm start`

## What's Next

- Add more OAuth providers if needed (edit `src/lib/auth.ts`)
- Implement email verification (Better Auth has built-in support)
- Add password reset flow
- Create admin dashboard for managing users
- Implement real-time features with database subscriptions

## Questions?

Refer to:
- [Better Auth Docs](https://betterauth.dev)
- [Neon Docs](https://neon.tech/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [TanStack Start Docs](https://tanstack.com/start)
