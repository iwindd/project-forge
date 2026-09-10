import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`redirect:${target}`);
  }),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import AdminMainLayout from "./layout";

describe("legacy admin main layout", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.redirect.mockClear();
  });

  it("redirects authenticated legacy pages to the account surface", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-id" } });

    await expect(AdminMainLayout()).rejects.toThrow("redirect:/account");

    expect(mocks.auth).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/account");
  });

  it("keeps unauthenticated legacy pages on the login route", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(AdminMainLayout()).rejects.toThrow("redirect:/admin/login");

    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });
});
