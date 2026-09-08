import { configDefaults, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [...configDefaults.exclude, ".next/**"],
    environment: "node",
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/action-client.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*-schema.ts",
        "**/types.ts",
      ],
      thresholds: {
        perFile: true,
        statements: 80,
        branches: 70,
        functions: 85,
        lines: 80,
      },
    },
  },
});
