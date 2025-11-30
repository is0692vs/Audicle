const baseConfig = require("./jest.config.js");

module.exports = async () => {
  const resolvedConfig = await baseConfig();

  return {
    ...resolvedConfig,
    testEnvironment: "node",
    testMatch: ["**/app/api/**/__tests__/**/*.test.ts"],
    collectCoverageFrom: [
      "app/api/**/*.{js,jsx,ts,tsx}",
      "!**/*.d.ts",
      "!**/node_modules/**",
      "!**/.next/**",
      "!**/coverage/**",
      "!**/tests/**",
    ],
    coverageThreshold: {},
  };
};
