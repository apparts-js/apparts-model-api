import setupTest_ from "@apparts/backend-test";

export const setupTest = (options) =>
  setupTest_({
    apiVersion: 1,
    ...options,
    vitest: true,
  });
