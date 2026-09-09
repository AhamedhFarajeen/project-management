# Direct Express API configuration

All application API calls use `client/src/state/api.ts` (RTK Query). Components use
its generated hooks; there are no separate component-level fetch/Axios calls or
API Gateway URLs. Axios remains installed, but is not used by application source.
Existing endpoint paths and Clerk bearer-token handling are unchanged.

## Local values

In `client/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

In `server/.env`:

```dotenv
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

Keep the existing DATABASE_URL and Clerk environment variables. Those remain
required for database access and authentication. No real environment files were
modified by this update. The existing local API URL already points at port 8000.

The central frontend module `src/lib/apiConfig.ts` validates the public URL,
requires absolute HTTP(S), rejects credentials/query/fragment values, and
normalizes trailing slashes while preserving optional backend path prefixes.
Missing configuration fails clearly instead of accidentally sending API requests
to Next.js. This URL is public; never put secrets in it. Next.js embeds public
environment variables at build time: restart next dev after editing .env.local,
and rebuild a production frontend after changing the backend URL.

## Configurable CORS and future hosting

CORS_ORIGINS accepts comma-separated exact origins. For example, later use:

```dotenv
CORS_ORIGINS=http://localhost:3000,https://YOUR-APP.vercel.app
```

Use the actual frontend origins, not the Express URL. Origin entries include scheme
and port (if non-default), but no path, query or fragment. Trailing root slashes are
normalized and duplicates removed. Wildcards are not accepted. Add explicitly
approved preview origins as needed; do not grant access to every vercel.app site.

Priority: CORS_ORIGINS, then legacy FRONTEND_URL, then a development-only default of
http://localhost:3000. Production requires one of these environment settings;
there is no implicit localhost production fallback. An explicitly empty setting
is an error. CORS and Clerk authorizedParties both use the resolved origin list.

Express handles CORS preflight before authentication. Content-Type and
Authorization are allowed. Cross-origin API requests use bearer tokens, not shared
cookies, so credentials: include is not required. Requests without an Origin header
(e.g. CLI clients) still require authentication on application API routes. CORS is
a browser control, not a replacement for Clerk token verification.

Later, set NEXT_PUBLIC_API_BASE_URL to the actual Express backend URL and add the
actual Vercel frontend origin to the backend's CORS_ORIGINS. No Render/Vercel
resources, deployment settings, or live connections were created here.

## Request flow

Browser component → RTK Query → validated NEXT_PUBLIC_API_BASE_URL + existing path
→ Express CORS → Clerk token verification → database user mapping → existing REST
controller → Prisma/PostgreSQL.

Examples: /projects, /tasks?projectId=1, /tasks/user/17, /tasks/1/status,
/users/me, /users, /teams, /search?query=example. The root Express response remains
public. All application API routes retain authentication.

## Remaining literal URLs

- One intentional development fallback: http://localhost:3000 in the backend CORS
  configuration module. It is used only when neither origin setting exists and
  NODE_ENV is not production.
- Local addresses in .env files, examples and documentation are configuration, not
  scattered component API URLs. Existing unused client/.env DATABASE_URL is unrelated.
- Tests use example.test / example / vercel.app fixture URLs; they do not contact
  those services.
- Next Image allows img.clerk.com for Clerk avatars; this is not the API backend.
- Existing next/font/google font downloads are unrelated to REST API requests.
- No AWS API Gateway URL is present in application source/configuration.

## Files changed in this update

- client/src/lib/apiConfig.ts (new)
- client/src/state/api.ts
- client/.env.example
- client/tests/api-auth.test.mjs
- server/src/config/cors.ts (new)
- server/src/index.ts
- server/.env.example
- server/tests/cors.test.cjs (new)
- AUTHENTICATION.md (origin configuration clarification)
- API_CONFIGURATION.md (new)
