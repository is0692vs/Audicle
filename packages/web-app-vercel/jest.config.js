const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^until-async$": "<rootDir>/__mocks__/until-async.js",
  },
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/tests/e2e/",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(msw|@mswjs|@bundled-es-modules|until-async|strict-event-emitter|@open-draft)/)",
  ],
  collectCoverageFrom: [
    "app/**/*.{js,jsx,ts,tsx}",
    "lib/**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!**/tests/**",
  ],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 9,
      functions: 9,
<<<<<<< HEAD
      lines: 14,
      statements: 14,
    },
  },
  testTimeout: 10000,
=======
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
  testTimeout: 10000, // 10秒タイムアウト
>>>>>>> af36a1eb9c3d7efcc9ec3077eb2a227404a911bb
};

module.exports = createJestConfig(customJestConfig);
