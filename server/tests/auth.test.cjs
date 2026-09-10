const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { prisma } = require('../dist/src/lib/prisma');
const { createRequireAppUser } = require('../dist/src/middleware/auth');
let fetchProfile = () => { throw Error('Unexpected Clerk API call'); };
const requireAppUser = createRequireAppUser(id => fetchProfile(id));
const { createTask, getUserTasks } = require('../dist/src/controllers/taskController');
const originals = { findUnique: prisma.user.findUnique, count: prisma.user.count, upsert: prisma.user.upsert, createTask: prisma.task.create, projectFindUnique: prisma.project.findUnique };
afterEach(() => { prisma.user.findUnique = originals.findUnique; prisma.user.count = originals.count; prisma.user.upsert = originals.upsert; fetchProfile = () => { throw Error("Unexpected Clerk API call"); }; prisma.task.create = originals.createTask; prisma.project.findUnique = originals.projectFindUnique; });
function response() { return { locals: {}, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
function request(userId, path = '/projects') { return { path, auth: Object.assign(() => ({ userId, tokenType: 'session_token' }), { [Symbol.for('@clerk/express.auth')]: true }) }; }
test('signed-out requests never reach the database or route', async () => {
  prisma.user.findUnique = () => { throw Error('database must not be called'); };
  const res = response(); let next = false;
  await requireAppUser(request(null), res, () => { next = true; });
  assert.equal(res.statusCode, 401); assert.equal(next, false);
});
test('existing identity preserves integer user ID and team without provisioning', async () => {
  prisma.user.findUnique = async ({ where }) => { assert.equal(where.clerkUserId, 'user_test'); return { userId: 17, clerkUserId: 'user_test', teamId: 3 }; };
  fetchProfile = () => { throw Error('profile must not be fetched'); };
  const res = response(); let next = false;
  await requireAppUser(request('user_test'), res, () => { next = true; });
  assert.equal(next, true); assert.equal(res.locals.appUser.userId, 17); assert.equal(res.locals.appUser.teamId, 3);
});
test('first request provisions from verified Clerk identity, never claims a same-name seed user', async () => {
  prisma.user.findUnique = async ({ where }) => where.username ? { userId: 1, clerkUserId: null } : null;
  fetchProfile = async id => { assert.equal(id, 'user_new'); return { username: 'johndoe', primaryEmailAddressId: 'mail1', emailAddresses: [{id: 'mail1', emailAddress: 'member@example.com'}], imageUrl: 'https://img.clerk.com/avatar' }; };
  prisma.user.upsert = async args => { assert.equal(args.where.clerkUserId, 'user_new'); assert.match(args.create.username, /^member_/); assert.equal(args.create.email, 'member@example.com'); assert.equal(args.create.teamId, undefined); assert.equal(args.update.teamId, undefined); return { ...args.create, userId: 21 }; };
  const res = response(); await requireAppUser(request('user_new'), res, () => {});
  assert.equal(res.locals.appUser.userId, 21);
});
test('profile refresh does not overwrite team or local username', async () => {
  prisma.user.findUnique = async () => ({ userId: 17, clerkUserId: 'user_test', teamId: 3 });
  fetchProfile = async () => ({ emailAddresses: [], imageUrl: 'https://img.clerk.com/new' });
  prisma.user.upsert = async args => { assert.deepEqual(Object.keys(args.update).sort(), ['email', 'profilePictureUrl']); return { userId: 17, teamId: 3 }; };
  const res = response(); await requireAppUser(request('user_test', '/users/me'), res, () => {});
  assert.equal(res.locals.appUser.teamId, 3);
});
test('matching INITIAL_ADMIN_EMAIL promotes the persisted Clerk user', async () => {
  const previous = process.env.INITIAL_ADMIN_EMAIL;
  try {
    process.env.INITIAL_ADMIN_EMAIL = ' Admin@Example.com ';
    prisma.user.findUnique = async () => ({ userId: 17, clerkUserId: 'user_admin', role: 'MEMBER', teamId: null });
    fetchProfile = async () => ({ username: 'admin', primaryEmailAddressId: 'mail1', emailAddresses: [{ id: 'mail1', emailAddress: 'admin@example.com' }], imageUrl: null });
    prisma.user.upsert = async args => { assert.equal(args.update.role, 'ADMIN'); return { userId: 17, role: 'ADMIN', teamId: null }; };
    const res = response(); await requireAppUser(request('user_admin', '/users/me'), res, () => {});
    assert.equal(res.locals.appUser.role, 'ADMIN');
  } finally { if (previous === undefined) delete process.env.INITIAL_ADMIN_EMAIL; else process.env.INITIAL_ADMIN_EMAIL = previous; }
});
test('nonmatching bootstrap email preserves an existing role', async () => {
  const previous = process.env.INITIAL_ADMIN_EMAIL;
  try {
    process.env.INITIAL_ADMIN_EMAIL = 'admin@example.com';
    prisma.user.findUnique = async () => ({ userId: 17, clerkUserId: 'user_manager', role: 'PROJECT_MANAGER', teamId: null });
    fetchProfile = async () => ({ primaryEmailAddressId: 'mail1', emailAddresses: [{ id: 'mail1', emailAddress: 'manager@example.com' }], imageUrl: null });
    prisma.user.upsert = async args => { assert.equal(args.update.role, undefined); return { userId: 17, role: 'PROJECT_MANAGER', teamId: null }; };
    const res = response(); await requireAppUser(request('user_manager'), res, () => {});
    assert.equal(res.locals.appUser.role, 'PROJECT_MANAGER');
  } finally { if (previous === undefined) delete process.env.INITIAL_ADMIN_EMAIL; else process.env.INITIAL_ADMIN_EMAIL = previous; }
});
test('task creation ignores forged author ID in request body', async () => {
  prisma.project.findUnique = async () => ({ id: 1, projectManagerUserId: null, members: [] });
  prisma.user.count = async () => 2;
  prisma.task.create = async ({ data }) => {
    assert.equal(data.authorUserId, 17);
    assert.equal(data.assignedUserId, 3);
    assert.deepEqual(data.taskAssignments.create, [{ userId: 3 }, { userId: 7 }]);
    return data;
  };
  const res = response(); res.locals.appUser = { userId: 17, role: 'ADMIN' };
  await createTask({ body: { title: 'Example', projectId: 1, authorUserId: 999, assignedUserIds: [3, 7, 3] } }, res);
  assert.equal(res.statusCode, 201);
});
test('task creation accepts an explicitly added project member as assignee', async () => {
  prisma.project.findUnique = async () => ({ id: 1, projectManagerUserId: null, members: [{ userId: 14 }] });
  prisma.user.count = async ({ where }) => { assert.deepEqual(where.userId.in, [14]); assert.equal(where.projectMemberships.some.projectId, 1); return 1; };
  prisma.task.create = async ({ data }) => data;
  const res = response(); res.locals.appUser = { userId: 7, role: 'ADMIN' };
  await createTask({ body: { title: 'Member task', projectId: 1, startDate: '2026-01-01', dueDate: '2026-01-02', assignedUserIds: [14] } }, res);
  assert.equal(res.statusCode, 201);
});
test('personal task endpoint rejects another user ID', async () => {
  const res = response(); res.locals.appUser = { userId: 17 };
  await getUserTasks({ params: { userId: '999' } }, res);
  assert.equal(res.statusCode, 403);
});
