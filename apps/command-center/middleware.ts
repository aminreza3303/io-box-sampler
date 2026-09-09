import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "./lib/session";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (publicPaths.includes(pathname) || pathname.startsWith("/_next/") || pathname === "/favicon.ico") return NextResponse.next();
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  try {
    await verifySessionToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
