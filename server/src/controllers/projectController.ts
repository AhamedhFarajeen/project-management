import { Prisma, UserRole } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { canCreateProject, canManageProject, canManageProjectMembers, canViewProject } from "../services/authorization";

const parseId = (value: string | string[]) => { const id = Number(Array.isArray(value) ? value[0] : value); return Number.isInteger(id) && id > 0 ? id : null; };
const parseOptionalId = (value: unknown) => { if (value === undefined || value === null || value === "") return null; const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : undefined; };
const parseDate = (value: unknown) => { if (value === undefined || value === null || value === "") return null; if (typeof value !== "string" && !(value instanceof Date)) return undefined; const date = new Date(value); return Number.isNaN(date.getTime()) ? undefined : date; };
const validateProjectFields = (body: Record<string, unknown>, partial = false) => { if ((!partial || body.name !== undefined) && (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 200)) return "Name is required and must be 1-200 characters."; if (body.description !== undefined && body.description !== null && (typeof body.description !== "string" || body.description.length > 2000)) return "Description must be 2000 characters or fewer."; const start = parseDate(body.startDate), end = parseDate(body.endDate); if (start === undefined || end === undefined) return "Dates must be valid ISO dates."; if (start && end && start > end) return "Start date must be before or equal to end date."; return null; };

const publicUserSelect = { userId: true, username: true, profilePictureUrl: true, role: true } as const;
const projectContextSelect = { id: true, name: true, description: true, startDate: true, endDate: true, projectManagerUserId: true, projectManager: { select: publicUserSelect }, projectTeams: { select: { team: { select: { id: true, teamName: true } } } }, members: { select: { userId: true } }, _count: { select: { tasks: true } } } as const;
const forbidden = (res: Response, code = "PROJECT_FORBIDDEN") => res.status(403).json({ message: "You do not have access to this project.", code });

async function loadProject(id: number) { return prisma.project.findUnique({ where: { id }, select: projectContextSelect }); }
function userContext(res: Response) { return res.locals.appUser; }

export const getProjects = async (_req: Request, res: Response): Promise<void> => {
  try {
    const user = userContext(res);
    const where = user.role === UserRole.ADMIN ? {} : user.role === UserRole.PROJECT_MANAGER ? { OR: [{ projectManagerUserId: user.userId }, { members: { some: { userId: user.userId } } }] } : { members: { some: { userId: user.userId } } };
    const projects = await prisma.project.findMany({ where, select: { id: true, name: true, description: true, startDate: true, endDate: true, projectManagerUserId: true, _count: { select: { tasks: true } } }, orderBy: { id: "asc" } });
    res.json(projects);
  } catch { res.status(500).json({ message: "Unable to retrieve projects." }); }
};

