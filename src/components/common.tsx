import * as React from "react";
import { FAM, type FamId, type Unit } from "../data";

/* ---------- Icon：Tight Surface 的 SVG sprite（16×16，1.7–1.8px 圆头描边） ---------- */
export function Sprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <symbol id="i-ext" viewBox="0 0 16 16"><path d="M4.8 11.2 11 5M6.2 5H11v4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="i-up" viewBox="0 0 16 16"><path d="M8 13V3.6M3.8 7.6 8 3.4l4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="i-to" viewBox="0 0 24 16"><path d="M2 8h17.5M15.5 3.8 19.7 8l-4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="i-check" viewBox="0 0 16 16"><path d="M3.2 8.4 6.6 11.6 12.8 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></symbol>
      <symbol id="i-cross" viewBox="0 0 16 16"><path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></symbol>
    </svg>
  );
}

export type IconName = "ext" | "up" | "to" | "check" | "cross";
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={"i" + (className ? " " + className : "")} aria-hidden="true" focusable="false">
      <use href={`#i-${name}`} />
    </svg>
  );
}

/* ---------- 末尾几个字不拆行：避免单字成行（原则 8） ---------- */
export function Tail({ children, n = 4 }: { children: string; n?: number }) {
  const cut = Math.max(0, children.length - n);
  return (
    <>
      {children.slice(0, cut)}
      <span className="nw">{children.slice(cut)}</span>
    </>
  );
}

/** 拼接中英文片段：只在西文 / 数字与汉字相接处补一个空格（原则 8）。 */
export function cj(...parts: string[]) {
  const latin = /[A-Za-z0-9)\]]/;
  const han = /[一-鿿]/;
  return parts.reduce((a, b) => {
    if (!a) return b;
    const l = a[a.length - 1];
    const r = b[0];
    return a + ((latin.test(l) && han.test(r)) || (han.test(l) && latin.test(r)) ? " " : "") + b;
  }, "");
}

/* ---------- 颜色变量 ---------- */
export const cvar = (fam: FamId) => ({ "--c": `var(--${FAM[fam].c})` }) as React.CSSProperties;

export function FamDots({ fams, size = 8 }: { fams: FamId[]; size?: number }) {
  return (
    <span className="dots" aria-hidden="true">
      {fams.map((f) => (
        <i key={f} className="fam-dot" style={{ ...cvar(f), width: size, height: size }} />
      ))}
    </span>
  );
}

/* ---------- 节标题：索引条式（.sh） ---------- */
export function SectionHead({ idx, title, meta, id }: { idx: string; title: string; meta: string; id: string }) {
  return (
    <header className="sh">
      <span className="sh-idx" aria-hidden="true">{idx}</span>
      <h2 id={id}>{title}</h2>
      <span className="sh-meta" aria-hidden="true">{meta}</span>
    </header>
  );
}

/* ---------- 重复单元条 ---------- */
export function UnitBar({ unit }: { unit: Unit }) {
  const label = `重复单元（${unit.ratio}）：` + unit.segs.map((s) => cj(`${s.n} 层`, s.kind.label)).join("、");
  return (
    <div className="unit">
      <span className="unit-cells" role="img" aria-label={label}>
        {unit.segs.flatMap((s, si) =>
          Array.from({ length: s.n }, (_, i) => <i key={`${si}-${i}`} style={cvar(s.kind.fam)} />),
        )}
      </span>
      <ul className="unit-key">
        <li className="ratio">{unit.ratio}</li>
        {unit.segs.map((s, i) => (
          <li key={i}>
            <i style={cvar(s.kind.fam)} aria-hidden="true" />
            <span>{s.n} × {s.kind.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- hooks ---------- */
export function useMedia(query: string) {
  const get = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  const [m, setM] = React.useState(get);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

/** 复制文本：先用异步剪贴板 API，被拦截时退回隐藏 textarea + execCommand。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** 平滑滚动到元素；减少动效时直接跳转。 */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
