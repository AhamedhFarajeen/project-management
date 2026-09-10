const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma } = require('../dist/src/lib/prisma');
const { updateUserTeam } = require('../dist/src/controllers/userController');
const { getProjectMemberCandidates } = require('../dist/src/controllers/projectController');

const response = () => ({ locals: {}, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('only admins can assign users to teams', async () => {
  const original = { findUnique: prisma.user.findUnique, update: prisma.user.update };
  try {
    const res = response(); res.locals.appUser = { role: 'MEMBER' };
    await updateUserTeam({ params: { userId: '4' }, body: { teamId: 1 } }, res);
    assert.equal(res.statusCode, 403);
  } finally { prisma.user.findUnique = original.findUnique; prisma.user.update = original.update; }
});

test('project candidates use associated team users and exclude current members', async () => {
  const originals = { project: prisma.project.findUnique, user: prisma.user.findMany };
  try {
    let userArgs;
    prisma.project.findUnique = async () => ({ projectManagerUserId: 1, projectTeams: [{ teamId: 1 }], members: [{ userId: 1 }, { userId: 2 }] });
    prisma.user.findMany = async (args) => { userArgs = args; return []; };
    const res = response(); res.locals.appUser = { userId: 1, role: 'PROJECT_MANAGER' };
    await getProjectMemberCandidates({ params: { id: '1' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(userArgs.where.teamId, { in: [1] });
    assert.deepEqual(userArgs.where.userId, { notIn: [1, 2] });
  } finally { prisma.project.findUnique = originals.project; prisma.user.findMany = originals.user; }
});
