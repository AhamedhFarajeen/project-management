import { Router } from "express";

import {  getUsers, getCurrentUser } from "../controllers/userController";

const router = Router();

router.get("/me", getCurrentUser);
router.get("/", getUsers);


export default router;