export const getProject = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id); if (!id) { res.status(400).json({ message: "Invalid project ID." }); return; }
  try { const project = await loadProject(id); if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; } const user = userContext(res); if (!canViewProject(user, project, project.members.some(({ userId }) => userId === user.userId))) { forbidden(res); return; } res.json({ ...project, teams: project.projectTeams.map(({ team }) => team), taskCount: project._count.tasks }); } catch { res.status(500).json({ message: "Unable to retrieve project." }); }
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {}; const error = validateProjectFields(body); if (error) { res.status(400).json({ message: error }); return; }
  const user = userContext(res); if (!canCreateProject(user)) { forbidden(res, "PROJECT_CREATE_FORBIDDEN"); return; }
  const requestedManager = parseOptionalId(body.projectManagerUserId); const requestedTeam = parseOptionalId(body.teamId); if (requestedManager === undefined || requestedTeam === undefined) { res.status(400).json({ message: "Manager and team IDs must be valid numbers." }); return; }
  const managerId = user.role === UserRole.PROJECT_MANAGER ? user.userId : requestedManager;
  try {
    if (managerId) { const manager = await prisma.user.findUnique({ where: { userId: managerId }, select: { userId: true, role: true } }); if (!manager || (manager.role !== UserRole.ADMIN && manager.role !== UserRole.PROJECT_MANAGER)) { res.status(400).json({ message: "Project manager must be an Admin or Project Manager." }); return; } }
    const teamId = requestedTeam ?? (user.role === UserRole.PROJECT_MANAGER ? user.teamId : null); if (teamId) { if (!(await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } }))) { res.status(400).json({ message: "Team not found." }); return; } }
    const project = await prisma.$transaction(async (tx) => tx.project.create({ data: { name: body.name.trim(), description: body.description || null, startDate: parseDate(body.startDate), endDate: parseDate(body.endDate), projectManagerUserId: managerId, projectTeams: teamId ? { create: [{ teamId }] } : undefined, members: managerId ? { create: [{ userId: managerId }] } : undefined }, include: { projectTeams: { include: { team: true } }, members: { include: { user: { select: publicUserSelect } } } } }));
    res.status(201).json(project);
  } catch (error: any) { console.error("Unable to create project", { code: error?.code ?? "UNKNOWN" }); if (error?.code === "P2003") { res.status(400).json({ message: "Project manager, team, or member was not found." }); return; } res.status(500).json({ message: "Unable to create project." }); }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id); if (!id) { res.status(400).json({ message: "Invalid project ID." }); return; }
  const body = req.body ?? {}; const error = validateProjectFields(body, true); if (error) { res.status(400).json({ message: error }); return; }
  try { const project = await loadProject(id); if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; } const user = userContext(res); if (!canManageProject(user, project)) { forbidden(res); return; }
    const data: Prisma.ProjectUpdateInput = {}; for (const field of ["name", "description", "startDate", "endDate"] as const) if (body[field] !== undefined) data[field] = field === "name" ? String(body[field]).trim() : field === "startDate" || field === "endDate" ? parseDate(body[field]) : body[field] || null;
    const managerId = body.projectManagerUserId === undefined ? undefined : parseOptionalId(body.projectManagerUserId); const teamId = body.teamId === undefined ? undefined : parseOptionalId(body.teamId); if (managerId === undefined && body.projectManagerUserId !== undefined || teamId === undefined && body.teamId !== undefined) { res.status(400).json({ message: "Manager and team IDs must be valid numbers." }); return; }
    if (body.projectManagerUserId !== undefined) { if (!user.role || user.role !== UserRole.ADMIN) { forbidden(res, "PROJECT_MANAGER_REASSIGN_FORBIDDEN"); return; } if (managerId) { const manager = await prisma.user.findUnique({ where: { userId: managerId }, select: { role: true } }); if (!manager || (manager.role !== UserRole.ADMIN && manager.role !== UserRole.PROJECT_MANAGER)) { res.status(400).json({ message: "Project manager must be an Admin or Project Manager." }); return; } data.projectManager = { connect: { userId: managerId } }; } else data.projectManager = { disconnect: true }; }
    const updated = await prisma.$transaction(async (tx) => { const result = await tx.project.update({ where: { id }, data }); if (teamId !== undefined) { await tx.projectTeam.deleteMany({ where: { projectId: id } }); if (teamId) await tx.projectTeam.create({ data: { projectId: id, teamId } }); } if (managerId) await tx.projectMember.upsert({ where: { userId_projectId: { userId: managerId, projectId: id } }, create: { userId: managerId, projectId: id }, update: {} }); return result; });
    res.json(updated);
  } catch (error: any) { if (error?.code === "P2025") { res.status(404).json({ message: "Project not found." }); return; } res.status(500).json({ message: "Unable to update project." }); }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id); if (!id) { res.status(400).json({ message: "Invalid project ID." }); return; }
  try { const project = await loadProject(id); if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; } if (!canManageProject(userContext(res), project)) { forbidden(res); return; } await prisma.$transaction(async (tx) => { const taskIds = (await tx.project.findUnique({ where: { id }, select: { tasks: { select: { id: true } } } }))?.tasks.map((task) => task.id) ?? []; if (taskIds.length) { await tx.attachment.deleteMany({ where: { taskId: { in: taskIds } } }); await tx.comment.deleteMany({ where: { taskId: { in: taskIds } } }); await tx.taskAssignment.deleteMany({ where: { taskId: { in: taskIds } } }); await tx.task.deleteMany({ where: { id: { in: taskIds } } }); } await tx.projectMember.deleteMany({ where: { projectId: id } }); await tx.projectTeam.deleteMany({ where: { projectId: id } }); await tx.project.delete({ where: { id } }); }); res.status(204).send(); } catch { res.status(500).json({ message: "Unable to delete project." }); }
};

