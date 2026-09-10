import type { Project, Task, User } from "@/state/api";

export const isAdmin = (user?: User | null) => user?.role === "ADMIN";
export const isProjectManager = (user?: User | null) => user?.role === "PROJECT_MANAGER";
export const managesProject = (user?: User | null, project?: Pick<Project, "projectManagerUserId"> | null) =>
  Boolean(user && project && (isAdmin(user) || project.projectManagerUserId === user.userId));
export const canEditTask = (user?: User | null, task?: Pick<Task, "authorUserId" | "assignedUserId" | "taskAssignments"> | null, project?: Pick<Project, "projectManagerUserId"> | null) =>
  Boolean(user && task && (managesProject(user, project) || task.authorUserId === user.userId || task.assignedUserId === user.userId || task.taskAssignments?.some((assignment) => assignment.userId === user.userId)));
