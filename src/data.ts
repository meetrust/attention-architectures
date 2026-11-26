/**
 * data.ts · 页面唯一数据源。
 * 架构描述、技术路线与参考文献逐字取自《大模型 Attention 架构与技术路线对照》（2026-11-16）；
 * 机制分类（families）与层序图（stack）是按这些文字整理出来的，规则写在每一项的 rule 里。
 * 页面上所有计数（组数、版本数、机制出现次数、层数）都由这里计算，不手写。
 */

export const DATA_DATE = "2026-11-16";
export const SOURCE_TITLE = "大模型 Attention 架构与技术路线对照";

export type LIdx = "l0" | "l1" | "l2" | "l3" | "l4" | "l5" | "l6" | "l7";
export type FamId = "linear" | "swa" | "sparse" | "full" | "reuse" | "compress" | "ssm";

export interface Family {
  id: FamId;
  c: LIdx;
  name: string;
  short: string;
  en: string;
  desc: string;
}

/** 机制家族：同一家族在页面所有图表里用同一个数据色。顺序即图例顺序。 */
export const FAMILIES: Family[] = [
  { id: "linear", c: "l2", name: "线性注意力", short: "线性", en: "Linear attention", desc: "用固定大小的状态汇总全部历史，每一步的计算量与上下文长度无关。" },
  { id: "swa", c: "l6", name: "滑动 / 局部窗口", short: "窗口", en: "Sliding or local window", desc: "只读取最近一段窗口内的 KV，窗口外的历史不参与这一层的计算。" },
  { id: "sparse", c: "l4", name: "稀疏注意力", short: "稀疏", en: "Sparse attention", desc: "先由索引器为历史打分，只对选中的 Top-k 个 token 或块做注意力。" },
  { id: "full", c: "l0", name: "全注意力 / 全局层", short: "全局", en: "Full attention or global layers", desc: "每个 token 读取全部历史 KV 的 softmax 注意力，例如 GQA、MLA。" },
  { id: "reuse", c: "l7", name: "跨层复用", short: "复用", en: "Cross-layer reuse", desc: "多层共用同一份稀疏索引或 KV，减少逐层重复计算。" },
  { id: "compress", c: "l1", name: "KV 压缩", short: "压缩", en: "KV compression", desc: "先把 KV 按倍数压缩，再在压缩后的序列上做稀疏或密集注意力。" },
  { id: "ssm", c: "l3", name: "状态空间（SSM）", short: "SSM", en: "State space model", desc: "用 Mamba 类状态空间层替代部分注意力层。" },
];

export const FAM: Record<FamId, Family> = Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<FamId, Family>;

export interface Ref {
  no: number;
  title: string;
  kind: string;
  src: string;
  url: string;
}

