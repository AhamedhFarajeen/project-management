import "dotenv/config";
import { clerkClient } from "@clerk/express";
import { prisma } from "../src/lib/prisma";

async function main() {
  const clerkUserId = process.argv[2];
  const teamId = Number(process.argv[3]);
  if (!clerkUserId?.startsWith("user_") || !Number.isSafeInteger(teamId) || teamId <= 0) {
    throw new Error("Usage: npm run assign-team -- <clerk-user-id> <team-id>");
  }
  await clerkClient.users.getUser(clerkUserId);
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  if (!team) throw new Error(`Team ${teamId} does not exist.`);
  const user = await prisma.user.findUnique({ where: { clerkUserId }, select: { userId: true } });
  if (!user) throw new Error("Local user not found. Sign in once first so /users/me can provision the account.");
  await prisma.user.update({ where: { userId: user.userId }, data: { teamId } });
  console.log(`Assigned the authenticated local user to team ${teamId}.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
