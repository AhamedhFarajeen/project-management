import { UserRole } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { projectAccessWhere } from "../services/authorization";

const publicUserSelect = { userId: true, username: true, profilePictureUrl: true, role: true } as const;

export const search = async (req: Request, res: Response): Promise<void> => {
  const rawQuery = req.query.query;
  if (typeof rawQuery !== "string" || rawQuery.trim().length < 2 || rawQuery.length > 100) { res.status(400).json({ message: "Search query must be 2-100 characters." }); return; }
  const query = rawQuery.trim();
  try {
    const current = res.locals.appUser;
    const projectFilter = projectAccessWhere(current);
    const userFilter = current.role === UserRole.ADMIN ? {} : { OR: [{ projectMemberships: { some: { project: projectFilter } } }, { managedProjects: { some: projectFilter } }] };
    const teamFilter = current.role === UserRole.ADMIN ? {} : { OR: [{ id: current.teamId ?? -1 }, { projectTeams: { some: { project: projectFilter } } }] };
    const [tasks, projects, users, teams] = await Promise.all([
      prisma.task.findMany({ where: { project: projectFilter, OR: [{ title: { contains: query } }, { description: { contains: query } }] } }),
      prisma.project.findMany({ where: { AND: [projectFilter, { OR: [{ name: { contains: query } }, { description: { contains: query } }] }] } }),
      prisma.user.findMany({ where: { AND: [userFilter, { OR: [{ username: { contains: query } }] }] }, select: publicUserSelect, distinct: ["userId"] }),
      prisma.team.findMany({ where: { ...teamFilter, teamName: { contains: query } }, select: { id: true, teamName: true }, distinct: ["id"] }),
    ]);
    res.json({ tasks, projects, users, teams });
  } catch { res.status(500).json({ message: "Unable to perform search." }); }
};
