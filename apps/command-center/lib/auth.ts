import { compare } from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { AUTH_COOKIE_NAME, createSessionToken, verifySessionToken } from "./session";

export { AUTH_COOKIE_NAME, createSessionToken, verifySessionToken } from "./session";

export type SessionUser = {
  userId: string;
  email: string;
  displayName: string;
  role: Role;
  teamIds: string[];
  projectIds: string[];
};

type UserWithMemberships = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  passwordHash: string;
  archivedAt: Date | null;
  teamMemberships: Array<{ teamId: string; team: { projectId: string } }>;
};

function toSessionUser(user: UserWithMemberships): SessionUser {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    teamIds: user.teamMemberships.map((membership) => membership.teamId),
    projectIds: [...new Set(user.teamMemberships.map((membership) => membership.team.projectId))],
  };
}

export async function authenticateWithPassword(email: string, password: string): Promise<SessionUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { teamMemberships: { where: { archivedAt: null }, include: { team: { select: { projectId: true } } } } },
  }) as UserWithMemberships | null;
  if (!user || user.archivedAt || !(await compare(password, user.passwordHash))) return null;
  return toSessionUser(user);
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))?.slice(AUTH_COOKIE_NAME.length + 1);
  if (!token) throw new Error("Unauthorized session");
  const payload = await verifySessionToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { teamMemberships: { where: { archivedAt: null }, include: { team: { select: { projectId: true } } } } },
  }) as UserWithMemberships | null;
  if (!user || user.archivedAt) throw new Error("Unauthorized session");
  return toSessionUser(user);
}
