import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler–oriented rules: enable only where violations are fixed
      // and behaviour-preserving. Keep intentional patterns off for now.
      "react-hooks/error-boundaries": "error",
      "react-hooks/incompatible-library": "error",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
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
