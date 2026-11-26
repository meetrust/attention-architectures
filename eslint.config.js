// ESLint：只跑 Tight Surface 的 Kumo 规则（src/kumo-ts/eslint-rules.js，取自 Design System「Tight Surface」project/kumo/）。
// 规则禁止 Kumo 的图表等组件、强调 / 危险按钮绕过 TsButton、Badge 不写 variant，以及引入 lucide-react 以外的图标库。
import tseslint from "typescript-eslint";
import { kumoTightSurface } from "./src/kumo-ts/eslint-rules.js";

export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  kumoTightSurface,
];
