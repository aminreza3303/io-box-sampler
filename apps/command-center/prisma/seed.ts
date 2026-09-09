import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the command center");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const phaseTypes = ["PRODUCT", "DESIGN", "DEVELOPMENT", "DELIVERY"] as const;

async function upsertTaskWithPhases(input: {
  projectId: string;
  teamId: string;
  sprintId?: string;
  backlogItemId?: string;
  createdById: string;
  assigneeId: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  activePhase: (typeof phaseTypes)[number];
}) {
  const { activePhase, ...taskInput } = input;
  return prisma.$transaction(async (transaction) => {
    const task = await transaction.task.upsert({
      where: { projectId_title: { projectId: input.projectId, title: input.title } },
      create: {
        ...taskInput,
        status: "IN_PROGRESS",
      },
      update: {
        description: input.description,
        priority: input.priority,
        status: "IN_PROGRESS",
        sprintId: input.sprintId ?? null,
        assigneeId: input.assigneeId,
        teamId: input.teamId,
        backlogItemId: input.backlogItemId ?? null,
        archivedAt: null,
      },
    });

    for (const phaseType of phaseTypes) {
      const phaseIndex = phaseTypes.indexOf(phaseType);
      const activeIndex = phaseTypes.indexOf(activePhase);
      const status = phaseIndex < activeIndex ? "COMPLETE" : phaseType === activePhase ? "IN_PROGRESS" : "NOT_STARTED";
      await transaction.taskPhase.upsert({
        where: { taskId_phaseType: { taskId: task.id, phaseType } },
        create: {
          taskId: task.id,
          phaseType,
          status,
          ...(status === "IN_PROGRESS" ? { startedAt: new Date() } : {}),
          ...(status === "COMPLETE" ? { completedAt: new Date() } : {}),
        },
        update: {
          status,
          startedAt: status === "NOT_STARTED" ? null : new Date(),
          completedAt: status === "COMPLETE" ? new Date() : null,
        },
      });
    }

    return task;
  });
}

