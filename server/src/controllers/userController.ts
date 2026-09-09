import { Request, Response } from "express";
import { prisma } from "../lib/prisma";



export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving users: ${error.message}` });
  }
};



export const getCurrentUser = (_req: Request, res: Response): void => {
  res.json(res.locals.appUser);
};
