import { NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "./lib/auth.js";

export const config = {
  matcher: ["/dashboard/:path*"],
};

export async function middleware(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}
