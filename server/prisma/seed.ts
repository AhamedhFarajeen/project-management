import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import fs from "node:fs";
import path from "node:path";

type Row = Record<string, unknown>;
type Delegate = {
  findUnique(args: { where: Row }): Promise<Row | null>;
  upsert(args: { where: Row; create: Row; update: Row }): Promise<unknown>;
};
const models = [
  ["team", "Team", "id"],
  ["user", "User", "userId"],
  ["project", "Project", "id"],
  ["projectTeam", "ProjectTeam", "id"],
  ["task", "Task", "id"],
  ["attachment", "Attachment", "id"],
  ["comment", "Comment", "id"],
  ["taskAssignment", "TaskAssignment", "id"],
] as const;

export async function seed() {
  const fixtures = new Map<string, Row[]>();
  for (const [model, , key] of models) {
    const rows: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "seedData", `${model}.json`), "utf8"));
    const ids = rows.map(row => row[key]);
    if (ids.some(id => !Number.isSafeInteger(id) || Number(id) <= 0) || new Set(ids).size !== ids.length) {
      throw new Error(`Invalid or duplicate fixture identifiers in ${model}`);
    }
    fixtures.set(model, rows);
  }
  await prisma.$transaction(async tx => {
    // Serialize seed runs, then prevent concurrent writes while repairing sequences.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(731902)`;
    await tx.$executeRawUnsafe(`LOCK TABLE ${models.map(([, table]) => `"${table}"`).join(", ")} IN SHARE ROW EXCLUSIVE MODE`);
    for (const [model, , key] of models) {
      const delegate = tx[model] as unknown as Delegate;
      for (const row of fixtures.get(model)!) {
        // Never attach fixture tasks to a different person occupying the same ID.
        if (model === "user") {
          const existing = await delegate.findUnique({ where: { [key]: row[key] } });
          if (existing && existing.username !== row.username) {
            throw new Error(`Seed user ID ${row[key]} belongs to a different username; no records changed`);
          }
        }
        await delegate.upsert({ where: { [key]: row[key] }, create: row, update: {} });
      }
    }
    // PostgreSQL does not advance SERIAL sequences for explicit fixture IDs.
    // Keep sequence values monotonic, including IDs allocated before deleted rows.
    for (const [, table, key] of models) {
      const [info] = await tx.$queryRaw<Array<{ name: string }>>`SELECT pg_get_serial_sequence(${`"${table}"`}, ${key}) AS name`;
      const quotedSequence = info.name.split(".").map(part => `"${part.replace(/^"|"$/g, "").replace(/"/g, '""')}"`).join(".");
      const [current] = await tx.$queryRawUnsafe<Array<{ value: bigint }>>(`SELECT last_value AS value FROM ${quotedSequence}`);
      await tx.$queryRawUnsafe(`SELECT setval($1::regclass, GREATEST((SELECT COALESCE(MAX("${key}"), 1) FROM "${table}"), $2::bigint), true)`, info.name, current.value);
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
  console.log("Seed completed: missing fixtures inserted, existing records preserved, sequences synchronized.");
}

if (require.main === module) {
  seed().catch(error => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }).finally(() => prisma.$disconnect());
}
