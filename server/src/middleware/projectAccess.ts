import { prisma } from "../lib/prisma";

export async function canAccessProject(projectId: number, teamId?: number | null) {
  if (!teamId) return false;
  const link = await prisma.projectTeam.findFirst({ where: { projectId, teamId }, select: { id: true } });
  return Boolean(link);
}

export function forbidden(res: any, code: string) {
  res.status(403).json({ message: "You do not have access to this project.", code });
}
