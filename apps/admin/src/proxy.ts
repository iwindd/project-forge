import { NextResponse } from "next/server";

/**
 * Authentication is validated by the API-backed server layouts. The proxy
 * must always return a Response; it cannot return the session object from
 * `auth()`.
 */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/:organizationSlug/:path*"],
};
