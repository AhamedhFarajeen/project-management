# Local authentication and database stage

No deployment, hosted database/storage setup, dependency upgrade, or unrelated UI
change was performed in this stage.

## Clerk

Installed versions: Next.js 14.2.35, @clerk/nextjs 6.39.6, @clerk/express 2.1.66.
The existing root ClerkProvider, middleware.ts (correct for Next.js 14), public
sign-in/sign-up pages, frontend hooks, server-side authentication, RTK Query bearer
token forwarding and Express verified-identity middleware are present. Real Clerk
keys are missing from both applications. No credentials were fabricated.

Open Clerk Dashboard → your application → Development instance → API Keys:
https://dashboard.clerk.com/last-active?path=api-keys
Copy keys from the same instance into the local files below, without sharing secrets
in chat. Enable the desired sign-in/sign-up methods in that application's settings.

| File | Variable | Value |
| --- | --- | --- |
| client/.env.local | NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Dashboard publishable key |
| client/.env.local | CLERK_SECRET_KEY | Dashboard secret key; Next.js server only |
| server/.env | CLERK_PUBLISHABLE_KEY | Same publishable key |
| server/.env | CLERK_SECRET_KEY | Same secret key; Express only |

Never prefix secret keys or DATABASE_URL with NEXT_PUBLIC_. The existing environment
examples list these variables. Restart both applications after saving the keys.
No custom JWT template or webhook is required by this implementation.

The following nonsecret local values are configured:

```dotenv
# client/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

# server/.env
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

The verified Clerk subject maps to unique nullable User.clerkUserId. Integer
User.userId remains the relationship key. New authenticated users are provisioned
from Clerk profile data; existing demo users remain unlinked. Linking an existing
user requires the explicit link-user command documented in AUTHENTICATION.md.
Real end-to-end Clerk login and provisioning remain blocked by missing keys.

## PostgreSQL and Prisma

PostgreSQL was already running on localhost:5432; server/.env incorrectly selected
5433. The existing username, password and projectmanagement database were valid.
The port was corrected without changing credentials or database provider.

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/projectmanagement?schema=public"
```

This illustrates the format only; the actual local credentials remain private.
Prisma uses DATABASE_URL and the shared client loads dotenv. Run server commands
from server/. The initial migration remains unchanged. Before applying the pending
Clerk migration, its destructive column drop was replaced with a nullable,
Prisma-ignored legacyAuthId rename. Historical values and all relationships survive;
old identifiers are no longer required by application authentication.

Prisma validate, generate, migrate status, and migration/schema comparison all pass.
Both migrations are applied locally. No reset or record deletion was performed.
Checksums confirm all existing rows survived migration and repeated seeding:
20 users, 5 teams, 12 projects, 42 tasks, 20 project-team links, 30 task assignments,
10 attachments and 25 comments.

## Seed

The old seed deleted existing data, relied on generated IDs for referenced users
and teams, and did not reliably propagate failure or repair sequences after explicit
IDs. User/team fixtures now have deterministic IDs. The seed validates IDs, inserts
parents before children in a transaction, and upserts missing records without
overwriting existing edits, Clerk mappings or extra records. User identity conflicts
fail explicitly. Serial sequences are advanced without moving backward.

The Prisma seed launcher now resolves ts-node through Node; the former bare ts-node
command could fail with ENOENT when Prisma was invoked outside npm's script PATH.

```sh
cd server
npm run seed
# Also verified:
npx prisma db seed
```

Actual local seeding completes successfully on repeat with identical row checksums.
A separate disposable PostgreSQL database verified initial seeding, repeatability,
preserved edits and Clerk/team/task relationships, generated IDs after seeding, and
failure on a conflicting user identity. Run that test only against an empty
disposable database:

```sh
SEED_TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/pm_seed_test" npm run test:seed
```

## Runtime and checks

- Frontend: starts on port 3000, but /sign-in and /settings return 500 because the
  publishable key is missing. No authenticated browser workflow can pass yet.
- Backend: TypeScript/build pass; startup intentionally stops with a missing
  CLERK_SECRET_KEY/CLERK_PUBLISHABLE_KEY error. No authentication bypass was added.
- Frontend TypeScript, lint and two tests pass. Backend TypeScript/build and eight
  authentication tests pass. Authentication tests use mocks, not live Clerk sessions.
- Prisma connects to the real local database; validation, generation, migration
  status, schema comparison and the real seed commands pass.
- The temporary frontend and isolated database test processes were stopped after
  verification. The existing local PostgreSQL service remains running.

Once keys are saved, start both applications with npm run dev in their respective
directories, then verify sign-up, sign-in, protected redirects, /users/me, task author
mapping, account switching and sign-out. Those live checks are still outstanding.

## Files changed in this stage

- client/.env.local: added nonsecret local Clerk routes and redirects (ignored file).
- server/.env: corrected PostgreSQL port and configured local CORS (ignored file).
- server/src/index.ts: removed duplicate dotenv loading; aligned fallback port/log.
- server/prisma/schema.prisma: retained historical identity in an ignored optional field.
- server/prisma/migrations/20260908000000_clerk_identity/migration.sql: preserved historical values before applying the pending migration.
- server/prisma/seed.ts: implemented transactional, repeatable seed and sequence repair.
- server/prisma/seedData/user.json: added deterministic user IDs.
- server/prisma/seedData/team.json: added deterministic team IDs.
- server/package.json: fixed Prisma seed launcher and added integration-test command.
- server/tests/seed.integration.cjs: added disposable-database seed verification.
- AUTHENTICATION.md: corrected migration/seed guidance and linked current results.
- DATABASE.md: documented restored connection, migration safety and reliable seeds.
- MIGRATION_REVIEW.md: marked earlier review results as historical.
- LOCAL_SETUP.md: recorded current configuration, verification and remaining blocker.

Existing changes from earlier migration work are not attributed to this stage.
