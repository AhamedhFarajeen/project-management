 import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { canAssignTask, canCreateTask, canDeleteTask, canEditTask, canUpdateTaskStatus, canViewProject, canViewTask, getProjectAuthorizationContext, projectAccessWhere } from "../services/authorization";

const forbidden = (res: Response, code = "TASK_FORBIDDEN") => res.status(403).json({ message: "You do not have access to this task.", code });

const taskStatuses = ["To Do", "Work In Progress", "Under Review", "Completed"];
const taskPriorities = ["Urgent", "High", "Medium", "Low", "Backlog"];
const idValue = (value: string | string[]) => { const id = Number(Array.isArray(value) ? value[0] : value); return Number.isInteger(id) && id > 0 ? id : null; };
const dateValue = (value: unknown) => { if (value === undefined || value === null || value === "") return null; if (typeof value !== "string") return undefined; const d = new Date(value); return Number.isNaN(d.getTime()) ? undefined : d; };
const assigneeValues = (value: unknown) => { if (value === undefined) return undefined; if (!Array.isArray(value)) return null; const ids = value.map(Number); if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) return null; return [...new Set(ids)]; };

const taskInclude = { author: true, assignee: true, taskAssignments: { include: { user: true } }, comments: true, attachments: true, project: { select: { id: true, name: true } } } as const;



export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.query;
  const numericProjectId = Number(projectId);
  if (!Number.isSafeInteger(numericProjectId) || numericProjectId <= 0) { res.status(400).json({ message: "Project ID must be a valid number." }); return; }
  try {
    const user = res.locals.appUser;
    const project = await getProjectAuthorizationContext(numericProjectId);
    if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; }
    if (!canViewProject(user, project)) { forbidden(res, "PROJECT_FORBIDDEN"); return; }
    const tasks = await prisma.task.findMany({
      where: {
        projectId: numericProjectId,
      },
      include: {
        author: true,
        assignee: true,
        taskAssignments: {
          include: { user: true },
        },
        comments: true,
        attachments: true,
      },
    });
    res.json(tasks);
  } catch {
    res.status(500).json({ message: "Unable to retrieve tasks." });
  }
};

export const createTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  const {
    title,
    description,
    status,
    priority,
    tags,
    startDate,
    dueDate,
    points,
    projectId,
    assignedUserId,
    assignedUserIds,
  } = req.body;

  if (typeof title !== "string" || !title.trim() || title.trim().length > 200) { res.status(400).json({ message: "Title is required and must be 1-200 characters." }); return; }
  if (status !== undefined && !taskStatuses.includes(status)) { res.status(400).json({ message: "Invalid status." }); return; }
  if (priority !== undefined && !taskPriorities.includes(priority)) { res.status(400).json({ message: "Invalid priority." }); return; }
  const parsedStart = dateValue(startDate), parsedDue = dateValue(dueDate);
  if (parsedStart === undefined || parsedDue === undefined || (parsedStart && parsedDue && parsedStart > parsedDue)) { res.status(400).json({ message: "Invalid task dates." }); return; }
  const numericProjectId = Number(projectId);
  if (!Number.isSafeInteger(numericProjectId) || numericProjectId <= 0) { res.status(400).json({ message: "Project ID must be a valid number." }); return; }

  if (assignedUserIds !== undefined && !Array.isArray(assignedUserIds)) {
    res.status(400).json({ message: "assignedUserIds must be an array of user IDs" });
    return;
  }

  const assigneeIds = [
    ...(assignedUserIds ?? []),
    ...(assignedUserId !== undefined && assignedUserId !== null
      ? [assignedUserId]
      : []),
  ].map(Number);

  if (assigneeIds.some((userId) => !Number.isSafeInteger(userId) || userId <= 0)) {
    res.status(400).json({ message: "Every assignee must have a valid user ID" });
    return;
  }

  const uniqueAssigneeIds = [...new Set(assigneeIds)];
  try {
    const user = res.locals.appUser;
    const project = await getProjectAuthorizationContext(numericProjectId);
    if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; }
    const projectAccessible = canViewProject(user, project);
    if (!canCreateTask(user, projectAccessible)) { forbidden(res, "TASK_FORBIDDEN"); return; }
    if (uniqueAssigneeIds.length && !canAssignTask(user, { projectId: numericProjectId, projectManagerUserId: project.projectManagerUserId, authorUserId: user.userId }, projectAccessible)) { forbidden(res, "TASK_ASSIGNMENT_FORBIDDEN"); return; }
    if (uniqueAssigneeIds.length && (await prisma.user.count({ where: { userId: { in: uniqueAssigneeIds }, projectMemberships: { some: { projectId: numericProjectId } } } })) !== uniqueAssigneeIds.length) { res.status(422).json({ message: "Every assignee must be a member of this project.", code: "ASSIGNEE_NOT_PROJECT_MEMBER" }); return; }
    const newTask = await prisma.task.create({
      data: {
        title: title.trim(),
        description,
        status,
        priority,
        tags,
        startDate: parsedStart,
        dueDate: parsedDue,
        points,
        projectId: numericProjectId,
        authorUserId: res.locals.appUser.userId,
        // Keep the first assignee in the legacy field while multi-assignee
        // consumers use TaskAssignment.
        assignedUserId: uniqueAssigneeIds[0],
        taskAssignments: uniqueAssigneeIds.length
          ? { create: uniqueAssigneeIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: {
        author: true,
        assignee: true,
        taskAssignments: { include: { user: true } },
      },
    });
    res.status(201).json(newTask);
  } catch (error: any) {
    console.error("Unable to create task", { code: error?.code ?? "UNKNOWN" });
    if (error?.code === "P2003") { res.status(400).json({ message: "Project or assignee was not found." }); return; }
    res.status(500).json({ message: "Unable to create task." });
  }
};

