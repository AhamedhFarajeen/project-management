# Project Management

A project and task management workspace built with Next.js, Express, Prisma,
PostgreSQL, and Clerk authentication.

## What it does

- Sign up, sign in, sign out, and manage your profile with Clerk.
- View projects in board, table, list, priority, and timeline views.
- Create tasks with priority, dates, labels, descriptions, and multiple assignees.
- Search users, projects, and tasks.
- View teams, users, comments, attachments, and task progress.
- Track personal tasks from the dashboard and priority pages.

The current workspace is shared: authenticated users can read projects, tasks,
users, teams, and search results. Team- and role-based isolation is planned for a
later stage.

## Project structure

```text
client/   Next.js frontend (localhost:3000)
server/   Express API (localhost:8000)
```

The frontend uses RTK Query to call the Express API. Clerk tokens are sent as
bearer tokens on API requests. The API uses Prisma to access PostgreSQL.

## Local setup

### 1. Configure the frontend

```sh
cd client
cp .env.example .env.local
```

Set these values in `client/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key>
CLERK_SECRET_KEY=<your Clerk secret key>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### 2. Configure the backend

```sh
cd server
cp .env.example .env
```

Set your PostgreSQL connection and matching Clerk keys in `server/.env`:

```dotenv
PORT=8000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/projectmanagement?schema=public"
CORS_ORIGINS=http://localhost:3000
CLERK_PUBLISHABLE_KEY=<same Clerk publishable key>
CLERK_SECRET_KEY=<same Clerk secret key>
```

Never commit `.env` files, database credentials, or secret keys. Restart both
development servers after changing environment variables.

### 3. Install, migrate, and seed

```sh
cd server
npm install
npx prisma migrate deploy
npx prisma generate
npm run seed
```

### 4. Run the applications

In one terminal:

```sh
cd server
npm run dev
```

In another terminal:

```sh
cd client
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful checks

```sh
# frontend
cd client
npm test
npm run lint
npx tsc --noEmit --incremental false

# backend
cd server
npm test
npx prisma validate
npx tsc --noEmit
npm run build
```

## Authentication and data access

Clerk protects application pages and API routes. The API maps the verified Clerk
identity to a local `User` record and uses that server-side identity as the task
author. Existing users can be linked to a Clerk account with:

```sh
cd server
npm run link-user -- <local-user-id> <clerk-user-id>
```

Use a real Clerk development instance and the same keys in both applications.
The database migration preserves historical user relationships and task data.

## Database model

The main records are `User`, `Team`, `Project`, `ProjectTeam`, `Task`,
`TaskAssignment`, `Attachment`, and `Comment`. A task can have one legacy
assignee plus multiple `TaskAssignment` records; the task creation form supports
searching for and selecting several users.

## Notes

- The backend must run on port 8000 when using the default frontend configuration.
- The frontend must run on port 3000 unless `NEXT_PUBLIC_API_BASE_URL` and CORS
  settings are changed together.
- Real Clerk keys are required for live sign-in and sign-up flows.
