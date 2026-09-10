import { Router } from "express";

import { getUsers, getCurrentUser, updateUserTeam } from "../controllers/userController";

const router = Router();

router.get("/me", getCurrentUser);
router.patch("/:userId/team", updateUserTeam);
router.get("/", getUsers);


export default router;
