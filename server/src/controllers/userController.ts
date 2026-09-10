import { UserRole } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { projectAccessWhere } from "../services/authorization";

const publicUserSelect = { userId: true, username: true, profilePictureUrl: true, role: true, team: { select: { id: true, teamName: true } } } as const;

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const current = res.locals.appUser;
    const where = current.role === UserRole.ADMIN ? {} : { OR: [{ projectMemberships: { some: { project: projectAccessWhere(current) } } }, { managedProjects: { some: projectAccessWhere(current) } }] };
    res.json(await prisma.user.findMany({ where, select: publicUserSelect, distinct: ["userId"], orderBy: { userId: "asc" } }));
  } catch { res.status(500).json({ message: "Unable to retrieve users." }); }
};

export const getCurrentUser = (_req: Request, res: Response): void => {
  const { userId, username, email, profilePictureUrl, team, teamId, role } = res.locals.appUser;
  res.json({ userId, username, email, profilePictureUrl, team, teamId, role });
};

export const updateUserTeam = async (req: Request, res: Response): Promise<void> => {
  if (res.locals.appUser.role !== UserRole.ADMIN) { res.status(403).json({ message: "Only Admins can assign users to teams." }); return; }
  const userId = Number(req.params.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) { res.status(400).json({ message: "Invalid user ID." }); return; }
  const rawTeamId = req.body?.teamId;
  const teamId = rawTeamId === null || rawTeamId === "" || rawTeamId === undefined ? null : Number(rawTeamId);
  if (teamId !== null && (!Number.isSafeInteger(teamId) || teamId <= 0)) { res.status(400).json({ message: "Invalid team ID." }); return; }
  try {
    const user = await prisma.user.findUnique({ where: { userId }, select: { userId: true } });
    if (!user) { res.status(404).json({ message: "User not found." }); return; }
    if (teamId !== null && !(await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } }))) { res.status(404).json({ message: "Team not found." }); return; }
    res.json(await prisma.user.update({ where: { userId }, data: { teamId }, select: publicUserSelect }));
  } catch { res.status(500).json({ message: "Unable to update the user's team." }); }
};
