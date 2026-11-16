// 生成 README 的机制表与数字表：数据只来自 src/data.ts，不手抄。
// 用法：node scripts/readme-tables.mjs   （把输出贴进 README.md 对应位置）
import { FAMILY_COUNTS, GROUPS, MODEL_COUNT, REFS } from "../src/data.ts";

// Day 主题的数据色（与页面一致）
const HEX = { l0: "56637a", l1: "0a5fae", l2: "6248cc", l3: "7a5a00", l4: "a8430c", l5: "b62a36", l6: "096b4a", l7: "a82d83" };
const CODE = { linear: "LIN", swa: "WIN", sparse: "SPA", full: "FULL", reuse: "REUSE", compress: "KVC", ssm: "SSM" };

const rows = FAMILY_COUNTS.map(({ fam, groups, latest }) => {
  const chip = `![${CODE[fam.id]}](https://img.shields.io/badge/${CODE[fam.id]}-%20-${HEX[fam.c]}?style=flat-square&labelColor=111723)`;
  return `| ${chip}<br>${fam.name}<br><sub>${fam.en}</sub> | 用过 **${groups}** · 最新 **${latest}**<br><sub>used ${groups} · latest ${latest}</sub> |`;
});
console.log("| 机制 Mechanism | 组数 Families |");
console.log("|---|---|");
console.log(rows.join("\n"));
console.log();
console.log(`| **${GROUPS.length}** | **${MODEL_COUNT}** | **${REFS.length}** |`);
console.log("|:---:|:---:|:---:|");
console.log("| 组模型<br><sub>model families</sub> | 个模型版本<br><sub>model versions</sub> | 篇参考资料<br><sub>references</sub> |");
