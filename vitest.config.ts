import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    setupFiles: ["./tests/setup/vitest-setup.ts"],
    include: [
      "tests/unit/**/*.{test,spec}.ts",
      "tests/integration/**/*.{test,spec}.ts",
      "tests/api/**/*.{test,spec}.ts",
    ],
    exclude: ["node_modules", "deploy", ".next", "e2e"],
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/validations.ts",
        "src/lib/observability/constants.ts",
        "src/lib/observability/request-id.ts",
        "src/lib/observability/context.ts",
        "src/lib/observability/alerts.ts",
        "src/lib/observability/health.ts",
        "src/lib/auth/phone-number.ts",
        "src/lib/auth/password-reset.ts",
        "src/lib/auth/password-reset-constants.ts",
        "src/lib/assignments/deadline.ts",
        "src/lib/attendance/qr-rotation.ts",
        "src/lib/attendance/constants.ts",
        "src/lib/subscription/constants.ts",
        "src/lib/subscription/payment-currency.ts",
        "src/lib/security/zod-helpers.ts",
        "src/lib/security/rate-limit.ts",
        "src/lib/security/rate-limit-policies.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/node_modules/**",
        "**/deploy/**",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
      thresholds: {
        lines: 65,
        functions: 45,
        branches: 55,
        statements: 65,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/setup/mocks/server-only.ts"),
    },
  },
});
