import { prisma } from "../lib/prisma";
import { UserRole } from "@prisma/client";

export type AuthorizationUser = {
  userId: number;
  role: UserRole;
  teamId?: number | null;
};

export type ProjectAuthorizationContext = {
  id: number;
  projectManagerUserId?: number | null;
  memberUserIds?: readonly number[];
};

export type TaskAuthorizationContext = {
  projectId: number;
  projectManagerUserId?: number | null;
  authorUserId: number;
  assignedUserId?: number | null;
  assignedUserIds?: readonly number[];
};

export const isAdmin = (user: AuthorizationUser) => user.role === UserRole.ADMIN;

export const isProjectManager = (user: AuthorizationUser) => user.role === UserRole.PROJECT_MANAGER;

export const isManagerOfProject = (user: AuthorizationUser, project: ProjectAuthorizationContext) =>
  isProjectManager(user) && project.projectManagerUserId === user.userId;

export const isProjectMember = async (userId: number, projectId: number): Promise<boolean> => {
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { userId: true },
  });
  return Boolean(membership);
};

export const getProjectAuthorizationContext = async (projectId: number): Promise<ProjectAuthorizationContext | null> => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, projectManagerUserId: true, members: { select: { userId: true } } },
  });
  return project ? { ...project, memberUserIds: project.members.map(({ userId }) => userId) } : null;
};

export const projectAccessWhere = (user: AuthorizationUser) =>
  isAdmin(user)
    ? {}
    : isProjectManager(user)
      ? { OR: [{ projectManagerUserId: user.userId }, { members: { some: { userId: user.userId } } }] }
      : { members: { some: { userId: user.userId } } };

export const canViewProject = (
  user: AuthorizationUser,
  project: ProjectAuthorizationContext,
  member = project.memberUserIds?.includes(user.userId) ?? false,
) => isAdmin(user) || project.projectManagerUserId === user.userId || member;

export const canManageProject = (user: AuthorizationUser, project: ProjectAuthorizationContext) =>
  isAdmin(user) || isManagerOfProject(user, project);

export const canManageProjectMembers = canManageProject;

export const canCreateProject = (user: AuthorizationUser) =>
  isAdmin(user) || isProjectManager(user);

export const canViewTask = (
  _user: AuthorizationUser,
  _task: TaskAuthorizationContext,
  projectAccessible: boolean,
) => projectAccessible;

export const canCreateTask = (user: AuthorizationUser, projectAccessible: boolean) =>
  projectAccessible && (isAdmin(user) || isProjectManager(user) || user.role === UserRole.MEMBER);

export const canEditTask = (
  user: AuthorizationUser,
  task: TaskAuthorizationContext,
  projectAccessible: boolean,
) => {
  if (!projectAccessible) return false;
  if (isAdmin(user) || (isProjectManager(user) && task.projectManagerUserId === user.userId)) return true;
  return isTaskParticipant(user, task);
};

export const canUpdateTaskStatus = canEditTask;

export const canDeleteTask = (
  user: AuthorizationUser,
  task: TaskAuthorizationContext,
  projectAccessible: boolean,
) => projectAccessible && (isAdmin(user) || (isProjectManager(user) && task.projectManagerUserId === user.userId));

export const canAssignTask = canDeleteTask;

export const isTaskParticipant = (user: AuthorizationUser, task: TaskAuthorizationContext) =>
  task.assignedUserId === user.userId ||
  task.assignedUserIds?.includes(user.userId) === true ||
  task.authorUserId === user.userId;
