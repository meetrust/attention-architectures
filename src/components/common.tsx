import * as React from "react";
import { FAM, type FamId, type Unit } from "../data";

/* ---------- 图标：Tight Surface 默认图标库 Lucide 1.71.0 ----------
   一般图标直接用 lucide-react（main.tsx 的 <LucideProvider className="i"> 统一套上 .i，尺寸由 CSS 决定）。
   路线里的箭头是 Tight Surface 的连线图例 i-move-right：lucide-react 没有对应组件（viewBox 裁成 24×16），
   symbol 放在 index.html 的内联 sprite 里，这里只负责引用。 */
export function RouteArrow() {
  return (
    <svg className="i rr-arrow" aria-hidden="true" focusable="false">
      <use href="#i-move-right" />
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
