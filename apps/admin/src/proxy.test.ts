import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { config } from "./proxy";

describe("admin proxy", () => {
  it("covers every organization-scoped route", () => {
    expect(config).toEqual({ matcher: ["/:organizationSlug/:path*"] });
  });
});