export const REFS: Ref[] = [
  { no: 1, title: "Qwen3-Next", kind: "官方模型卡", src: "Qwen / Hugging Face", url: "https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct" },
  { no: 2, title: "Qwen3.5", kind: "Transformers 架构文档", src: "Hugging Face Transformers", url: "https://huggingface.co/docs/transformers/model_doc/qwen3_5" },
  { no: 3, title: "Kimi Linear", kind: "官方项目", src: "Moonshot AI / GitHub", url: "https://github.com/MoonshotAI/Kimi-Linear" },
  { no: 4, title: "Kimi K3", kind: "官方模型卡", src: "Moonshot AI / Hugging Face", url: "https://huggingface.co/moonshotai/Kimi-K3" },
  { no: 5, title: "MiniMax-Text-01", kind: "官方模型卡", src: "MiniMax / GitHub", url: "https://github.com/MiniMax-AI/MiniMax-01/blob/main/MiniMax-Text-01-Model-Card.md" },
  { no: 6, title: "MiniMax-M1", kind: "官方模型库", src: "MiniMax / GitHub", url: "https://github.com/MiniMax-AI/MiniMax-M1" },
  { no: 7, title: "MiniMax-M2", kind: "全注意力设计说明", src: "MiniMax / Hugging Face", url: "https://huggingface.co/blog/MiniMax-AI/why-did-m2-end-up-as-a-full-attention-model" },
  { no: 8, title: "MiniMax MSA", kind: "研究论文", src: "arXiv 2606.13392", url: "https://arxiv.org/abs/2606.13392" },
  { no: 9, title: "Ring-2.5-1T", kind: "官方技术说明", src: "Ant Ling", url: "https://developer.ant-ling.com/zh-CN/blogs/ring-2-5-1t-think-deep-go-far" },
  { no: 10, title: "DeepSeek-V3.2", kind: "技术论文", src: "arXiv 2512.02556", url: "https://arxiv.org/abs/2512.02556" },
  { no: 11, title: "DeepSeek-V4", kind: "技术论文", src: "arXiv 2606.19348", url: "https://arxiv.org/abs/2606.19348" },
  { no: 12, title: "GLM-5", kind: "技术论文", src: "arXiv 2602.15763", url: "https://arxiv.org/abs/2602.15763" },
  { no: 13, title: "GLM-5.2", kind: "IndexShare 架构说明", src: "Z.ai / Hugging Face", url: "https://huggingface.co/blog/zai-org/glm-52-blog" },
  { no: 14, title: "GLM-5.3-Flash", kind: "模型架构文档", src: "NVIDIA NeMo", url: "https://docs.nvidia.com/nemo/automodel/latest/model-coverage/vision-language-models/thudm/GLM-5.3-Flash" },
  { no: 15, title: "Step 3.5 Flash", kind: "官方模型卡", src: "StepFun / Hugging Face", url: "https://huggingface.co/stepfun-ai/Step-3.5-Flash/blob/main/README.md" },
  { no: 16, title: "Step 5 Preview", kind: "官方架构文章", src: "StepFun", url: "https://platform.stepfun.com/blog/inside-step-5-preview" },
  { no: 17, title: "MiMo-V2-Flash", kind: "官方论文与项目", src: "Xiaomi MiMo", url: "https://github.com/XiaomiMiMo/MiMo-V2-Flash" },
  { no: 18, title: "Hunyuan-TurboS", kind: "官方项目", src: "Tencent Hunyuan", url: "https://github.com/Tencent-Hunyuan/Hunyuan-TurboS" },
  { no: 19, title: "Hy4 Preview", kind: "官方项目", src: "Tencent Hunyuan", url: "https://github.com/Tencent-Hunyuan/Hy4-preview" },
  { no: 20, title: "LongCat-2.0", kind: "官方技术文章", src: "Meituan LongCat", url: "https://longcat.ai/blog/longcat-2.0/" },
  { no: 21, title: "HySparse", kind: "研究论文", src: "arXiv 2602.03560", url: "https://arxiv.org/abs/2602.03560" },
  { no: 22, title: "HySparse2", kind: "研究论文", src: "arXiv 2609.26368", url: "https://arxiv.org/abs/2609.26368" },
];

/** 层的类型：label 是文中写法，fam 决定颜色。 */
export interface LayerKind {
  label: string;
  fam: FamId;
}

/** 重复单元：按顺序排列的若干段，每段 n 层同一类型。 */
export interface Unit {
  segs: { kind: LayerKind; n: number }[];
  /** 单元的读法，例如“3:1”“交替” */
  ratio: string;
}

/** 完整层序：每层一个类型；stated 是文中给出的各类层数，用来核对 seq。 */
export interface Stack {
  kinds: LayerKind[];
  seq: number[];
  stated: number[];
  rule: string;
}

export interface Version {
  id: string;
  name: string;
  /** 这一行覆盖的模型版本（MiniMax-Text-01 与 M1 共用一行） */
  models: string[];
  /** 文中的架构描述，逐字；经核对更正过的版本见 note */
  arch: string;
  /** 更正说明：原文写法与更正依据 */
  note?: string;
  mech: FamId[];
  refs: number[];
  unit?: Unit;
  stack?: Stack;
}

