const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma } = require('../dist/src/lib/prisma');
const { getUsers } = require('../dist/src/controllers/userController');
const { getTeams } = require('../dist/src/controllers/teamController');
const { search } = require('../dist/src/controllers/searchController');

function response() { return { locals: {}, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }

test('user visibility returns safe public fields and scopes non-admin queries', async () => {
  const original = prisma.user.findMany;
  try {
    let args;
    prisma.user.findMany = async value => { args = value; return [{ userId: 1, username: 'Nimal', profilePictureUrl: null, role: 'PROJECT_MANAGER' }]; };
    const adminRes = response(); adminRes.locals.appUser = { userId: 9, role: 'ADMIN' }; await getUsers({}, adminRes);
    assert.deepEqual(adminRes.body, [{ userId: 1, username: 'Nimal', profilePictureUrl: null, role: 'PROJECT_MANAGER' }]);
    assert.equal('clerkUserId' in adminRes.body[0], false);
    const memberRes = response(); memberRes.locals.appUser = { userId: 9, role: 'MEMBER' }; await getUsers({}, memberRes);
    assert.ok(args.where.OR[0].projectMemberships.some.project);
  } finally { prisma.user.findMany = original; }
});

test('team visibility scopes non-admin users to own or project-relevant teams', async () => {
  const original = prisma.team.findMany;
  try {
    let args;
    prisma.team.findMany = async value => { args = value; return [{ id: 1, teamName: 'Engineering' }]; };
    const res = response(); res.locals.appUser = { userId: 2, role: 'MEMBER', teamId: 1 }; await getTeams({}, res);
    assert.deepEqual(res.body, [{ id: 1, teamName: 'Engineering', productOwnerUsername: undefined, projectManagerUsername: undefined }]);
    assert.equal(args.where.OR[0].id, 1);
  } finally { prisma.team.findMany = original; }
});

test('search applies project, user, and team visibility filters', async () => {
  const originals = { task: prisma.task.findMany, project: prisma.project.findMany, user: prisma.user.findMany, team: prisma.team.findMany };
  try {
    let taskArgs, projectArgs, userArgs, teamArgs;
    prisma.task.findMany = async value => { taskArgs = value; return []; };
    prisma.project.findMany = async value => { projectArgs = value; return []; };
    prisma.user.findMany = async value => { userArgs = value; return []; };
    prisma.team.findMany = async value => { teamArgs = value; return []; };
    const res = response(); res.locals.appUser = { userId: 3, role: 'MEMBER', teamId: 2 }; await search({ query: { query: 'secure' } }, res);
    assert.deepEqual(res.body, { tasks: [], projects: [], users: [], teams: [] });
    assert.ok(taskArgs.where.project.members.some.userId === 3);
    assert.equal(projectArgs.where.AND[0].members.some.userId, 3);
    assert.equal(userArgs.where.AND[0].OR[0].projectMemberships.some.project.members.some.userId, 3);
    assert.equal(teamArgs.where.OR[0].id, 2);
  } finally { prisma.task.findMany = originals.task; prisma.project.findMany = originals.project; prisma.user.findMany = originals.user; prisma.team.findMany = originals.team; }
});
