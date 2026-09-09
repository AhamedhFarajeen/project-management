# Local PostgreSQL / Prisma configuration

Prisma CLI and Client remain at 5.18.0. The provider remains postgresql and all
runtime connections use DATABASE_URL. No package upgrades, database resets,
migration deletion, hosted-database switch, or deployment was performed.

## Restored connection

PostgreSQL was already listening at localhost:5432. The backend incorrectly pointed
to localhost:5433. Existing database credentials and the projectmanagement database
were valid. Only the port in server/.env was corrected:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/projectmanagement?schema=public"
```

Actual credentials were preserved and are not included in this document. The unused
client/.env database variable is not consumed by application code. The shared Prisma
client loads server/.env via dotenv; run backend commands from server/. External
environment variables take precedence. No host or credentials are hard-coded in
runtime database code.

## Migration safety

The initial migration was already applied and is unchanged. The then-unapplied
Clerk migration was adjusted before applying it: instead of dropping old identity
values, it renames their column to legacyAuthId, makes it nullable, and renames the
unique index. The Prisma field is @ignore, so application Prisma Client cannot read
or write it. Old identifiers are not required to create or authenticate users.
clerkUserId remains the real optional unique account mapping. Integer User IDs and
all foreign-key relationships remain intact.

Both migrations are now applied to the local database. Validation, generation and
migration status pass. A shadow-database comparison verifies schema/history parity.
Existing table counts/checksums were unchanged after migration and repeated seeding.

## Reliable seeds

```sh
cd server
npm run seed
# Equivalent registered Prisma command:
npx prisma db seed
```

The script validates deterministic fixture IDs, creates parents before children,
and uses insert-only upserts (update: {}). It does not delete records or overwrite
user edits, real Clerk links, email, team membership, task status, or extra records.
It stops on user ID/username conflicts rather than linking fixtures to another
person. Unique-constraint or foreign-key failures roll back data changes and exit
nonzero. Useful fixtures are retained in full.

A transaction, seed advisory lock and table write locks coordinate inserts and
sequence repair. SERIAL sequences advance to at least MAX(id) and never regress.
PostgreSQL sequence changes themselves are nontransactional; a failed run can leave
harmless gaps, but does not discard existing rows. Run seeds during local development,
not during active application writes. Concurrent serializable conflicts can require
a retry. Re-running fixtures intentionally does not propagate fixture edits into
existing rows.

The seed passed twice on the existing database without changing any existing row.
An isolated integration test also verifies a fresh database, repeatability, preserved
edits/Clerk links, inserts after seeding, and a failing identity collision.

```sh
# Use ONLY an empty disposable database whose name starts with pm_seed_test:
SEED_TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/pm_seed_test" npm run test:seed
```

## Other local commands

```sh
npx prisma validate
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate dev --name descriptive_change --skip-seed
npm test
npm run build
```

migrate deploy applies existing SQL migrations to the configured database, not an
application deployment. Do not reset your database to fix configuration issues.
For development migrations, the PostgreSQL role needs shadow-database privileges.

A future Neon connection would replace DATABASE_URL in server/.env, preserving its
TLS parameters. Copying existing data is a separate task; none of that work was done
in this stage. See LOCAL_SETUP.md for remaining Clerk setup.
