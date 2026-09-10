import { UserRole } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { projectAccessWhere } from "../services/authorization";

export const getTeams = async (_req: Request, res: Response): Promise<void> => {
  try {
    const current = res.locals.appUser;
    const where = current.role === UserRole.ADMIN ? {} : { OR: [{ id: current.teamId ?? -1 }, { projectTeams: { some: { project: projectAccessWhere(current) } } }] };
    const teams = await prisma.team.findMany({ where, orderBy: { id: "asc" } });
    const result = await Promise.all(teams.map(async (team) => {
      const [productOwner, projectManager] = await Promise.all([
        team.productOwnerUserId ? prisma.user.findUnique({ where: { userId: team.productOwnerUserId }, select: { username: true } }) : null,
        team.projectManagerUserId ? prisma.user.findUnique({ where: { userId: team.projectManagerUserId }, select: { username: true } }) : null,
      ]);
      return { ...team, productOwnerUsername: productOwner?.username, projectManagerUsername: projectManager?.username };
    }));
    res.json(result);
  } catch { res.status(500).json({ message: "Unable to retrieve teams." }); }
};
