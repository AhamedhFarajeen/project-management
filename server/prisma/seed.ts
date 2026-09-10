import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const teamId = 1;
const seededIdTables = ["Team", "Project", "ProjectTeam", "Task"] as const;
const fixtureUsers = [
  { username: "Nimal Perera", email: "nimal@example.com", role: UserRole.PROJECT_MANAGER },
  { username: "Sarah Fernando", email: "sarah@example.com", role: UserRole.MEMBER },
  { username: "Kasun Silva", email: "kasun@example.com", role: UserRole.MEMBER },
] as const;
const projects = [
  { id: 1, name: "E-Commerce Platform", description: "Modern e-commerce platform with product management, authentication, shopping cart, payments, and order workflows.", startDate: "2026-01-05", endDate: "2026-04-30", members: ["Nimal Perera", "Sarah Fernando", "Kasun Silva"] },
  { id: 2, name: "Project Management Dashboard", description: "Collaborative workspace for project planning, task management, assignments, and progress tracking.", startDate: "2026-02-01", endDate: "2026-05-31", members: ["Nimal Perera", "Sarah Fernando"] },
  { id: 3, name: "Learning Management System", description: "Course and student management platform with secure learning workflows.", startDate: "2025-09-01", endDate: "2025-12-15", members: ["Nimal Perera", "Kasun Silva"] },
] as const;
const taskFixtures = [
  [1, "Design product catalogue", "Completed", "Medium", 1, "Nimal Perera", ["Nimal Perera", "Sarah Fernando"]], [2, "Implement authentication", "Completed", "High", 1, "Nimal Perera", ["Nimal Perera"]], [3, "Build shopping cart", "Work In Progress", "High", 1, "Sarah Fernando", ["Sarah Fernando", "Kasun Silva"]], [4, "Stripe checkout integration", "Work In Progress", "High", 1, "Sarah Fernando", ["Sarah Fernando", "Kasun Silva"]], [5, "Order history page", "To Do", "Medium", 1, "Kasun Silva", ["Kasun Silva"]], [6, "Responsive mobile fixes", "To Do", "Low", 1, "Nimal Perera", []],
  [7, "Dashboard analytics", "Completed", "High", 2, "Nimal Perera", ["Sarah Fernando"]], [8, "Kanban board", "Completed", "Medium", 2, "Sarah Fernando", ["Sarah Fernando"]], [9, "Task assignment", "Work In Progress", "High", 2, "Sarah Fernando", ["Sarah Fernando"]], [10, "Timeline integration", "Work In Progress", "Medium", 2, "Nimal Perera", ["Nimal Perera", "Sarah Fernando"]], [11, "Responsive navigation", "To Do", "Low", 2, "Nimal Perera", []], [12, "Deployment preparation", "To Do", "Medium", 2, "Sarah Fernando", ["Sarah Fernando"]],
  [13, "Course management", "Completed", "High", 3, "Nimal Perera", ["Nimal Perera"]], [14, "Student authentication", "Completed", "High", 3, "Nimal Perera", ["Kasun Silva"]], [15, "Payment integration", "Completed", "Medium", 3, "Kasun Silva", ["Kasun Silva"]], [16, "Video lesson interface", "Completed", "Medium", 3, "Kasun Silva", ["Kasun Silva"]],
] as const;
const dates: Record<number, [string, string]> = {
  1: ["2026-01-05", "2026-01-20"], 2: ["2026-01-10", "2026-01-31"], 3: ["2026-02-01", "2026-02-20"], 4: ["2026-02-10", "2026-03-01"], 5: ["2026-03-01", "2026-03-20"], 6: ["2026-03-15", "2026-04-05"], 7: ["2026-02-01", "2026-02-15"], 8: ["2026-02-10", "2026-03-01"], 9: ["2026-03-01", "2026-03-20"], 10: ["2026-03-10", "2026-04-01"], 11: ["2026-04-01", "2026-04-20"], 12: ["2026-04-10", "2026-05-01"], 13: ["2025-09-01", "2025-09-20"], 14: ["2025-09-15", "2025-10-05"], 15: ["2025-10-01", "2025-10-25"], 16: ["2025-11-01", "2025-11-30"],
};

export async function seed() {
  await prisma.$transaction(async (tx) => {
    await tx.team.upsert({ where: { id: teamId }, create: { id: teamId, teamName: "Engineering Team" }, update: { teamName: "Engineering Team" } });
    const users = new Map<string, { userId: number }>();
    for (const fixture of fixtureUsers) {
      const existing = await tx.user.findUnique({ where: { username: fixture.username }, select: { userId: true, clerkUserId: true } });
      if (existing?.clerkUserId) { users.set(fixture.username, { userId: existing.userId }); continue; }
      const user = await tx.user.upsert({ where: { username: fixture.username }, create: { ...fixture, teamId, clerkUserId: null }, update: { email: fixture.email, role: fixture.role, teamId, clerkUserId: null } });
      users.set(fixture.username, user);
    }
    for (const project of projects) {
      const manager = users.get("Nimal Perera")!;
      await tx.project.upsert({ where: { id: project.id }, create: { id: project.id, name: project.name, description: project.description, startDate: new Date(`${project.startDate}T00:00:00Z`), endDate: new Date(`${project.endDate}T00:00:00Z`), projectManagerUserId: manager.userId }, update: { name: project.name, description: project.description, startDate: new Date(`${project.startDate}T00:00:00Z`), endDate: new Date(`${project.endDate}T00:00:00Z`), projectManagerUserId: manager.userId } });
      await tx.projectTeam.upsert({ where: { id: project.id }, create: { id: project.id, teamId, projectId: project.id }, update: { teamId, projectId: project.id } });
      await tx.projectMember.deleteMany({ where: { projectId: project.id } });
      await tx.projectMember.createMany({ data: project.members.map((name) => ({ projectId: project.id, userId: users.get(name)!.userId })), skipDuplicates: true });
    }
    for (const [id, title, status, priority, projectId, authorName, assigneeNames] of taskFixtures) {
      const [startDate, dueDate] = dates[id]; const assigneeIds = assigneeNames.map((name) => users.get(name)!.userId);
      const data = { title, description: `${title} for the portfolio demo.`, status, priority, tags: "Portfolio", startDate: new Date(`${startDate}T00:00:00Z`), dueDate: new Date(`${dueDate}T00:00:00Z`), points: priority === "High" ? 5 : 3, projectId, authorUserId: users.get(authorName)!.userId, assignedUserId: assigneeIds[0] ?? null };
      await tx.task.upsert({ where: { id }, create: { id, ...data }, update: data });
      await tx.taskAssignment.deleteMany({ where: { taskId: id } });
      if (assigneeIds.length) await tx.taskAssignment.createMany({ data: assigneeIds.map((userId) => ({ userId, taskId: id })), skipDuplicates: true });
    }

    // These fixtures intentionally use stable IDs. Keep PostgreSQL's generated-ID
    // sequences above those IDs so normal application creates cannot collide.
    for (const table of seededIdTables) {
      await tx.$queryRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${table}"`,
      );
    }
  }, { timeout: 60000 });
  console.log("Portfolio seed completed: 1 team, 3 fixture users, 3 projects, 16 tasks.");
}
if (require.main === module) seed().catch((error) => { console.error("Seed failed:", error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
