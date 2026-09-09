> Updated local setup and seed results: see [LOCAL_SETUP.md](LOCAL_SETUP.md).

# Clerk authentication setup

The app uses Clerk Next.js v6 (compatible with Next.js 14) and Clerk Express.
Next.js was updated within 14.x to satisfy the Clerk SDK's peer requirements.
No infrastructure has been deployed. The local database migrations are now applied; see LOCAL_SETUP.md.

## Local configuration

Create a Clerk application and use its **development** instance. Enable email
sign-up/sign-in (and any social providers you want). Username collection is
optional; otherwise the application generates a stable local username.
Keep the default session token; no custom JWT template or webhook is needed.
Use the same instance's publishable and secret keys in both applications.

Merge `client/.env.example` into `client/.env.local` and `server/.env.example`
into `server/.env`. Keep the existing real DATABASE_URL. Do not overwrite local
files wholesale, and never put a secret key or database URL in a NEXT_PUBLIC variable.

Client variables:

- NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (Clerk publishable key)
- CLERK_SECRET_KEY (server-side Next.js middleware only)
- NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
- NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
- NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
- NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

Server variables:

- PORT=8000
- DATABASE_URL (existing PostgreSQL connection)
- FRONTEND_URL=http://localhost:3000 (exact origin, no trailing slash)
- CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY

Use localhost:3000 for the frontend. If the port/origin changes, set CORS_ORIGINS
to the allowed origins (comma-separated). CORS_ORIGINS takes precedence over the
legacy FRONTEND_URL setting; both CORS and Clerk use the same list. See
API_CONFIGURATION.md for local and future Vercel examples.
In Clerk Dashboard, use the local sign-in and sign-up paths above wherever custom
application paths are configured. If restricting redirect origins, allow
http://localhost:3000. Configure social provider credentials only if enabling them.
Restart both applications after editing environment variables; rebuild Next.js
after changing public variables. `img.clerk.com` is allowed for avatar images.

## Database migration and existing users

Back up the database before applying the prepared forward migration:

```sh
cd server
npx prisma migrate deploy
npx prisma generate
```

This is a local database migration command, not application deployment. It adds
unique nullable `User.clerkUserId` and optional `email`, then renames the obsolete
identity column to optional, Prisma-ignored `legacyAuthId`, preserving its values. The initial SQL migration remains unchanged to preserve migration
checksums; the new migration necessarily names the old column when renaming it.
There is no legacy authentication code or SDK. Historical identity values remain
only in the ignored database field, not in seed data or authentication logic.

`User.userId` remains the integer primary key. Every existing task, assignment,
comment, attachment, user/team relationship and project/team relationship remains
unchanged. Nullable Clerk IDs are intentional: historical/demo users have no Clerk
accounts, and must not be given invented identities. New authenticated users always
receive the real, unique Clerk ID. A future cleanup can make this required after
all retained users are explicitly linked.

The seed now inserts missing fixtures without deleting or overwriting existing
records and synchronizes sequences. Run `npm run seed` from server/. Identity
collisions stop the seed rather than claiming a different user. Seeding does not
link real Clerk accounts; use the explicit linking command below.

To associate an existing application's user with a real Clerk account, create the
account in Clerk Dashboard first, copy its `user_...` ID, then run **before that
account first opens the app**:

```sh
cd server
npm run link-user -- 1 user_REPLACE_WITH_REAL_ID
```

The command verifies that the Clerk account exists in this Clerk instance and links
only an unlinked database user. It refuses already-linked Clerk accounts and never
merges or deletes users. Linking preserves the chosen user's integer ID, tasks,
team and other relationships. If an account has already auto-provisioned a new
row, reconcile it explicitly before attempting linkage; do not delete rows blindly.
No automatic username/email matching is performed.

## Request flow and access policy

1. Frontend middleware protects all application pages except sign-in/sign-up and
   static assets. Clerk supplies the sign-up/sign-in UI and account/sign-out menu.
2. The dashboard waits for a loaded, signed-in session. It mounts a separate Redux
   store per Clerk session, preventing cached API data from crossing accounts.
3. RTK Query calls Clerk getToken for each request and sends the current bearer
   token directly to Express. Tokens are not persisted by Redux.
4. Express Clerk middleware verifies the session and allowed frontend origin.
   Application routes require a verified identity. `/` remains a public health-like
   response; CORS preflight does not require authentication.
