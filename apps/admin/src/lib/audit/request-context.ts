import { createHmac, randomUUID } from "node:crypto";
import { headers } from "next/headers";

export type RequestContext = {
  requestId: string;
  ipHash: string | null;
  userAgent: string | null;
};

function getClientIp(requestHeaders: Headers) {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null;

  return (
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("cf-connecting-ip") ??
    null
  );
}

function hashIp(ip: string | null) {
  if (!ip) return null;

  return createHmac(
    "sha256",
    process.env.AUTH_SECRET ?? "simple-dashboard-audit-ip-fallback",
  )
    .update(ip)
    .digest("hex");
}

export async function getRequestContext(): Promise<RequestContext> {
  try {
    const requestHeaders = await headers();

    return {
      requestId: requestHeaders.get("x-request-id") ?? randomUUID(),
      ipHash: hashIp(getClientIp(requestHeaders)),
      userAgent: requestHeaders.get("user-agent"),
    };
  } catch {
    // Unit tests and non-request server invocations have no Next request context.
    return { requestId: randomUUID(), ipHash: null, userAgent: null };
  }
}
