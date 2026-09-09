import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Connection settings come exclusively from DATABASE_URL in schema.prisma.
export const prisma = new PrismaClient();
