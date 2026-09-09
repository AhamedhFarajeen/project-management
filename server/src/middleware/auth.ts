import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { clerkClient, getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Authentication protects the existing shared workspace; team RBAC is separate.
export function createRequireAppUser(
  fetchProfile: typeof clerkClient.users.getUser = (id) =>
    clerkClient.users.getUser(id),
) {
  return async function requireAppUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    try {
      let user = await prisma.user.findUnique({
        where: { clerkUserId },
        include: { team: true },
      });
      // Refresh profile data on /users/me and provision on any first API request.
      if (!user || req.path === "/users/me") {
        const profile = await fetchProfile(clerkUserId);
        const email =
          profile.emailAddresses.find(
            (address) => address.id === profile.primaryEmailAddressId,
          )?.emailAddress ?? null;
        const fallbackUsername = `member_${createHash("sha256").update(clerkUserId).digest("hex").slice(0, 20)}`;
        const requestedUsername = profile.username || fallbackUsername;
        const existingName = await prisma.user.findUnique({
          where: { username: requestedUsername },
        });
        const username =
          existingName && existingName.clerkUserId !== clerkUserId
            ? fallbackUsername
            : requestedUsername;
        const upsert = (createUsername: string) =>
          prisma.user.upsert({
            where: { clerkUserId },
            create: {
              clerkUserId,
              username: createUsername,
              email,
              profilePictureUrl: profile.imageUrl,
            },
            update: { email, profilePictureUrl: profile.imageUrl },
            include: { team: true },
          });
        try {
          user = await upsert(username);
        } catch (error) {
          // Concurrent first requests or a conflicting local username must not link accounts.
          if (
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== "P2002"
          )
            throw error;
          user = await upsert(fallbackUsername);
        }
      }
      res.locals.appUser = user;
      next();
    } catch (error) {
      console.error("Unable to synchronize authenticated user", error);
      res
        .status(503)
        .json({ message: "Unable to load your account. Please retry." });
    }
  };
}

export const requireAppUser = createRequireAppUser();
