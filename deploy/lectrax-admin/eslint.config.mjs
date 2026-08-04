import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ESLint 10 + eslint-config-next stopgaps until eslint-plugin-react ships
 * native v10 support (jsx-eslint/eslint-plugin-react#3979 / vercel/next.js#89764):
 * - Pin React version so plugin-react skips context.getFilename() auto-detect.
 * - Use @typescript-eslint/parser for JS/MJS so Babel's pre-v10 scope manager
 *   is not used (ScopeManager#addGlobals).
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    settings: {
      react: { version: "19" },
    },
    rules: {
      // React Compiler–oriented rules (eslint-plugin-react-hooks / Next 16).
      "react-hooks/error-boundaries": "error",
      "react-hooks/incompatible-library": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "react-hooks/immutability": "error",
      "react-hooks/preserve-manual-memoization": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "deploy/**",
    "public/**",
    "supabase/functions/**",
    "scripts/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
