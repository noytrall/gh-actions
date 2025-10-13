// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    ignores: [".stryker-tmp"],
  },
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      vitest,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        defaultProject: "./tsconfig.json",
      },
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    settings: {
      vitest: {
        typecheck: true,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "@typescript-eslint/array-type": "error",
    },
  },
  {
    rules: {
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
    },
  },
  {
    files: ["integration-tests/support/**/*"],
    rules: {
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/only-throw-error": "off",
    },
  },
  {
    files: ["integration-tests/test-suites/*.test.ts", "cdk/**/*.test.ts"],
    rules: {
      "vitest/expect-expect": "off",
    },
  },
  {
    files: ["integration-tests/test-suites/*.test.ts"],
    rules: {
      "vitest/prefer-strict-equal": "off",
    },
  },
  {
    rules: {
      "vitest/prefer-expect-assertions": "off",
      "vitest/prefer-importing-jest-globals": "off",
      "vitest/no-hooks": "off",
      "vitest/prefer-lowercase-title": "off",
      "vitest/max-expects": "off",
      "vitest/no-untyped-mock-factory": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
);
