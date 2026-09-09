import { NextResponse } from "next/server";
import { authenticateWithPassword, createSessionToken, AUTH_COOKIE_NAME } from "../../../../lib/auth";
import { sessionCookieOptions } from "../../../../lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const user = body?.email && body.password ? await authenticateWithPassword(body.email, body.password) : null;
  if (!user) return NextResponse.json({ error: "ایمیل یا رمز عبور نادرست است" }, { status: 401 });
  const response = NextResponse.json({ user });
  response.cookies.set(AUTH_COOKIE_NAME, await createSessionToken(user.userId), sessionCookieOptions());
  return response;
}
