 import { Request, Response } from "express";
import { prisma } from "../lib/prisma";



export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.query;
  try {
    const tasks = await prisma.task.findMany({
      where: {
        projectId: Number(projectId),
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
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving tasks: ${error.message}` });
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
    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        tags,
        startDate,
        dueDate,
        points,
        projectId,
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
    res
      .status(500)
      .json({ message: `Error creating a task: ${error.message}` });
  }
};

export const updateTaskStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { taskId } = req.params;
  const { status } = req.body;
  try {
    const updatedTask = await prisma.task.update({
      where: {
        id: Number(taskId),
      },
      data: {
        status: status,
      },
    });
    res.json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: `Error updating task: ${error.message}` });
  }
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
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving user's tasks: ${error.message}` });
  }
};