export interface Stage {
  /** 文中技术路线列的写法 */
  route: string;
  versions: string[];
}

export interface Group {
  no: string;
  id: string;
  /** 文中“厂商 / 模型”列，逐字 */
  title: string;
  org: string;
  stages: Stage[];
  versions: Version[];
}

const K = (label: string, fam: FamId): LayerKind => ({ label, fam });

/** 按“每 period 层的第 at 层是 B，其余是 A”的交错规则生成层序。 */
function interleave(total: number, period: number, at: number, a: number, b: number) {
  return Array.from({ length: total }, (_, i) => ((i % period) + 1 === at ? b : a));
}

/* ---------- 完整层序（只为文中给出总层数的 4 个版本绘制） ---------- */

// Kimi K3：93 层 = 69 KDA + 24 Gated MLA；按 3:1（每 4 层第 4 层为 MLA）排 23 组，末层再加 1 层 MLA，最后两层均为 MLA。
const k3Kinds = [K("KDA", "linear"), K("Gated MLA", "full")];
const k3Seq = [...interleave(92, 4, 4, 0, 1), 1];

// GLM-5.3-Flash：45 层 = 34 KDA + 11 KPool-DSA；按 3:1 交错排 11 组，末尾另有 1 层 KDA。
const glmKinds = [K("KDA", "linear"), K("KPool-DSA", "sparse")];
const glmSeq = [...interleave(44, 4, 4, 0, 1), 0];

// Step 3.5 Flash：首层 Full，随后 11 组（3 × SWA + 1 × Full），共 45 层 = 33 SWA + 12 Full。
const stepKinds = [K("SWA", "swa"), K("Full", "full")];
const stepSeq = [1, ...interleave(44, 4, 4, 0, 1)];

// MiMo-V2-Flash：8 组，每组 5 × SWA 在前、1 × Global 在后，共 48 层 = 40 SWA + 8 Global，首层为 SWA。
// 原文写作“39 SWA + 9 Global（首层额外为 Global）”，已按官方 README（参考文献 [17]）更正。
const mimoKinds = [K("SWA", "swa"), K("Global", "full")];
const mimoSeq = interleave(48, 6, 6, 0, 1);