async function main() {
  const ceo = await prisma.user.upsert({
    where: { email: "ceo@command-center.local" },
    create: { email: "ceo@command-center.local", displayName: "مدیرعامل", role: "CEO" },
    update: { displayName: "مدیرعامل", role: "CEO", archivedAt: null },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@command-center.local" },
    create: { email: "manager@command-center.local", displayName: "مدیر شاطی", role: "MANAGER" },
    update: { displayName: "مدیر شاطی", role: "MANAGER", archivedAt: null },
  });
  const member = await prisma.user.upsert({
    where: { email: "member@command-center.local" },
    create: { email: "member@command-center.local", displayName: "عضو نیوکاش", role: "MEMBER" },
    update: { displayName: "عضو نیوکاش", role: "MEMBER", archivedAt: null },
  });

  const newcash = await prisma.project.upsert({
    where: { code: "newcash" },
    create: { name: "نیوکاش", code: "newcash", createdById: ceo.id },
    update: { name: "نیوکاش", archivedAt: null },
  });
  const shati = await prisma.project.upsert({
    where: { code: "shati" },
    create: { name: "شاطی", code: "shati", createdById: ceo.id },
    update: { name: "شاطی", archivedAt: null },
  });
  await prisma.project.upsert({
    where: { code: "taraz" },
    create: { name: "تراز", code: "taraz", createdById: ceo.id },
    update: { name: "تراز", archivedAt: null },
  });

  const newcashTeam = await prisma.team.upsert({
    where: { slug: "newcash" },
    create: { name: "نیوکاش", slug: "newcash", projectId: newcash.id },
    update: { name: "نیوکاش", projectId: newcash.id, archivedAt: null },
  });
  const shatiTeam = await prisma.team.upsert({
    where: { slug: "shati" },
    create: { name: "شاطی", slug: "shati", projectId: shati.id },
    update: { name: "شاطی", projectId: shati.id, archivedAt: null },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: newcashTeam.id, userId: ceo.id } },
    create: { teamId: newcashTeam.id, userId: ceo.id, role: "CEO" },
    update: { role: "CEO", archivedAt: null },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: newcashTeam.id, userId: member.id } },
    create: { teamId: newcashTeam.id, userId: member.id, role: "MEMBER" },
    update: { role: "MEMBER", archivedAt: null },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: shatiTeam.id, userId: ceo.id } },
    create: { teamId: shatiTeam.id, userId: ceo.id, role: "CEO" },
    update: { role: "CEO", archivedAt: null },
  });
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: shatiTeam.id, userId: manager.id } },
    create: { teamId: shatiTeam.id, userId: manager.id, role: "MANAGER" },
    update: { role: "MANAGER", archivedAt: null },
  });

  const backlog = await prisma.backlogItem.upsert({
    where: { projectId_title: { projectId: newcash.id, title: "مرکز فرماندهی" } },
    create: {
      projectId: newcash.id,
      teamId: newcashTeam.id,
      createdById: ceo.id,
      title: "مرکز فرماندهی",
      description: "بک‌لاگ محصول برای راه‌اندازی مرکز فرماندهی.",
      priority: "HIGH",
      position: 1,
    },
    update: { status: "BACKLOG", archivedAt: null, priority: "HIGH", position: 1 },
  });
  const sprint = await prisma.sprint.upsert({
    where: { projectId_name: { projectId: newcash.id, name: "اسپرینت راه‌اندازی" } },
    create: {
      projectId: newcash.id,
      teamId: newcashTeam.id,
      name: "اسپرینت راه‌اندازی",
      goal: "راه‌اندازی پایه دامنه مرکز فرماندهی",
      status: "ACTIVE",
      startDate: new Date("2026-09-07T00:00:00.000Z"),
      endDate: new Date("2026-09-20T00:00:00.000Z"),
    },
    update: { status: "ACTIVE", archivedAt: null },
  });

  await upsertTaskWithPhases({
    projectId: newcash.id,
    teamId: newcashTeam.id,
    sprintId: sprint.id,
    backlogItemId: backlog.id,
    createdById: ceo.id,
    assigneeId: member.id,
    title: "تعریف چشم‌انداز محصول",
    description: "هدف‌ها و دامنه نسخه نخست را نهایی کن.",
    priority: "HIGH",
    activePhase: "PRODUCT",
  });
  await upsertTaskWithPhases({
    projectId: shati.id,
    teamId: shatiTeam.id,
    createdById: ceo.id,
    assigneeId: manager.id,
    title: "طراحی داشبورد شاطی",
    description: "طرح داشبورد عملیاتی شاطی را تکمیل کن.",
    priority: "HIGH",
    activePhase: "DESIGN",
  });
  await upsertTaskWithPhases({
    projectId: newcash.id,
    teamId: newcashTeam.id,
    sprintId: sprint.id,
    backlogItemId: backlog.id,
    createdById: ceo.id,
    assigneeId: member.id,
    title: "پیاده‌سازی مدل دامنه",
    description: "مدل‌های پروژه و گردش‌کار فازها را پیاده‌سازی کن.",
    priority: "URGENT",
    activePhase: "DEVELOPMENT",
  });
  await upsertTaskWithPhases({
    projectId: shati.id,
    teamId: shatiTeam.id,
    createdById: ceo.id,
    assigneeId: manager.id,
    title: "بازبینی تحویل",
    description: "تحویل اسپرینت و شواهد پذیرش را بازبینی کن.",
    priority: "MEDIUM",
    activePhase: "DELIVERY",
  });

  await prisma.goal.upsert({
    where: { projectId_title: { projectId: newcash.id, title: "شفافیت اجرای پروژه" } },
    create: { projectId: newcash.id, teamId: newcashTeam.id, ownerId: ceo.id, title: "شفافیت اجرای پروژه", status: "IN_PROGRESS" },
    update: { status: "IN_PROGRESS", archivedAt: null },
  });
  await prisma.risk.upsert({
    where: { projectId_title: { projectId: newcash.id, title: "تغییر دامنه در اسپرینت" } },
    create: { projectId: newcash.id, teamId: newcashTeam.id, title: "تغییر دامنه در اسپرینت", priority: "HIGH", mitigation: "دامنه هر اسپرینت را قبل از شروع تثبیت کن." },
    update: { archivedAt: null, priority: "HIGH" },
  });
  await prisma.issue.upsert({
    where: { projectId_title: { projectId: shati.id, title: "ابهام در معیار پذیرش" } },
    create: { projectId: shati.id, teamId: shatiTeam.id, title: "ابهام در معیار پذیرش", priority: "MEDIUM" },
    update: { archivedAt: null, priority: "MEDIUM" },
  });
  await prisma.decision.upsert({
    where: { projectId_title: { projectId: newcash.id, title: "استفاده از فازهای ثابت" } },
    create: { projectId: newcash.id, teamId: newcashTeam.id, createdById: ceo.id, title: "استفاده از فازهای ثابت", outcome: "برای هر کار PRODUCT، DESIGN، DEVELOPMENT و DELIVERY ایجاد می‌شود.", status: "ACCEPTED" },
    update: { status: "ACCEPTED", archivedAt: null },
  });

  const existingAudit = await prisma.auditEvent.findFirst({ where: { action: "SEED_COMPLETED", targetId: "command-center-seed" } });
  if (!existingAudit) {
    await prisma.auditEvent.create({
      data: { actorId: ceo.id, projectId: newcash.id, action: "SEED_COMPLETED", targetType: "Seed", targetId: "command-center-seed" },
    });
  }
}

main()
  .then(() => console.log("Command center seed completed."))
  .finally(async () => prisma.$disconnect());
