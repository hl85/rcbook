import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ["out/**", "dist/**", "**/*.d.ts", "webpack.config.js", "*.js"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
        "@typescript-eslint/naming-convention": [
            "warn",
            {
                "selector": "default",
                "format": ["camelCase"]
            },
            {
                "selector": "variable",
                "format": ["camelCase", "PascalCase", "UPPER_CASE"]
            },
            {
                "selector": "function",
                "format": ["camelCase", "PascalCase"]
            },
            {
                "selector": "parameter",
                "format": ["camelCase"],
                "leadingUnderscore": "allow"
            },
            {
                "selector": "memberLike",
                "modifiers": ["private"],
                "format": ["camelCase"],
                "leadingUnderscore": "allow"
            },
            {
                "selector": "typeLike",
                "format": ["PascalCase"]
            },
            {
                "selector": "objectLiteralProperty",
                "format": null
            },
            {
                "selector": "enumMember",
                "format": ["PascalCase", "UPPER_CASE"]
            },
            {
                "selector": "import",
                "format": ["camelCase", "PascalCase"]
            }
        ],
        // "@typescript-eslint/semi": "warn",
        "curly": "warn",
        "eqeqeq": "warn",
        "no-throw-literal": "warn",
        "semi": "off",
        // Disable some recommended rules that might be annoying if they weren't enabled before
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "warn"
    }
  },
  {
    files: ["src/test/**/*.ts", "src/test/**/*.tsx"],
    rules: {
        "@typescript-eslint/no-require-imports": "off"
    }
  }
);
