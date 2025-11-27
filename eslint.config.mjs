import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific ignores (legacy or generated)
    "project-output/**",
    "scripts/**",
    "lib/rag/**",
    "lib/tools/**",
    "app/api/discovery/**",
    "lib/llm/claude-client.ts",
    "test/**",
    "lib/redis/**",
    "app/api/tool-approval/**",
    "lib/analytics/**",
    "lib/design/**",
    "lib/documentation/**",
    "lib/security/**",
    "lib/llm/stream-client.ts",
    "lib/sandbox/container-executor.ts",
    "lib/sandbox/docker-manager.ts",
    "**/lib/dashboard/**",
    "lib/sandbox/screenshot-capture.ts",
  ]),
]);

export default eslintConfig;
