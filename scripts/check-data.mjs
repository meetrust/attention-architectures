// 数据自检：层序条码与原文给出的层数一致、编号连续、参考文献全部被引用。
// 用法：npm run check（Node 22.18+ 可直接读取 src/data.ts 的类型注解）
import { GROUPS, REFS, STACKED, VERSIONS, MODEL_COUNT, stackCounts } from "../src/data.ts";

const errors = [];
const expect = (ok, msg) => { if (!ok) errors.push(msg); };

expect(GROUPS.length === 11, `应为 11 组，实际 ${GROUPS.length}`);
expect(REFS.length === 22, `应为 22 篇参考资料，实际 ${REFS.length}`);
expect(MODEL_COUNT === 22, `应为 22 个模型版本，实际 ${MODEL_COUNT}`);
GROUPS.forEach((g, i) => expect(g.no === String(i + 1).padStart(2, "0"), `组编号不连续：${g.no}`));
REFS.forEach((r, i) => expect(r.no === i + 1, `参考文献编号不连续：${r.no}`));

const used = new Set(VERSIONS.flatMap((v) => v.refs));
REFS.forEach((r) => expect(used.has(r.no), `参考文献 [${r.no}] 没有被任何版本引用`));

for (const g of GROUPS) {
  const inStages = g.stages.flatMap((s) => s.versions);
  expect(inStages.length === g.versions.length && g.versions.every((v) => inStages.includes(v.id)), `${g.title}：技术路线与版本对不上`);
}

for (const v of STACKED) {
  const c = stackCounts(v.stack);
  expect(JSON.stringify(c) === JSON.stringify(v.stack.stated), `${v.name}：层序计数 ${c} 与原文 ${v.stack.stated} 不一致`);
}
const k3 = STACKED.find((v) => v.id === "kimi-k3").stack;
expect(k3.seq.length === 93 && k3.seq.slice(-2).every((x) => k3.kinds[x].fam === "full"), "Kimi K3：最后两层应为 MLA");
const glm = STACKED.find((v) => v.id === "glm-5.3-flash").stack;
expect(glm.seq.length === 45 && glm.kinds[glm.seq[44]].label === "KDA", "GLM-5.3-Flash：末尾应另有 1 层 KDA");
const step = STACKED.find((v) => v.id === "step-3.5-flash").stack;
expect(step.seq.length === 45 && step.kinds[step.seq[0]].label === "Full", "Step 3.5 Flash：首层应为 Full");
const mimo = STACKED.find((v) => v.id === "mimo-v2-flash").stack;
expect(mimo.seq.length === 48 && mimo.kinds[mimo.seq[0]].label === "Global", "MiMo-V2-Flash：首层应为 Global");

if (errors.length) {
  console.error(errors.map((e) => "ERROR " + e).join("\n"));
  process.exit(1);
}
console.log(`data ok: ${GROUPS.length} groups, ${MODEL_COUNT} models, ${REFS.length} refs, ${STACKED.length} layer stacks`);
