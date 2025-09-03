import vitest from "@vitest/eslint-plugin";
import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslintConfigPrettier,
  {
    files: [
      "*.test.ts",
      "*.test.js",
      "*-test.js",
      "**/mock*.ts",
      "**/mock*.js",
      "**/__mocks__/**",
      "**/tests/**",
      "**/fakeData/**",
    ],
    plugins: { vitest },
    // languageOptions: {
    //   globals: vitest.environments.globals.globals,
    // },
    rules: {
      "no-restricted-globals": ["warn", "console"],
      "vitest/no-disabled-tests": "warn",
      "vitest/no-focused-tests": "error",
      "vitest/no-identical-title": "error",
      "vitest/prefer-to-have-length": "warn",
      "vitest/valid-expect": "error",
      "vitest/expect-expect": [
        "error",
        {
          assertFunctionNames: [
            "expect",
            "allChecked",
            "requestCheck",
            "getTestAuth",
            "checkResult",
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-restricted-globals": ["warn", "console"],
      "no-var": "error",
      "prefer-const": "error",
      "no-unneeded-ternary": "error",
      "prefer-arrow-callback": "error",
      "no-lonely-if": "error",
      // consistent-return not needed due to noImplicitReturns enabled in tsconfig
      "consistent-return": "off",
      curly: "error",
      indent: "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/indent": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-invalid-void-type": [
        "error",
        {
          allowAsThisParameter: true,
        },
      ],
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: [
      "dist/*",
      "build/*",
      "config/*",
      "eslint-ci.config.mjs",
      "eslint.config.mjs",
    ],
  }
);
