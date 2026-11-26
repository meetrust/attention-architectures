import * as React from "react";
import { Slider, Tabs } from "@cloudflare/kumo";
import { motion } from "motion/react";
import { Chip } from "../kumo-ts/adapters";
import { FAM, FAMILIES, GROUPS, MODEL_COUNT, REFS, type FamId } from "../data";
import { Tail, cvar } from "./common";

/* ---------- FIG.01 注意力读取范围（示意） ---------- */
const N = 16; // token 数
const W = 4; // 窗口
const K = 4; // Top-k（含自身）

type Mode = "full" | "swa" | "sparse" | "linear";
const MODES: { id: Mode; fam: FamId; label: string }[] = [
  { id: "full", fam: "full", label: "全局" },
  { id: "swa", fam: "swa", label: "窗口" },
  { id: "sparse", fam: "sparse", label: "稀疏" },
  { id: "linear", fam: "linear", label: "线性" },
];

/** 示意用的确定性“索引器分数”：同一个 t 每次挑出的位置都一样。 */
const score = (t: number, j: number) => (j * 37 + t * 11 + j * j * 5) % 29;

function readSet(mode: Mode, t: number): Set<number> {
  const all = Array.from({ length: t }, (_, i) => i + 1);
  if (mode === "full") return new Set(all);
  if (mode === "swa") return new Set(all.filter((j) => j > t - W));
  if (mode === "linear") return new Set([t]);
  if (t <= K) return new Set(all);
  const picked = all
    .slice(0, -1)
    .sort((a, b) => score(t, b) - score(t, a) || b - a)
    .slice(0, K - 1);
  return new Set([...picked, t]);
}

function cellState(mode: Mode, r: number, c: number, t: number, cur: Set<number>) {
  if (c > r) return "future";
  if (r === t) {
    if (mode === "linear") return c === t ? "read" : "state";
    return cur.has(c) ? "read" : "skip";
  }
  if (mode === "linear") return c === r ? "pat" : "patstate";
  return readSet(mode, r).has(c) ? "pat" : "";
}

