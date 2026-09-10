const test = require('node:test');
const assert = require('node:assert/strict');
const {
  UserRole,
} = require('@prisma/client');
const auth = require('../dist/src/services/authorization.js');

const admin = { userId: 1, role: UserRole.ADMIN, teamId: 1 };
const manager = { userId: 2, role: UserRole.PROJECT_MANAGER, teamId: 1 };
const member = { userId: 3, role: UserRole.MEMBER, teamId: 1 };
const otherMember = { userId: 4, role: UserRole.MEMBER, teamId: 1 };
const project = { id: 10, projectManagerUserId: manager.userId, memberUserIds: [manager.userId, member.userId] };
const managedTask = { projectId: project.id, projectManagerUserId: manager.userId, authorUserId: otherMember.userId, assignedUserId: null, assignedUserIds: [] };

test('project permissions distinguish admin, manager, member, and same-team non-member', () => {
  assert.equal(auth.canViewProject(admin, project), true);
  assert.equal(auth.canManageProject(admin, project), true);
  assert.equal(auth.canViewProject(manager, project), true);
  assert.equal(auth.canManageProject(manager, project), true);
  assert.equal(auth.canViewProject(member, project), true);
  assert.equal(auth.canManageProject(member, project), false);
  assert.equal(auth.canViewProject(otherMember, project), false);
  assert.equal(auth.canManageProject(otherMember, project), false);
});

test('project manager who is only a member cannot manage another project', () => {
  const memberOnlyProject = { id: 11, projectManagerUserId: 99, memberUserIds: [manager.userId] };
  assert.equal(auth.canViewProject(manager, memberOnlyProject), true);
  assert.equal(auth.canManageProject(manager, memberOnlyProject), false);
  assert.equal(auth.canManageProjectMembers(manager, memberOnlyProject), false);
});

test('project creation is limited to admin and project manager roles', () => {
  assert.equal(auth.canCreateProject(admin), true);
  assert.equal(auth.canCreateProject(manager), true);
  assert.equal(auth.canCreateProject(member), false);
});

test('task permissions apply project access and author/assignee rules', () => {
  const authored = { ...managedTask, authorUserId: member.userId };
  const assigned = { ...managedTask, assignedUserId: member.userId, assignedUserIds: [member.userId] };
  const unrelated = { ...managedTask };
  assert.equal(auth.canViewTask(admin, unrelated, true), true);
  assert.equal(auth.canEditTask(admin, unrelated, true), true);
  assert.equal(auth.canDeleteTask(admin, unrelated, true), true);
  assert.equal(auth.canAssignTask(manager, managedTask, true), true);
  assert.equal(auth.canEditTask(manager, managedTask, true), true);
  assert.equal(auth.canEditTask(member, authored, true), true);
  assert.equal(auth.canUpdateTaskStatus(member, authored, true), true);
  assert.equal(auth.canDeleteTask(member, authored, true), false);
  assert.equal(auth.canAssignTask(member, authored, true), false);
  assert.equal(auth.canEditTask(member, assigned, true), true);
  assert.equal(auth.canEditTask(member, unrelated, true), false);
  assert.equal(auth.canUpdateTaskStatus(member, unrelated, true), false);
  assert.equal(auth.canCreateTask(member, true), true);
  assert.equal(auth.canViewTask(member, unrelated, false), false);
});

test('task participant helper recognizes primary and multi-assignees', () => {
  assert.equal(auth.isTaskParticipant(member, { ...managedTask, assignedUserIds: [member.userId] }), true);
  assert.equal(auth.isTaskParticipant(member, { ...managedTask, assignedUserId: member.userId }), true);
  assert.equal(auth.isTaskParticipant(member, managedTask), false);
});
