import "dotenv/config";
import { clerkClient } from "@clerk/express";
import { prisma } from "../src/lib/prisma";

async function main() {
  const userId = Number(process.argv[2]);
  const clerkUserId = process.argv[3];
  if (
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    !clerkUserId?.startsWith("user_")
  ) {
    throw new Error(
      "Usage: npm run link-user -- <database-user-id> <clerk-user-id>",
    );
  }
  // Verify the account belongs to the configured Clerk application.
  await clerkClient.users.getUser(clerkUserId);
  await prisma.$transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { clerkUserId } })) {
      throw new Error(
        "This Clerk account is already linked. No accounts were merged.",
      );
    }
    const result = await tx.user.updateMany({
      where: { userId, clerkUserId: null },
      data: { clerkUserId },
    });
    if (result.count !== 1)
      throw new Error("User does not exist or is already linked");
  });
  console.log(
    `Linked database user ${userId}; all existing relationships preserved.`,
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
