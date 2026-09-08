import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: vi.fn() }));

vi.mock("next/headers", () => ({ headers: mocks.headers }));

import { getRequestContext } from "./request-context";

describe("getRequestContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-audit-secret";
  });

  it("keeps request id and user agent while hashing the client IP", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        "x-request-id": "request-123",
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        "user-agent": "test-agent",
      }),
    );

    await expect(getRequestContext()).resolves.toEqual({
      requestId: "request-123",
      ipHash: createHmac("sha256", "test-audit-secret")
        .update("203.0.113.10")
        .digest("hex"),
      userAgent: "test-agent",
    });
  });

  it("returns a generated request id when no request context exists", async () => {
    mocks.headers.mockRejectedValue(new Error("outside request"));

    const result = await getRequestContext();

    expect(result.requestId).toEqual(expect.any(String));
    expect(result.ipHash).toBeNull();
    expect(result.userAgent).toBeNull();
  });

  it("falls back to proxy IP headers and preserves null when no IP exists", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        "x-real-ip": "198.51.100.20",
        "user-agent": "proxy-agent",
      }),
    );

    await expect(getRequestContext()).resolves.toEqual({
      requestId: expect.any(String),
      ipHash: createHmac("sha256", "test-audit-secret")
        .update("198.51.100.20")
        .digest("hex"),
      userAgent: "proxy-agent",
    });

    mocks.headers.mockResolvedValue(new Headers());
    await expect(getRequestContext()).resolves.toEqual({
      requestId: expect.any(String),
      ipHash: null,
      userAgent: null,
    });
  });
});