5. A verified Clerk ID resolves the local User. A first request provisions it from
   trusted Clerk profile data. `/users/me` refreshes email/avatar while preserving
   local username/team. Concurrent provisioning uses unique-ID upserts and retries
   a uniqueness conflict. New users have no automatic team assignment.
6. Task creation gets its author from the mapped server-side user, not request data.
   Dashboard and priority pages use that user's tasks. Other users' personal-task
   URLs return 403. Settings uses Clerk UserProfile and the database team.

The existing shared-workspace policy remains: every authenticated member can view
projects, tasks, users, teams and search, and create projects/tasks or update task
status. Authentication is enforced; tenant isolation and team/role authorization
are not introduced by this change. Use Clerk's restricted sign-up/invitation mode
if membership should be limited. Clerk controls session validity and expiry; database history is retained after
account deletion. Profile synchronization happens
on a new session/page reload via /users/me; no background webhook synchronization.

## Checks

```sh
cd client
npm test
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

```sh
cd server
npm test
npx prisma validate
npx tsc --noEmit
npm run build
```

Backend tests use mock database/profile services at the verified-identity boundary.
Frontend tests verify RTK Query bearer-token refresh and store separation. These do
not replace a real Clerk end-to-end check. There is no existing backend ESLint setup.
A real frontend build requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. The implementation
was also smoke-built with a nonfunctional example key supplied only to the build
process. That build artifact must be rebuilt with your real key before use.

After configuring keys and applying the migration, verify sign-up, sign-in,
sign-out, direct protected URL redirects, rejected missing/invalid API tokens,
/users/me identity, task authorship, existing-user linkage and account switching.
Live Clerk login remains unverified until real keys are configured. Local database
migrations and repeated seeding have now been verified (see LOCAL_SETUP.md).

## Historical implementation verification results

The current local verification results are recorded in LOCAL_SETUP.md.

- Frontend and backend TypeScript checks passed.
- Frontend ESLint passed.
- Prisma schema validation and client generation passed.
- Six backend identity/authorship tests and one frontend token/cache test passed.
- Backend production compilation passed.
- Frontend production smoke build passed with an example publishable key supplied
  only to that process. The normal build is blocked until real Clerk keys are set.
- `git diff --check` passed.
- npm audit still reports high-severity Next.js/PostCSS advisories on the retained
  Next.js 14 line. npm recommends a major Next.js upgrade, left outside this change.

## Files changed in the Clerk implementation

Existing unrelated timeline and Finder metadata changes were left untouched.

- `AUTHENTICATION.md`
- `client/.env.example`
- `client/.gitignore`
- `client/next.config.mjs`
- `client/package-lock.json`
- `client/package.json`
- `client/src/app/dashboardWrapper.tsx`
- `client/src/app/home/page.tsx`
- `client/src/app/layout.tsx`
- `client/src/app/priority/reusablePriorityPage/index.tsx`
- `client/src/app/projects/BoardView/index.tsx`
- `client/src/app/redux.tsx`
- `client/src/app/settings/page.tsx`
- `client/src/app/sign-in/[[...sign-in]]/page.tsx`
- `client/src/app/sign-up/[[...sign-up]]/page.tsx`
- `client/src/app/users/page.tsx`
- `client/src/components/Header/index.tsx`
- `client/src/components/ModalNewTask/index.tsx`
- `client/src/components/Navbar/index.tsx`
- `client/src/components/Sidebar/index.tsx`
- `client/src/components/UserCard/index.tsx`
- `client/src/lib/profileImage.ts`
- `client/src/middleware.ts`
- `client/src/state/api.ts`
- `client/src/state/index.ts`
- `client/tests/api-auth.test.mjs`
- `server/.env.example`
- `server/.gitignore`
- `server/package-lock.json`
- `server/package.json`
- `server/prisma.config.ts` (removed: incompatible Prisma 5 configuration)
- `server/prisma/migrations/20260908000000_clerk_identity/migration.sql`
- `server/prisma/schema.prisma`
- `server/prisma/seedData/user.json`
- `server/scripts/link-clerk-user.ts`
- `server/src/Routes/userRoutes.ts`
- `server/src/controllers/projectController.ts`
- `server/src/controllers/searchController.ts`
- `server/src/controllers/taskController.ts`
- `server/src/controllers/teamController.ts`
- `server/src/controllers/userController.ts`
- `server/src/index.ts`
- `server/src/lib/prisma.ts`
- `server/src/middleware/auth.ts`
- `server/tests/auth.test.cjs`
- `server/tsconfig.json`
