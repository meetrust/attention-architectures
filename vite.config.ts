import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { DATA_DATE, GROUPS, REFS, SOURCE_TITLE } from "./src/data.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * 把原表写进 <noscript>：脚本被禁用或加载失败时，页面仍能以表格和列表读到全部数据。
 * 数据来自 src/data.ts，与页面同源，不手写。
 */
function noscriptTable(): Plugin {
  return {
    name: "noscript-table",
    transformIndexHtml(html) {
      const rows = GROUPS.map((g) => {
        const arch = g.versions.map((v) => `${esc(v.name)}：${esc(v.arch)}`).join("<br>");
        const route = g.stages.map((s) => esc(s.route)).join(" → ");
        const refs = [...new Set(g.versions.flatMap((v) => v.refs))].map((n) => `[${String(n).padStart(2, "0")}]`).join(" ");
        return `<tr><th scope="row">${g.no} ${esc(g.title)}</th><td>${arch}</td><td>${route}</td><td>${refs}</td></tr>`;
      }).join("");
      const refs = REFS.map((r) => `<li><a href="${esc(r.url)}">${esc(r.title)}｜${esc(r.kind)}</a> · ${esc(r.src)}</li>`).join("");
      const block =
        `<noscript><main class="noscript"><h1>${esc(SOURCE_TITLE)}</h1>` +
        `<p>交互图表需要 JavaScript。下面是原表与参考资料，数据核对于 ${DATA_DATE}。</p>` +
        `<table><thead><tr><th>厂商 / 模型</th><th>Attention 架构</th><th>技术路线</th><th>参考文献</th></tr></thead><tbody>${rows}</tbody></table>` +
        `<h2>参考资料</h2><ol>${refs}</ol></main></noscript>`;
      return html.replace("<!--noscript-->", block);
    },
  };
}

/** Artifact 版本：字体走 Google Fonts（claude.ai 页面的内容安全策略只放行 fonts.googleapis.com / fonts.gstatic.com）。 */
function googleFonts(): Plugin {
  const href = "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Noto+Sans+SC:wght@400;500;700;900&display=swap";
  return {
    name: "google-fonts",
    transformIndexHtml: (html) =>
      html.replace("</title>", `</title>\n    <link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link rel="stylesheet" href="${href}" />`),
  };
}

export default defineConfig(({ mode }) => {
  const artifact = mode === "artifact";
  return {
    base: "./",
    plugins: [react(), tailwindcss(), noscriptTable(), ...(artifact ? [googleFonts()] : [])],
    build: {
      target: ["es2022", "safari16"],
      chunkSizeWarningLimit: 1200,
      // Artifact 版本只输出一个 JS 与一个 CSS，再由 scripts/inline-artifact.mjs 内联成单个 HTML
      ...(artifact ? { outDir: "dist-artifact", cssCodeSplit: false, assetsInlineLimit: 100_000_000, modulePreload: false } : {}),
    },
  };
});
