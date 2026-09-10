 import { Router } from "express";
import {
  createTask,
  deleteTask,
  getTask,
  getTasks,
  getMyTasks,
  getUserTasks,
  updateTaskStatus,
  updateTask,
} from "../controllers/taskController";

const router = Router();

router.get("/", getTasks);
router.post("/", createTask);
router.get("/me", getMyTasks);
router.get("/:id", getTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
router.patch("/:taskId/status", updateTaskStatus);
router.get("/user/:userId", getUserTasks);

export default router;
