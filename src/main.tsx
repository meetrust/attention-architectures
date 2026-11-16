import * as React from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

// 字体样式表单独成块，与脚本并行加载；加载前先用 PingFang SC 等系统字体。
// Artifact 版本（--mode artifact）改用 Google Fonts 样式表：claude.ai 的页面只允许从那里加载字体。
if (import.meta.env.MODE !== "artifact") void import("./fonts.css");
import { applyTheme } from "./kumo-ts/theme";
import { App } from "./App";

// 本页只用 Day（白昼）主题，属性放在 <body> 上（与 index.html 一致）：
// claude.ai 的 Artifact 会在 <html> 上写自己的 data-theme="dark" / "light"，写在 html 上的 day 会被顶掉。
applyTheme("day", document.body);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
