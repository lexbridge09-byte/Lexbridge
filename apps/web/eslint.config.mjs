import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // One dropdown everywhere: raw <select> renders the OS list. Use Select / SelectField / SelectMenu.
  {
    files: ["src/**/*.js"],
    ignores: ["src/components/selectMenu.js"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Use Select, SelectField or SelectMenu (@/components/selectMenu) so every dropdown shares one design.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
