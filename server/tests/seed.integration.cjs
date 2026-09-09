// Run only against a disposable database whose name begins pm_seed_test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const url = process.env.SEED_TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.startsWith('/pm_seed_test')) throw Error('Set SEED_TEST_DATABASE_URL to a disposable pm_seed_test database');
const prisma = new PrismaClient({ datasources: { db: { url } } });
function command(args, expected = 0) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8' });
  assert.equal(result.status, expected, result.stdout + result.stderr);
}
const seed = (expected = 0) => command(['node_modules/ts-node/dist/bin.js', 'prisma/seed.ts'], expected);

test('actual seed is repeatable, preserves edits/Clerk links, advances sequences and fails atomically on identity conflicts', async () => {
  try {
    command(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
    assert.equal(await prisma.user.count(), 0, 'Use an empty disposable database');
    seed();
    assert.equal(await prisma.user.count(), 20);
    assert.equal(await prisma.task.count(), 40);
    const original = await prisma.user.findUniqueOrThrow({ where: { userId: 1 } });
    await prisma.user.update({ where: { userId: 1 }, data: { clerkUserId: 'user_seed_test', email: 'seed@example.test' } });
    await prisma.task.update({ where: { id: 1 }, data: { title: 'Keep this edit', status: 'Completed' } });
    const user = await prisma.user.create({ data: { username: 'new-auth-user', clerkUserId: 'user_new_seed_test' } });
    assert.ok(user.userId > 20);
    const project = await prisma.project.create({ data: { name: 'New project after seed' } });
    assert.ok(project.id > 10);
    const task = await prisma.task.create({ data: { title: 'New task after seed', projectId: project.id, authorUserId: user.userId } });
    assert.ok(task.id > 40);
    seed();
    assert.equal(await prisma.user.count(), 21);
    assert.equal(await prisma.project.count(), 11);
    assert.equal(await prisma.task.count(), 41);
    assert.equal((await prisma.task.findUnique({ where: { id: 1 } })).title, 'Keep this edit');
    assert.equal((await prisma.user.findUnique({ where: { clerkUserId: 'user_seed_test' } })).teamId, original.teamId);
    assert.equal((await prisma.task.findUnique({ where: { id: task.id }, include: { author: true, project: true } })).author.clerkUserId, 'user_new_seed_test');
    await prisma.user.update({ where: { userId: 1 }, data: { username: 'conflicting-person' } });
    seed(1);
    assert.equal(await prisma.task.count(), 41);
    assert.equal((await prisma.user.findUnique({ where: { userId: 1 } })).username, 'conflicting-person');
  } finally { await prisma.$disconnect(); }
});
