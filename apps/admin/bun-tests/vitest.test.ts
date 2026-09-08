import { test } from "bun:test";

test("runs the Vitest suite", () => {
  const result = Bun.spawnSync([process.execPath, "x", "vitest", "run"], {
    cwd: process.cwd(),
    stderr: "inherit",
    stdout: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`Vitest exited with code ${result.exitCode}`);
  }
}, 30000);
