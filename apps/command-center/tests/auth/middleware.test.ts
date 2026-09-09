import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createSessionToken, AUTH_COOKIE_NAME } from "../../lib/auth";
import middleware from "../../middleware";

describe("command-center middleware", () => {
  it("redirects an unauthenticated page to login", async () => {
    const response = await middleware(new NextRequest("http://localhost/command-center"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("leaves login and auth routes public", async () => {
    await expect(middleware(new NextRequest("http://localhost/login"))).resolves.toMatchObject({ status: 200 });
    await expect(middleware(new NextRequest("http://localhost/api/auth/login"))).resolves.toMatchObject({ status: 200 });
  });

  it("allows a valid session to reach a protected page", async () => {
    process.env.AUTH_SESSION_SECRET = "test-session-secret";
    const token = await createSessionToken("user-1");
    const request = new NextRequest("http://localhost/command-center", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    });
    await expect(middleware(request)).resolves.toMatchObject({ status: 200 });
  });
});