function MaskFigure() {
  const [mode, setMode] = React.useState<Mode>("swa");
  const [t, setT] = React.useState(12);
  const fam = MODES.find((m) => m.id === mode)!.fam;
  const cur = React.useMemo(() => readSet(mode, t), [mode, t]);
  const n = { full: t, swa: Math.min(t, W), sparse: Math.min(t, K) };

  const say: Record<Mode, React.ReactNode> = {
    full: <>第 <b>{t}</b> 个 token 读取全部 <b>{t}</b> 个位置（含自身），历史越长<span className="nw">读得越多。</span></>,
    swa: t > W
      ? <>只读取最近 <b>{n.swa}</b> 个位置（窗口 w = {W}），更早的 <b>{t - n.swa}</b> 个位置<span className="nw">不参与这一层。</span></>
      : <>历史还没有超出窗口 w = {W}，<b>{t}</b> 个位置<span className="nw">全部读取。</span></>,
    sparse: t <= K
      ? <>历史还不到 k = {K} 个，<b>{t}</b> 个位置<span className="nw">全部读取。</span></>
      : <>索引器为前 <b>{t - 1}</b> 个位置打分，挑出 <b>{K - 1}</b> 个，加上自身<span className="nw">共读取 <b>{K}</b> 个。</span></>,
    linear: t > 1
      ? <>前 <b>{t - 1}</b> 个位置已折叠进一份固定大小的状态，这一步只读取<span className="nw">状态和自身。</span></>
      : <>第 1 个 token 还没有历史，状态为空，<span className="nw">只读取自身。</span></>,
  };
  const ariaGrid = `${N} × ${N} 注意力掩码示意，当前方式：${FAM[fam].name}，查询位置 t = ${t}。`;

  return (
    <figure className="fig" aria-labelledby="fig01-cap">
      <figcaption id="fig01-cap">
        <b>FIG.01 · 注意力读取范围</b>
        <span>示意 · 拖动 t 或点选网格中的一行</span>
      </figcaption>
      <div className="fig-body">
        <div className="mask-ctrl">
          <Tabs
            variant="segmented"
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            tabs={MODES.map((m) => ({ value: m.id, label: m.label }))}
          />
          <div className="mask-t">
            <Slider label={`查询位置 t = ${t}`} min={1} max={N} step={1} value={t} onValueChange={(v) => setT(Array.isArray(v) ? v[0] : (v as number))} className="w-full" />
          </div>
        </div>
        <div className="mask-wrap">
          <div className="mask-axes">
            <span className="ax-x" aria-hidden="true">KEY 位置 j</span>
            <span className="ax-y" aria-hidden="true">QUERY t</span>
            <div className="mask-grid" role="img" aria-label={ariaGrid} style={cvar(fam)}>
              {Array.from({ length: N * N }, (_, k) => {
                const r = Math.floor(k / N) + 1;
                const c = (k % N) + 1;
                const s = cellState(mode, r, c, t, cur);
                return (
                  <i
                    key={k}
                    data-s={s || undefined}
                    data-row={r === t ? "cur" : undefined}
                    onClick={() => setT(r)}
                  />
                );
              })}
            </div>
          </div>
          <div className="mask-read">
            <p className="mask-say" aria-live="polite">{say[mode]}</p>
            <ul className="bars mask-bars" aria-label={`t = ${t} 时各方式读取的历史位置数`}>
              {(["full", "swa", "sparse"] as const).map((m) => {
                const f = MODES.find((x) => x.id === m)!.fam;
                return (
                  <li key={m} data-on={mode === m} style={cvar(f)}>
                    <span className="nm">{FAM[f].short}</span>
                    <span className="tr"><span style={{ "--v": (n[m] / N) * 100 } as React.CSSProperties} /></span>
                    <span className="vl">{n[m]}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mask-state"><i aria-hidden="true" /><span>线性：读取 1 份固定大小的状态，<span className="nw">与 t 无关</span></span></p>
          </div>
        </div>
      </div>
      <div className="fig-foot">
        {/* 包一层 span：.fig-foot 是 flex 容器，否则 Tail 末尾不拆行的几个字会被当成单独一项换到下一行 */}
        <span>
          <Tail>{`示意：${N} 个 token，窗口 w = ${W}，Top-k 取 ${K}（含自身）。真实模型的窗口与 k 大得多，例如 MiMo-V2-Flash 的窗口为 128。`}</Tail>
        </span>
      </div>
    </figure>
  );
}

/* ---------- 首屏 ---------- */
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

export function Hero() {
  const stats: [number, string][] = [
    [GROUPS.length, "组模型"],
    [MODEL_COUNT, "个模型版本"],
    [FAMILIES.length, "类注意力机制"],
    [REFS.length, "篇参考资料"],
  ];
  return (
    <section className="hero wrap" id="top" aria-labelledby="hero-h">
      <motion.div className="hero-text" initial="hidden" animate="show" transition={{ staggerChildren: 0.06 }}>
        <motion.p className="eyebrow" variants={rise}>Technical reference · Model architectures</motion.p>
        <motion.h1 id="hero-h" variants={rise}>
          <span className="ln">大模型 <em>Attention</em></span>
          <span className="ln">架构与技术路线对照</span>
        </motion.h1>
        <motion.div className="hero-sub" variants={rise}>
          <Chip c={FAM.linear.c}>混合线性注意力</Chip>
          <Chip c={FAM.swa.c}>滑动窗口注意力</Chip>
          <Chip c={FAM.sparse.c}>动态稀疏注意力</Chip>
        </motion.div>
        <motion.p className="hero-lead" variants={rise}>
          <Tail>{`${GROUPS.length} 组国产大模型正在用三种办法给注意力减负：把大部分层换成线性注意力，只看最近一段窗口，或者只挑最相关的 token 来算。这里把原表拆成路线、图鉴和层序三种视图，可以筛选、对比，也可以逐层查看。`}</Tail>
        </motion.p>
        <motion.dl className="datastrip" variants={rise}>
          {stats.map(([v, l]) => (
            <div key={l}>
              <dt><span>{l}</span></dt>
              <dd><b>{v}</b></dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <MaskFigure />
      </motion.div>
    </section>
  );
}