export const GROUPS: Group[] = [
  {
    no: "01", id: "qwen", title: "Qwen3-Next / Qwen3.5", org: "Qwen",
    stages: [{ route: "Linear + Global", versions: ["qwen3-next", "qwen3.5"] }],
    versions: [
      {
        id: "qwen3-next", name: "Qwen3-Next", models: ["Qwen3-Next"],
        arch: "3 × Gated DeltaNet + 1 × Gated Attention。", mech: ["linear", "full"], refs: [1],
        unit: { ratio: "3:1", segs: [{ kind: K("Gated DeltaNet", "linear"), n: 3 }, { kind: K("Gated Attention", "full"), n: 1 }] },
      },
      {
        id: "qwen3.5", name: "Qwen3.5", models: ["Qwen3.5"],
        arch: "沿用 3:1 的线性注意力 / 全注意力混合骨干。", mech: ["linear", "full"], refs: [2],
        unit: { ratio: "3:1", segs: [{ kind: K("线性注意力", "linear"), n: 3 }, { kind: K("全注意力", "full"), n: 1 }] },
      },
    ],
  },
  {
    no: "02", id: "kimi", title: "Kimi Linear / Kimi K3", org: "Moonshot AI",
    stages: [{ route: "Linear + Global", versions: ["kimi-linear", "kimi-k3"] }],
    versions: [
      {
        id: "kimi-linear", name: "Kimi Linear", models: ["Kimi Linear"],
        arch: "3 × KDA + 1 × MLA。", mech: ["linear", "full"], refs: [3],
        unit: { ratio: "3:1", segs: [{ kind: K("KDA", "linear"), n: 3 }, { kind: K("MLA", "full"), n: 1 }] },
      },
      {
        id: "kimi-k3", name: "Kimi K3", models: ["Kimi K3"],
        arch: "93 层 = 69 KDA + 24 Gated MLA；最后两层均为 MLA。", mech: ["linear", "full"], refs: [4],
        stack: { kinds: k3Kinds, seq: k3Seq, stated: [69, 24], rule: "按 23 组“3 层 KDA + 1 层 Gated MLA”排列，末尾再加 1 层 MLA" },
      },
    ],
  },
  {
    no: "03", id: "minimax", title: "MiniMax-Text-01 / M1 → M2 → M3", org: "MiniMax",
    stages: [
      { route: "Linear + Global", versions: ["minimax-01-m1"] },
      { route: "Full", versions: ["minimax-m2"] },
      { route: "Block Sparse", versions: ["minimax-m3"] },
    ],
    versions: [
      {
        id: "minimax-01-m1", name: "MiniMax-Text-01 / M1", models: ["MiniMax-Text-01", "MiniMax-M1"],
        arch: "7 × Lightning Attention + 1 × Softmax（GQA）。", mech: ["linear", "full"], refs: [5, 6],
        unit: { ratio: "7:1", segs: [{ kind: K("Lightning Attention", "linear"), n: 7 }, { kind: K("Softmax（GQA）", "full"), n: 1 }] },
      },
      {
        id: "minimax-m2", name: "MiniMax-M2", models: ["MiniMax-M2"],
        arch: "全注意力。", mech: ["full"], refs: [7],
        unit: { ratio: "每层", segs: [{ kind: K("全注意力", "full"), n: 1 }] },
      },
      {
        id: "minimax-m3", name: "MiniMax-M3", models: ["MiniMax-M3"],
        arch: "MSA，基于 GQA 的块级 Top-k 稀疏注意力。", mech: ["sparse"], refs: [8],
        unit: { ratio: "每层", segs: [{ kind: K("MSA", "sparse"), n: 1 }] },
      },
    ],
  },
  {
    no: "04", id: "ring", title: "蚂蚁 Ring-2.5-1T", org: "Ant Ling",
    stages: [{ route: "Linear + Global", versions: ["ring-2.5-1t"] }],
    versions: [
      {
        id: "ring-2.5-1t", name: "Ring-2.5-1T", models: ["Ring-2.5-1T"],
        arch: "7 × Lightning Linear Attention + 1 × MLA；全局层由 GQA 改为 MLA，以降低 KV Cache。", mech: ["linear", "full"], refs: [9],
        unit: { ratio: "7:1", segs: [{ kind: K("Lightning Linear Attention", "linear"), n: 7 }, { kind: K("MLA", "full"), n: 1 }] },
      },
    ],
  },
  {
    no: "05", id: "deepseek", title: "DeepSeek V3.2 → V4", org: "DeepSeek",
    stages: [
      { route: "Token Sparse", versions: ["deepseek-v3.2"] },
      { route: "Compressed Hybrid", versions: ["deepseek-v4"] },
    ],
    versions: [
      {
        id: "deepseek-v3.2", name: "DeepSeek V3.2", models: ["DeepSeek V3.2"],
        arch: "DSA，Lightning Indexer 进行 token 级 Top-k 选择。", mech: ["sparse"], refs: [10],
        unit: { ratio: "每层", segs: [{ kind: K("DSA", "sparse"), n: 1 }] },
      },
      {
        id: "deepseek-v4", name: "DeepSeek V4", models: ["DeepSeek V4"],
        arch: "CSA（4× 压缩 + 稀疏索引）与 HCA（128× 压缩 + 密集注意力）交替；均包含局部窗口分支。", mech: ["compress", "sparse", "swa"], refs: [11],
        unit: { ratio: "交替", segs: [{ kind: K("CSA", "sparse"), n: 1 }, { kind: K("HCA", "compress"), n: 1 }] },
      },
    ],
  },
  {
    no: "06", id: "glm", title: "GLM-5 → GLM-5.2 → GLM-5.3-Flash", org: "Z.ai",
    stages: [
      { route: "Sparse", versions: ["glm-5"] },
      { route: "Shared Sparse", versions: ["glm-5.2"] },
      { route: "Linear + Sparse", versions: ["glm-5.3-flash"] },
    ],
    versions: [
      {
        id: "glm-5", name: "GLM-5", models: ["GLM-5"],
        arch: "DSA。", mech: ["sparse"], refs: [12],
        unit: { ratio: "每层", segs: [{ kind: K("DSA", "sparse"), n: 1 }] },
      },
      {
        id: "glm-5.2", name: "GLM-5.2", models: ["GLM-5.2"],
        arch: "IndexShare，每 4 层复用一次稀疏索引。", mech: ["sparse", "reuse"], refs: [13],
      },
      {
        id: "glm-5.3-flash", name: "GLM-5.3-Flash", models: ["GLM-5.3-Flash"],
        arch: "45 层 = 34 KDA + 11 KPool-DSA；按 3:1 交错，末尾另有 1 层 KDA。", mech: ["linear", "sparse"], refs: [14],
        stack: { kinds: glmKinds, seq: glmSeq, stated: [34, 11], rule: "按 11 组“3 层 KDA + 1 层 KPool-DSA”排列，末尾再加 1 层 KDA" },
      },
    ],
  },
  {
    no: "07", id: "step", title: "阶跃 Step 3.5 Flash → Step 5 Preview", org: "StepFun",
    stages: [
      { route: "SWA + Global", versions: ["step-3.5-flash"] },
      { route: "SWA + Sparse", versions: ["step-5-preview"] },
    ],
    versions: [
      {
        id: "step-3.5-flash", name: "Step 3.5 Flash", models: ["Step 3.5 Flash"],
        arch: "首层 Full，随后 11 组（3 × SWA + 1 × Full），使用 head-wise gate。", mech: ["swa", "full"], refs: [15],
        stack: { kinds: stepKinds, seq: stepSeq, stated: [33, 12], rule: "首层 Full，随后 11 组“3 层 SWA + 1 层 Full”" },
      },
      {
        id: "step-5-preview", name: "Step 5 Preview", models: ["Step 5 Preview"],
        arch: "3 × Gated SWA + 1 × Sparse GQA。", mech: ["swa", "sparse"], refs: [16],
        unit: { ratio: "3:1", segs: [{ kind: K("Gated SWA", "swa"), n: 3 }, { kind: K("Sparse GQA", "sparse"), n: 1 }] },
      },
    ],
  },
  {
    no: "08", id: "mimo", title: "小米 MiMo-V2-Flash", org: "Xiaomi MiMo",
    stages: [{ route: "SWA + Global", versions: ["mimo-v2-flash"] }],
    versions: [
      {
        id: "mimo-v2-flash", name: "MiMo-V2-Flash", models: ["MiMo-V2-Flash"],
        arch: "每组 5 × SWA（window = 128）+ 1 × Global；共 8 组，整体为 40 个 SWA 层 + 8 个 Global 层。", mech: ["swa", "full"], refs: [17],
        note: "原文写作“整体为 39 个 SWA 层 + 9 个 Global 层（首层额外为 Global）”，已按官方 README 更正为 8 组、40 + 8，首层为 SWA。",
        stack: { kinds: mimoKinds, seq: mimoSeq, stated: [40, 8], rule: "按 8 组“5 层 SWA + 1 层 Global”排列，每组最后一层为 Global（已按官方 README 更正）" },
      },
    ],
  },
  {
    no: "09", id: "hunyuan", title: "腾讯 Hunyuan-TurboS → Hy4 Preview", org: "Tencent Hunyuan",
    stages: [
      { route: "SSM Hybrid", versions: ["hunyuan-turbos"] },
      { route: "Sparse", versions: ["hy4-preview"] },
    ],
    versions: [
      {
        id: "hunyuan-turbos", name: "Hunyuan-TurboS", models: ["Hunyuan-TurboS"],
        arch: "Mamba2 + GQA 的 Transformer–SSM 混合架构。", mech: ["ssm", "full"], refs: [18],
      },
      {
        id: "hy4-preview", name: "Hy4 Preview", models: ["Hy4 Preview"],
        arch: "Gated DSA + IndexCache，支持跨层稀疏索引复用。", mech: ["sparse", "reuse"], refs: [19],
      },
    ],
  },
  {
    no: "10", id: "longcat", title: "美团 LongCat-2.0", org: "Meituan LongCat",
    stages: [{ route: "Dynamic Sparse + Index Reuse", versions: ["longcat-2.0"] }],
    versions: [
      {
        id: "longcat-2.0", name: "LongCat-2.0", models: ["LongCat-2.0"],
        arch: "LongCat Sparse Attention：Streaming-aware Indexing（流式访问）、Cross-Layer Indexing（跨层复用）和 Hierarchical Indexing（分层选择）。",
        mech: ["sparse", "reuse"], refs: [20],
      },
    ],
  },
  {
    no: "11", id: "hysparse", title: "小米 HySparse / HySparse2（研究）", org: "Xiaomi",
    stages: [
      { route: "Full + Sparse", versions: ["hysparse"] },
      { route: "Two-Level KV Sharing", versions: ["hysparse2"] },
    ],
    versions: [
      {
        id: "hysparse", name: "HySparse", models: ["HySparse"],
        arch: "Full 层指导后续 Sparse 层的 token 选择与 KV 复用。", mech: ["full", "sparse", "reuse"], refs: [21],
      },
      {
        id: "hysparse2", name: "HySparse2", models: ["HySparse2"],
        arch: "增加 KV Bridging + KV Reuse 两级共享；token 级稀疏选择与强制局部窗口。", mech: ["sparse", "reuse", "swa"], refs: [22],
      },
    ],
  },
];

