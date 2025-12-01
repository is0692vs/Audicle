import { dirname } from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import * as nextConfigPkg from "eslint-config-next";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  // Base recommended JS config
  js.configs.recommended,
  // Include the published ESLint flat configs from eslint-config-next
  // eslint-config-next exports an array of configs (CJS default) — support both default and named exports.
  ...(nextConfigPkg.default ?? nextConfigPkg),
  // TypeScript + React setup
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      // Keep some rules relaxed for tests and scripts, other rules are inherited from recommended configs
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "components/v0/**",
      "public/**",
      "convert-icons.js",
    ],
  },
  // テストファイルと Node スクリプトのための例外
  {
    files: [
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/tests/**/*.ts",
      "**/tests/**/*.tsx",
    ],
    rules: {
      // テストファイルでは暗黙の any を許可
      "@typescript-eslint/no-explicit-any": "off",
      // require() を使うテストがあるため許可
      "@typescript-eslint/no-require-imports": "off",
    },
    languageOptions: {
      globals: {
        jest: true,
        describe: true,
        it: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
      },
    },
  },
  {
    files: ["scripts/**/*.js", "jest.config.js"],
    rules: {
      // Node スクリプトおよび設定ファイルで require を許可
      "@typescript-eslint/no-require-imports": "off",
      // スクリプトはJSなので any も許容
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
