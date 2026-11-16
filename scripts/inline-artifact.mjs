// 把 `vite build --mode artifact` 的产物内联成单个 HTML，供发布到 claude.ai Artifact。
// 用法：npm run build:artifact  →  dist-artifact/attention-architectures.html
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "dist-artifact";
let html = readFileSync(join(dir, "index.html"), "utf8");
const assets = readdirSync(join(dir, "assets"));
if (assets.filter((f) => f.endsWith(".js")).length !== 1 || assets.filter((f) => f.endsWith(".css")).length !== 1) {
  throw new Error(`expected exactly one JS and one CSS file, got: ${assets.join(", ")}`);
}

html = html.replace(/<script type="module" crossorigin src="\.\/assets\/([^"]+\.js)"><\/script>/, (_, f) => {
  const js = readFileSync(join(dir, "assets", f), "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/assets\/([^"]+\.css)">/, (_, f) => {
  const css = readFileSync(join(dir, "assets", f), "utf8").replace(/<\/style/gi, "<\\/style");
  return `<style>${css}</style>`;
});
if (/\.\/assets\//.test(html)) throw new Error("an asset reference was not inlined");

const out = join(dir, "attention-architectures.html");
writeFileSync(out, html);
console.log(`${out}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KiB`);
