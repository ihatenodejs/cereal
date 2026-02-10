import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      ".git/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.config.js",
      "bun.lockb",
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // Global configuration
  {
    languageOptions: {
      globals: {
        // Bun globals
        Bun: "readonly",
        // Node/Browser globals
        console: "readonly",
        process: "readonly",
      },
    },

    plugins: {
      import: importPlugin,
    },

    rules: {
      // ============================================
      // TypeScript Rules - Strict but Appropriate
      // ============================================

      // Type safety
      "@typescript-eslint/no-explicit-any": "error",

      // Require return types for exported functions only
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/explicit-function-return-type": "off",

      // Unused variables - allow with underscore prefix
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      // ============================================
      // Import/Export Rules
      // ============================================

      // Import order and sorting
      "import/order": [
        "error",
        {
          groups: [
            "builtin", // Built-in imports (Node.js)
            "external", // External packages
            "internal", // Internal absolute imports
            ["parent", "sibling"], // Relative imports
            "index", // Index imports
            "type", // Type imports
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      "import/no-duplicates": "error",
      "import/no-unresolved": "off", // Bun handles module resolution
      "import/extensions": "off", // Allow both with and without extensions

      // ============================================
      // General Best Practices
      // ============================================

      // Code quality
      "no-console": "off", // Console allowed
      "no-var": "error",
      "prefer-const": "error",
      "prefer-arrow-callback": "error",
      "no-duplicate-imports": "off", // Handled by import/no-duplicates
      "no-unused-expressions": "error",

      // Consistent code style
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // Async/await best practices
      "require-await": "off",
      "no-return-await": "off",

      // Object/Array style
      "object-shorthand": ["error", "always"],
      "prefer-template": "error",
      "prefer-destructuring": [
        "error",
        {
          array: false,
          object: true,
        },
      ],
    },
  },

  // Specific overrides for JavaScript files
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Specific overrides for browser scripts
  {
    files: ["**/templates/**/*.js"],
    languageOptions: {
      globals: {
        window: "readonly",
        SwaggerUIBundle: "readonly",
        SwaggerUIStandalonePreset: "readonly",
      },
    },
  },

  // Disable Prettier conflicts
  eslintConfigPrettier,
);
