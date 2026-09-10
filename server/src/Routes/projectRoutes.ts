import { Router } from "express";
import { addProjectMember, createProject, deleteProject, getProject, getProjectMemberCandidates, getProjectMembers, getProjects, removeProjectMember, updateProject } from "../controllers/projectController";

const router = Router();

router.get("/", getProjects);
router.post("/", createProject);
router.get("/:id/members", getProjectMembers);
router.get("/:id/member-candidates", getProjectMemberCandidates);
router.post("/:id/members", addProjectMember);
router.delete("/:id/members/:userId", removeProjectMember);
router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
