import * as React from "react";
import { Tabs } from "@cloudflare/kumo";
import { motion } from "motion/react";
import { FAM, MAX_DEPTH, STACKED, stackCounts, type FamId } from "../data";
import { SectionHead, Tail, cvar } from "./common";

type Mode = "abs" | "fit";
type Cur = { id: string; i: number } | null;

/** 图例：只列 4 个版本里实际出现的层类型，按机制家族上色。 */
const LEGEND = (() => {
  const seen = new Map<string, { fam: FamId; labels: Set<string> }>();
  STACKED.forEach((v) => v.stack!.kinds.forEach((k) => {
    const e = seen.get(k.fam) ?? { fam: k.fam, labels: new Set<string>() };
    e.labels.add(k.label);
    seen.set(k.fam, e);
  }));
  return [...seen.values()];
})();

function StackRow({ v, mode, cur, setCur, focused }: {
  v: (typeof STACKED)[number];
  mode: Mode;
  cur: Cur;
  setCur: (c: Cur) => void;
  focused: boolean;
}) {
  const s = v.stack!;
  const n = s.seq.length;
  const counts = stackCounts(s);
  const mine = cur?.id === v.id ? cur.i : null;
  const value = mine ?? 1;
  const kind = s.kinds[s.seq[value - 1]];
  const drag = React.useRef(false);
  const barRef = React.useRef<HTMLDivElement>(null);
  const pct = mode === "abs" ? (n / MAX_DEPTH) * 100 : 100;

  React.useEffect(() => {
    if (focused) barRef.current?.focus({ preventScroll: true });
  }, [focused]);

  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / r.width) * n) + 1;
    setCur({ id: v.id, i: Math.min(n, Math.max(1, i)) });
  };
  const key = (e: React.KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 4, PageDown: -4 };
    let next: number | null = null;
    if (e.key in step) next = value + step[e.key];
    if (e.key === "Home") next = 1;
    if (e.key === "End") next = n;
    if (next === null) return;
    e.preventDefault();
    setCur({ id: v.id, i: Math.min(n, Math.max(1, mine === null && e.key in step ? 1 : next)) });
  };

  return (
    <motion.div className="ls-row" id={`ls-${v.id}`} data-focus={focused || undefined} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
      <div className="ls-label">
        <b>{v.name}</b>
        <span>{n} 层 · {v.group.org}</span>
      </div>
      <div className="ls-track">
        <motion.div initial={false} animate={{ width: `${pct}%` }}>
          <div
            ref={barRef}
            className="ls-bar"
            role="slider"
            tabIndex={0}
            aria-label={`${v.name} 层序`}
            aria-valuemin={1}
            aria-valuemax={n}
            aria-valuenow={value}
            aria-valuetext={`第 ${value} / ${n} 层：${kind.label}，${FAM[kind.fam].name}`}
            onKeyDown={key}
            onPointerDown={(e) => {
              drag.current = true;
              if (e.pointerType !== "touch") e.currentTarget.setPointerCapture(e.pointerId);
              at(e);
            }}
            onPointerMove={(e) => { if (e.pointerType === "mouse" || drag.current) at(e); }}
            onPointerUp={() => { drag.current = false; }}
            onPointerCancel={() => { drag.current = false; }}
          >
            <motion.div
              className="ls-cells"
              variants={{ hidden: { scaleY: 0.55 }, show: { scaleY: 1 } }}
              style={{ "--n": n, transformOrigin: "50% 100%" } as React.CSSProperties}
            >
              {s.seq.map((k, i) => (
                <i key={i} style={cvar(s.kinds[k].fam)} data-on={mine === i + 1 || undefined} />
              ))}
            </motion.div>
            {mine !== null ? <span className="ls-tick" style={{ left: `${((mine - 0.5) / n) * 100}%` }} /> : null}
          </div>
          <div className="ls-scale" aria-hidden="true"><span>1</span><span>{n}</span></div>
        </motion.div>
        <p className="ls-comp">
          {s.kinds.map((k, i) => (
            <React.Fragment key={k.label}>
              {i > 0 ? " + " : ""}
              <b>{counts[i]}</b> {k.label}
            </React.Fragment>
          ))}
          {" = "}<b>{n}</b> 层
        </p>
      </div>
    </motion.div>
  );
}

export function Layers({ focus }: { focus: string | null }) {
  const [mode, setMode] = React.useState<Mode>("abs");
  const [cur, setCur] = React.useState<Cur>(null);
  React.useEffect(() => { if (focus) setCur({ id: focus, i: 1 }); }, [focus]);

  const active = cur ? STACKED.find((v) => v.id === cur.id)! : null;
  const ak = active ? active.stack!.kinds[active.stack!.seq[cur!.i - 1]] : null;
  const before = active
    ? active.stack!.kinds.map((_, k) => active.stack!.seq.slice(0, cur!.i).filter((x) => x === k).length)
    : [];

  return (
    <section className="sec wrap" id="layers" aria-labelledby="layers-h">
      <SectionHead idx="03" title="层序对照" meta="Layer stacks" id="layers-h" />
      <p className="sec-lead">
        <Tail>{`原文给出总层数的 ${STACKED.length} 个版本，按原文的交错规则逐层画成条码：一格是一层，颜色是机制。鼠标移过或手指在条码上横向滑动可以逐层查看；键盘聚焦后用方向键。`}</Tail>
      </p>
      <figure className="fig" aria-labelledby="fig04-cap">
        <figcaption id="fig04-cap">
          <b>FIG.04 · 层序条码</b>
          <span>{mode === "abs" ? "按层号对齐：条码越长，层数越多" : "按比例拉伸：只比较交错比例"}</span>
        </figcaption>
        <div className="fig-body">
          <div className="ls-ctrl">
            <Tabs
              variant="segmented"
              value={mode}
              onValueChange={(m) => setMode(m as Mode)}
              tabs={[{ value: "abs", label: "按层号对齐" }, { value: "fit", label: "按比例拉伸" }]}
            />
            <ul className="fig-key ls-key" aria-label="层类型图例">
              {LEGEND.map((e) => (
                <li key={e.fam} style={cvar(e.fam)}>
                  <i aria-hidden="true" />
                  <span>{FAM[e.fam].short} · {[...e.labels].join(" / ")}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ls-rows">
            {STACKED.map((v) => (
              <StackRow key={v.id} v={v} mode={mode} cur={cur} setCur={setCur} focused={focus === v.id} />
            ))}
          </div>
          <p className="ls-read" aria-hidden="true">
            {active && ak ? (
              <>
                <span><b>{active.name}</b> · 第 <b>{cur!.i}</b> / {active.stack!.seq.length} 层</span>
                <span className="lvl" style={cvar(ak.fam)}>{ak.label} · {FAM[ak.fam].name}</span>
                <span>到这一层为止：{active.stack!.kinds.map((k, i) => `${before[i]} ${k.label}`).join("、")}</span>
              </>
            ) : (
              <span>把鼠标移到条码上，或用手指横向滑动，这里会显示该层的类型。</span>
            )}
          </p>
        </div>
        <div className="fig-foot">
          <ul className="ls-rules">
            {STACKED.map((v) => (
              <li key={v.id}><Tail>{`${v.name}：${v.stack!.rule}。`}</Tail></li>
            ))}
          </ul>
        </div>
      </figure>
    </section>
  );
}
