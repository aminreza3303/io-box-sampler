import { beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "bcryptjs";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("../../lib/db", () => ({ prisma }));

import {
  AUTH_COOKIE_NAME,
  authenticateWithPassword,
  createSessionToken,
  requireUser,
  verifySessionToken,
} from "../../lib/auth";
import { POST as login } from "../../app/api/auth/login/route";

const userRecord = {
  id: "user-1",
  email: "ceo@command-center.local",
  displayName: "مدیرعامل",
  role: "CEO" as const,
  passwordHash: "",
  teamMemberships: [
    { teamId: "team-1", team: { projectId: "project-1" } },
  ],
  archivedAt: null,
};

describe("local authentication", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    process.env.AUTH_SESSION_SECRET = "test-session-secret";
    userRecord.passwordHash = await hash("correct horse battery staple", 4);
    prisma.user.findUnique.mockResolvedValue(userRecord);
  });

  it("authenticates a valid password without returning the password hash", async () => {
    const user = await authenticateWithPassword(
      " CEO@COMMAND-CENTER.LOCAL ",
      "correct horse battery staple",
    );

    expect(user).toEqual({
      userId: "user-1",
      email: "ceo@command-center.local",
      displayName: "مدیرعامل",
      role: "CEO",
      teamIds: ["team-1"],
      projectIds: ["project-1"],
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rejects an invalid password and archived user", async () => {
    await expect(authenticateWithPassword(userRecord.email, "wrong password")).resolves.toBeNull();
    prisma.user.findUnique.mockResolvedValue({ ...userRecord, archivedAt: new Date() });
    await expect(authenticateWithPassword(userRecord.email, "correct horse battery staple")).resolves.toBeNull();
  });

  it("rejects malformed, expired, and tampered session tokens", async () => {
    const token = await createSessionToken("user-1", Date.now() - 10_000);
    await expect(verifySessionToken(token)).rejects.toThrow("session");
    await expect(verifySessionToken("not-a-session")).rejects.toThrow("session");

    const valid = await createSessionToken("user-1");
    const tampered = `${valid.slice(0, -1)}${valid.endsWith("a") ? "b" : "a"}`;
    await expect(verifySessionToken(tampered)).rejects.toThrow("session");
  });

  it("requires a valid server-side session and reloads the public user", async () => {
    const token = await createSessionToken("user-1");
    const request = new NextRequest("http://localhost/command-center", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    });

    await expect(requireUser(request)).resolves.toMatchObject({
      userId: "user-1",
      role: "CEO",
    });
    expect(await requireUser(request)).not.toHaveProperty("passwordHash");
  });

  it("sets a signed HTTP-only session cookie on valid login", async () => {
    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: userRecord.email, password: "correct horse battery staple" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: {
        userId: "user-1",
        email: userRecord.email,
        displayName: "مدیرعامل",
        role: "CEO",
        teamIds: ["team-1"],
        projectIds: ["project-1"],
      },
    });
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(cookie?.toLowerCase()).toContain("httponly");
    expect(cookie?.toLowerCase()).toContain("samesite=lax");
  });
});
