/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    // ---- API / server-side tests (Node environment) ----
    {
      displayName: "api",
      preset: "ts-jest",
      testEnvironment: "node",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
      testMatch: ["**/__tests__/api.test.ts"],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          { tsconfig: "tsconfig.json" },
        ],
      },
      setupFiles: ["<rootDir>/__tests__/setup-fetch.ts"],
    },
    // ---- Component tests (jsdom environment) ----
    {
      displayName: "components",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
      },
      testMatch: ["**/__tests__/components/**/*.test.tsx"],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            tsconfig: "tsconfig.jest.json",
          },
        ],
      },
    },
  ],
};