export const updateTaskStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const taskId = idValue(req.params.taskId);
  const { status } = req.body;
  if (!taskId || typeof status !== "string" || !taskStatuses.includes(status)) { res.status(400).json({ message: "Invalid task ID or status." }); return; }
  try {
    const taskProject = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true, authorUserId: true, assignedUserId: true, taskAssignments: { select: { userId: true } } } });
    if (!taskProject) { res.status(404).json({ message: "Task not found." }); return; }
    const project = await getProjectAuthorizationContext(taskProject.projectId);
    if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; }
    const user = res.locals.appUser;
    const accessible = canViewProject(user, project);
    if (!canUpdateTaskStatus(user, { ...taskProject, projectManagerUserId: project.projectManagerUserId, assignedUserIds: taskProject.taskAssignments.map(({ userId }) => userId) }, accessible)) { forbidden(res, "TASK_FORBIDDEN"); return; }
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: status,
      },
    });
    res.json(updatedTask);
  } catch {
    res.status(500).json({ message: "Unable to update task status." });
  }
};

export const getTask = async (req: Request, res: Response): Promise<void> => {
  const id = idValue(req.params.id); if (!id) { res.status(400).json({ message: "Invalid task ID." }); return; }
  try { const task = await prisma.task.findUnique({ where: { id }, include: taskInclude }); if (!task) { res.status(404).json({ message: "Task not found." }); return; } const project = await getProjectAuthorizationContext(task.projectId); if (!project || !canViewTask(res.locals.appUser, { projectId: task.projectId, projectManagerUserId: project.projectManagerUserId, authorUserId: task.authorUserId, assignedUserId: task.assignedUserId, assignedUserIds: task.taskAssignments.map(({ userId }) => userId) }, canViewProject(res.locals.appUser, project))) { forbidden(res, "PROJECT_FORBIDDEN"); return; } res.json(task); } catch { res.status(500).json({ message: "Unable to retrieve task." }); }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  const id = idValue(req.params.id); if (!id) { res.status(400).json({ message: "Invalid task ID." }); return; }
  const body = req.body ?? {};
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200)) { res.status(400).json({ message: "Title is required and must be 1-200 characters." }); return; }
  if (body.status !== undefined && !taskStatuses.includes(body.status)) { res.status(400).json({ message: "Invalid status." }); return; }
  if (body.priority !== undefined && !taskPriorities.includes(body.priority)) { res.status(400).json({ message: "Invalid priority." }); return; }
  const start = dateValue(body.startDate), due = dateValue(body.dueDate); if (start === undefined || due === undefined || (start && due && start > due)) { res.status(400).json({ message: "Invalid task dates." }); return; }
  const assignees = assigneeValues(body.assignedUserIds); if (assignees === null) { res.status(400).json({ message: "assignedUserIds must contain valid user IDs." }); return; }
  try {
    const existing = await prisma.task.findUnique({ where: { id }, select: { id: true, projectId: true, authorUserId: true, assignedUserId: true, taskAssignments: { select: { userId: true } } } }); if (!existing) { res.status(404).json({ message: "Task not found." }); return; }
    const project = await getProjectAuthorizationContext(existing.projectId); if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; }
    const user = res.locals.appUser; const accessible = canViewProject(user, project); const taskContext = { projectId: existing.projectId, projectManagerUserId: project.projectManagerUserId, authorUserId: existing.authorUserId, assignedUserId: existing.assignedUserId, assignedUserIds: existing.taskAssignments.map(({ userId }) => userId) };
    if (!canEditTask(user, taskContext, accessible)) { forbidden(res, "TASK_FORBIDDEN"); return; }
    if (body.projectId !== undefined && Number(body.projectId) !== existing.projectId) { res.status(422).json({ message: "Moving a task between projects is not allowed.", code: "TASK_PROJECT_IMMUTABLE" }); return; }
    const projectId = existing.projectId;
    if (assignees !== undefined && !canAssignTask(user, taskContext, accessible)) { forbidden(res, "TASK_ASSIGNMENT_FORBIDDEN"); return; }
    if (assignees && assignees.length && (await prisma.user.count({ where: { userId: { in: assignees }, projectMemberships: { some: { projectId } } } })) !== assignees.length) { res.status(422).json({ message: "Every assignee must be a member of this project.", code: "ASSIGNEE_NOT_PROJECT_MEMBER" }); return; }
    const data: Record<string, unknown> = {}; for (const field of ["title", "description", "status", "priority", "tags", "points"] as const) if (body[field] !== undefined) data[field] = field === "title" ? body[field].trim() : body[field]; if (body.startDate !== undefined) data.startDate = start; if (body.dueDate !== undefined) data.dueDate = due; if (body.projectId !== undefined) data.projectId = projectId; if (assignees !== undefined) data.assignedUserId = assignees[0] ?? null;
    const task = await prisma.$transaction(async (tx) => { await tx.task.update({ where: { id }, data }); if (assignees !== undefined) { await tx.taskAssignment.deleteMany({ where: { taskId: id } }); if (assignees.length) await tx.taskAssignment.createMany({ data: assignees.map((userId) => ({ taskId: id, userId })) }); } return tx.task.findUniqueOrThrow({ where: { id }, include: taskInclude }); });
    res.json(task);
  } catch (error: any) { if (error?.code === "P2025") { res.status(404).json({ message: "Task not found." }); return; } res.status(500).json({ message: "Unable to update task." }); }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  const id = idValue(req.params.id); if (!id) { res.status(400).json({ message: "Invalid task ID." }); return; }
  const target = await prisma.task.findUnique({ where: { id }, select: { projectId: true, authorUserId: true, assignedUserId: true, taskAssignments: { select: { userId: true } } } });
  if (!target) { res.status(404).json({ message: "Task not found." }); return; }
  const project = await getProjectAuthorizationContext(target.projectId); if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; }
  if (!canDeleteTask(res.locals.appUser, { ...target, projectManagerUserId: project.projectManagerUserId, assignedUserIds: target.taskAssignments.map(({ userId }) => userId) }, canViewProject(res.locals.appUser, project))) { forbidden(res, "TASK_FORBIDDEN"); return; }
  try { await prisma.$transaction(async (tx) => { const task = await tx.task.findUnique({ where: { id }, select: { id: true } }); if (!task) throw new Error("NOT_FOUND"); await tx.attachment.deleteMany({ where: { taskId: id } }); await tx.comment.deleteMany({ where: { taskId: id } }); await tx.taskAssignment.deleteMany({ where: { taskId: id } }); await tx.task.delete({ where: { id } }); }); res.status(204).send(); } catch (error: any) { if (error?.message === "NOT_FOUND" || error?.code === "P2025") { res.status(404).json({ message: "Task not found." }); return; } res.status(500).json({ message: "Unable to delete task." }); }
};

export const getUserTasks = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  if (Number(userId) !== res.locals.appUser.userId) {
    res.status(403).json({ message: "You can only request your own personal task list" });
    return;
  }
  try {
    const tasks = await prisma.task.findMany({
      where: {
        project: projectAccessWhere(res.locals.appUser),
        OR: [
          { authorUserId: Number(userId) },
          { assignedUserId: Number(userId) },
          { taskAssignments: { some: { userId: Number(userId) } } },
        ],
      },
      include: {
        author: true,
        assignee: true,
        taskAssignments: {
          include: { user: true },
        },
      },
    });
    res.json(tasks);
  } catch {
    res.status(500).json({ message: "Unable to retrieve your tasks." });
  }
};

export const getMyTasks = async (req: Request, res: Response): Promise<void> => {
  req.params.userId = String(res.locals.appUser.userId);
  return getUserTasks(req, res);
};