/* ---------- 派生数据：页面上的所有计数都从这里来 ---------- */

export const VERSIONS = GROUPS.flatMap((g) => g.versions.map((v) => ({ ...v, group: g })));
export const MODEL_COUNT = VERSIONS.reduce((s, v) => s + v.models.length, 0);

export function groupFamilies(g: Group): FamId[] {
  const set = new Set(g.versions.flatMap((v) => v.mech));
  return FAMILIES.map((f) => f.id).filter((id) => set.has(id));
}

function latestFamilies(g: Group): FamId[] {
  return g.versions[g.versions.length - 1].mech;
}

/** 每个机制家族出现在多少组里（任一版本），以及在多少组的最新版本里。 */
export const FAMILY_COUNTS = FAMILIES.map((f) => ({
  fam: f,
  groups: GROUPS.filter((g) => groupFamilies(g).includes(f.id)).length,
  latest: GROUPS.filter((g) => latestFamilies(g).includes(f.id)).length,
}));

export const STACKED = VERSIONS.filter((v) => v.stack);
export const MAX_DEPTH = Math.max(...STACKED.map((v) => v.stack!.seq.length));

export function stackCounts(s: Stack) {
  return s.kinds.map((_, k) => s.seq.filter((x) => x === k).length);
}

/** 版本 id → 所属组与版本 */
export const VERSION_BY_ID = Object.fromEntries(VERSIONS.map((v) => [v.id, v]));

export const REF_BY_NO = Object.fromEntries(REFS.map((r) => [r.no, r])) as Record<number, Ref>;

export function refLabel(no: number) {
  return String(no).padStart(2, "0");
}

/** 发生过路线切换的组（技术路线不止一段） */
export const SWITCHED = GROUPS.filter((g) => g.stages.length > 1);

/** 供搜索使用的纯文本 */
export function groupHaystack(g: Group) {
  return [
    g.title, g.org,
    ...g.stages.map((s) => s.route),
    ...g.versions.flatMap((v) => [v.name, ...v.models, v.arch, ...v.mech.map((m) => FAM[m].name)]),
  ].join(" ").toLowerCase();
}