export const getProjectMembers = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id); if (!id) { res.status(400).json({ message: "Invalid project ID." }); return; }
  try { const project = await prisma.project.findUnique({ where: { id }, select: { id: true, projectManagerUserId: true, members: { select: { userId: true, user: { select: publicUserSelect } } } } }); if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; } const user = userContext(res); if (!canViewProject(user, project, project.members.some(({ userId }) => userId === user.userId))) { forbidden(res); return; } res.json(project.members.map(({ user }) => user)); } catch { res.status(500).json({ message: "Unable to retrieve project members." }); }
};

export const getProjectMemberCandidates = async (req: Request, res: Response): Promise<void> => {
  const id = parseId(req.params.id); if (!id) { res.status(400).json({ message: "Invalid project ID." }); return; }
  try {
    const project = await prisma.project.findUnique({ where: { id }, select: { projectManagerUserId: true, projectTeams: { select: { teamId: true } }, members: { select: { userId: true } } } });
    if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; }
    if (!canManageProjectMembers(userContext(res), { id, projectManagerUserId: project.projectManagerUserId, memberUserIds: project.members.map(({ userId }) => userId) })) { forbidden(res); return; }
    const teamIds = project.projectTeams.map(({ teamId }) => teamId);
    if (!teamIds.length) { res.json([]); return; }
    res.json(await prisma.user.findMany({ where: { teamId: { in: teamIds }, userId: { notIn: project.members.map(({ userId }) => userId) } }, select: publicUserSelect, orderBy: { userId: "asc" } }));
  } catch { res.status(500).json({ message: "Unable to retrieve project member candidates." }); }
};

export const addProjectMember = async (req: Request, res: Response): Promise<void> => {
  const projectId = parseId(req.params.id); const userId = parseId(req.body?.userId); if (!projectId || !userId) { res.status(400).json({ message: "Project and user IDs must be valid numbers." }); return; }
  try { const project = await loadProject(projectId); if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; } if (!canManageProjectMembers(userContext(res), project)) { forbidden(res); return; } if (project.members.some(({ userId: id }) => id === userId)) { res.status(409).json({ message: "User is already a project member.", code: "PROJECT_MEMBER_EXISTS" }); return; } const target = await prisma.user.findUnique({ where: { userId }, select: { userId: true, teamId: true } }); if (!target) { res.status(404).json({ message: "User not found." }); return; } const teamIds = project.projectTeams.map(({ team }) => team.id); if (teamIds.length && (!target.teamId || !teamIds.includes(target.teamId))) { res.status(400).json({ message: "User must belong to a team associated with this project." }); return; } const member = await prisma.projectMember.create({ data: { projectId, userId }, include: { user: { select: publicUserSelect } } }); res.status(201).json(member.user); } catch (error: any) { if (error?.code === "P2002") { res.status(409).json({ message: "User is already a project member.", code: "PROJECT_MEMBER_EXISTS" }); return; } res.status(500).json({ message: "Unable to add project member." }); }
};

export const removeProjectMember = async (req: Request, res: Response): Promise<void> => {
  const projectId = parseId(req.params.id); const userId = parseId(req.params.userId); if (!projectId || !userId) { res.status(400).json({ message: "Project and user IDs must be valid numbers." }); return; }
  try { const project = await loadProject(projectId); if (!project) { res.status(404).json({ message: "Project not found.", code: "PROJECT_NOT_FOUND" }); return; } if (!canManageProjectMembers(userContext(res), project)) { forbidden(res); return; } if (project.projectManagerUserId === userId) { res.status(409).json({ message: "Reassign the project manager before removing them.", code: "PROJECT_MANAGER_MEMBERSHIP_REQUIRED" }); return; } const result = await prisma.projectMember.deleteMany({ where: { projectId, userId } }); if (!result.count) { res.status(404).json({ message: "Project member not found.", code: "PROJECT_MEMBER_NOT_FOUND" }); return; } res.status(204).send(); } catch { res.status(500).json({ message: "Unable to remove project member." }); }
};
