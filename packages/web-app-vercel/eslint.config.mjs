import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Re-add 'next/typescript' — this pulls in @typescript-eslint rules required
  // by our project (we also pin eslint-config-next to avoid circular issues).
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
