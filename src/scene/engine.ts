/**
 * scene/engine.ts · 声明式 SVG 场景引擎（不依赖框架）。
 *
 * 用法：每个画面只描述“现在应该是什么样”（实体 + 连线），goTo(scene) 负责算出差异并按顺序播放：
 *   1. 退出：新画面里没有的实体淡出，没有的连线淡出；
 *   2. 移动：两边都有、但位置或尺寸变了的实体补间到新位置；
 *   3. 进入：新实体按给出的顺序错峰出现；
 *   4. 连线：等两端实体都到位后再画出来；画完的连线按 flow（个 / 秒）持续发出数据包。
 *
 * Tight Surface 原则 9：SVG 只画线和形状，所有文字是叠在上面的 HTML；坐标是容器实测的 px，不靠 viewBox 缩放。
 * 原则 3：一种缓动、一种时长（与 tokens.css 的 --ease / --dur 一致），先后顺序靠延迟编排；入场 rise 上移 14px、
 *        柱 grow 从 12% 展开，与 Design System“动效”一节相同。
 * 原则 5：减少动效时 goTo 直接跳到终态，不发数据包。WCAG 2.2.2：数据包持续流动，setPaused 让它停在原地，
 *        页面上每张图下方都有“暂停流动”按钮。
 */

/** --ease: cubic-bezier(.2, .7, .2, 1) 的 JS 版本：二分求出 x 对应的参数，再算 y。 */
const EASE = (x: number) => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bez = (t: number, p1: number, p2: number) => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  let lo = 0, hi = 1, t = x;
  for (let i = 0; i < 20; i++) {
    if (bez(t, 0.2, 0.2) < x) lo = t; else hi = t;
    t = (lo + hi) / 2;
  }
  return bez(t, 0.7, 1);
};
const DUR = 280; // --dur: .28s
const RISE = 14; // 入场上移的距离，与 Design System 的 rise 一致
const GROW = 0.12; // 柱从 12% 高度展开，与 Design System 的 grow 一致
const STAGGER = 24; // 进入的实体之间错开的毫秒数
const LINK_STAGGER = 18; // 新连线之间错开的毫秒数
const SPEED = 110; // 数据包速度，px / 秒

/** 标签锚点：c 居中；b 在形状下方居中；tl 在上方左对齐；bl / br 在下方左 / 右对齐（贴边时用，不出画面） */
export type LabelAt = "c" | "b" | "tl" | "bl" | "br";

export interface EntSpec {
  x: number; y: number; w: number; h: number;
  r?: number;
  /** SVG 形状的 class；"none" 表示只有标签、不画形状 */
  cls: string;
  /** back 层在连线下面（区域框），front 层在数据包上面（默认） */
  layer?: "back" | "front";
  /** 进入方式：rise 从下方浮起（默认），grow 从底边长高（柱），fade 只淡入 */
  enter?: "rise" | "grow" | "fade";
  label?: string;
  labelAt?: LabelAt;
  labelCls?: string;
  /** 点击这个形状时回调 onPick(pick) */
  pick?: string;
  /** 写到形状和标签上的 CSS 变量，例如 { "--c": "var(--l2)" }：每个形状用自己的机制色 */
  vars?: Record<string, string>;
}

export interface LinkSpec {
  from: string;
  to: string;
  /** 出口、入口在实体宽度上的位置：-0.5 = 左边缘，0 = 中点，0.5 = 右边缘 */
  fx?: number;
  tx?: number;
  cls: string;
  /** 每秒发出的数据包个数；0 或不填表示静态连线 */
  flow?: number;
  /** draw：沿线画出（默认）；fade：淡入（虚线用这个，画线动画会把虚线暂时画成实线） */
  enter?: "draw" | "fade";
  /** 写到连线及其数据包上的 CSS 变量 */
  vars?: Record<string, string>;
}

export interface Scene {
  w: number;
  h: number;
  ents: Record<string, EntSpec>;
  links: Record<string, LinkSpec>;
}

type Geo = { x: number; y: number; w: number; h: number; o: number };
interface Tween<T> { from: T; to: T; start: number; delay: number; remove?: boolean }
interface Ent { id: string; spec: EntSpec; cur: Geo; tw: Tween<Geo> | null; shape: SVGRectElement | null; label: HTMLSpanElement | null }
interface Link {
  id: string; spec: LinkSpec; el: SVGPathElement; len: number;
  draw: number; o: number; tw: Tween<{ draw: number; o: number }> | null;
  acc: number; p: number[]; // 三次贝塞尔的 8 个坐标
}
interface Packet { link: string; u: number; el: SVGCircleElement }

const NS = "http://www.w3.org/2000/svg";
const r2 = (v: number) => Math.round(v * 100) / 100;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sameGeo = (a: EntSpec, b: EntSpec) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

export class SceneEngine {
  private svg: SVGSVGElement;
  private gBack: SVGGElement;
  private gLinks: SVGGElement;
  private gPkts: SVGGElement;
  private gFront: SVGGElement;
  private labels: HTMLDivElement;
  private ents = new Map<string, Ent>();
  private links = new Map<string, Link>();
  private packets: Packet[] = [];
  private raf = 0;
  private last = 0;
  private paused = false;
  private visible = true;
  private reduced = false;
  private io: IntersectionObserver;
  onPick: ((id: string) => void) | null = null;

  constructor(host: HTMLElement) {
    this.svg = document.createElementNS(NS, "svg");
    this.svg.setAttribute("aria-hidden", "true");
    this.svg.setAttribute("focusable", "false");
    this.gBack = this.group("back");
    this.gLinks = this.group("links");
    this.gPkts = this.group("pkts");
    this.gFront = this.group("front");
    this.labels = document.createElement("div");
    this.labels.className = "flow-labels";
    this.labels.setAttribute("aria-hidden", "true");
    host.append(this.svg, this.labels);
    this.svg.addEventListener("click", this.onClick);
    // 不在视口里、或标签页在后台时停掉循环，省电。离开视口时把没播完的过渡直接落到终态：
    // 否则新元素会停在透明的起点，整页截图、打印和预览里这张图是空的（与 FIG.04 条码当初的问题同类）
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (!this.visible) { this.snap(); this.renderAll(); }
      this.kick();
    });
    this.io.observe(host);
    document.addEventListener("visibilitychange", this.kick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.kick);
    this.svg.removeEventListener("click", this.onClick);
    this.svg.remove();
    this.labels.remove();
  }

  /** 暂停数据包：已经在路上的包停在原地，不再发新包；画面切换的过渡照常播放。 */
  setPaused(on: boolean) {
    this.paused = on;
    this.kick();
  }

  setReduced(on: boolean) {
    this.reduced = on;
    if (on) this.clearPackets();
    this.kick();
  }

  /** 切到新画面。instant：直接跳到终态（尺寸变化、减少动效、不在视口里时）。 */
  goTo(scene: Scene, { instant = false } = {}) {
    instant ||= this.reduced || !this.visible;
    this.svg.setAttribute("width", String(scene.w));
    this.svg.setAttribute("height", String(scene.h));
    this.svg.setAttribute("viewBox", `0 0 ${scene.w} ${scene.h}`); // 与 px 尺寸 1:1，不缩放
    const now = performance.now();
    if (instant) this.snap();

    const next = scene.ents;
    const exiting = [...this.ents.values()].filter((e) => !next[e.id] && !e.tw?.remove);
    const linkExit = [...this.links.values()].filter((l) => !scene.links[l.id] && !l.tw?.remove);
    const moved: Ent[] = [];
    const entering: [string, EntSpec][] = [];
    for (const [id, spec] of Object.entries(next)) {
      const e = this.ents.get(id);
      if (!e) entering.push([id, spec]);
      else if (e.tw?.remove || !sameGeo(e.spec, spec)) moved.push(e);
      if (e) this.restyle(e, spec);
    }

    // 编排：退出 → 移动 → 进入（错峰）→ 连线
    const tMove = exiting.length || linkExit.length ? DUR * 0.7 : 0;
    const tEnter = tMove + (moved.length ? DUR * 0.7 : 0);
    const enterEnd = entering.length ? tEnter + (entering.length - 1) * STAGGER + DUR : tEnter;
    const ready: Record<string, number> = {};

    for (const e of exiting) {
      const to = { ...e.cur, o: 0 };
      if (e.spec.enter === "grow") { to.y = e.cur.y + e.cur.h * (1 - GROW); to.h = e.cur.h * GROW; }
      e.tw = { from: { ...e.cur }, to, start: now, delay: 0, remove: true };
    }
    for (const e of moved) {
      e.tw = { from: { ...e.cur }, to: { ...this.geo(e.spec), o: 1 }, start: now, delay: tMove };
      ready[e.id] = tMove + DUR;
    }
    entering.forEach(([id, spec], i) => {
      const to = { ...this.geo(spec), o: 1 };
      const from = { ...to, o: 0 };
      // grow 从 12% 展开：等待错峰的这段时间里保持透明，展开时一起淡入，不提前露出一截
      if (spec.enter === "grow") { from.y = to.y + to.h * (1 - GROW); from.h = to.h * GROW; }
      else if (spec.enter !== "fade") from.y = to.y + RISE;
      const e = this.addEnt(id, spec, from);
      const delay = tEnter + i * STAGGER;
      e.tw = { from, to, start: now, delay };
      ready[id] = delay + DUR;
    });

    for (const l of linkExit) {
      l.tw = { from: { draw: l.draw, o: l.o }, to: { draw: l.draw, o: 0 }, start: now, delay: 0, remove: true };
      this.dropPackets(l.id);
    }
    let j = 0;
    for (const [id, spec] of Object.entries(scene.links)) {
      const l = this.links.get(id);
      if (l) {
        l.spec = spec;
        l.el.setAttribute("class", spec.cls);
        applyVars(l.el, spec.vars);
        if (l.tw?.remove) l.tw = { from: { draw: l.draw, o: l.o }, to: { draw: 1, o: 1 }, start: now, delay: 0 };
        continue;
      }
      const nl = this.addLink(id, spec);
      const delay = Math.max(ready[spec.from] ?? 0, ready[spec.to] ?? 0, enterEnd - DUR * 0.3) + j * LINK_STAGGER;
      j += 1;
      const from = spec.enter === "fade" ? { draw: 1, o: 0 } : { draw: 0, o: 1 };
      nl.draw = from.draw;
      nl.o = from.o;
      nl.tw = { from, to: { draw: 1, o: 1 }, start: now, delay };
    }

    if (instant) this.snap();
    this.renderAll();
    this.kick();
  }

  /* ---------- 内部 ---------- */

  private group(name: string) {
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", `g-${name}`);
    this.svg.appendChild(g);
    return g;
  }

  private geo(s: EntSpec): Geo {
    return { x: s.x, y: s.y, w: s.w, h: s.h, o: 1 };
  }

  private addEnt(id: string, spec: EntSpec, cur: Geo): Ent {
    let shape: SVGRectElement | null = null;
    if (spec.cls !== "none") {
      shape = document.createElementNS(NS, "rect");
      (spec.layer === "back" ? this.gBack : this.gFront).appendChild(shape);
    }
    const label = spec.label != null ? document.createElement("span") : null;
    if (label) this.labels.appendChild(label);
    const e: Ent = { id, spec, cur, tw: null, shape, label };
    this.ents.set(id, e);
    this.restyle(e, spec);
    return e;
  }

  /** class 和文字立即换成新值；颜色的过渡交给 CSS transition。 */
  private restyle(e: Ent, spec: EntSpec) {
    e.spec = spec;
    if (e.shape) {
      e.shape.setAttribute("class", spec.cls);
      e.shape.setAttribute("rx", String(spec.r ?? 3));
      if (spec.pick) e.shape.dataset.pick = spec.pick;
      else delete e.shape.dataset.pick;
    }
    applyVars(e.shape, spec.vars);
    applyVars(e.label, spec.vars);
    if (e.label) {
      if (e.label.textContent !== spec.label) e.label.textContent = spec.label ?? "";
      e.label.className = `lbl ${spec.labelCls ?? ""}`.trim();
      e.label.dataset.at = spec.labelAt ?? "c";
    }
  }

  private addLink(id: string, spec: LinkSpec): Link {
    const el = document.createElementNS(NS, "path");
    el.setAttribute("class", spec.cls);
    applyVars(el, spec.vars);
    this.gLinks.appendChild(el);
    const l: Link = { id, spec, el, len: 0, draw: 1, o: 1, tw: null, acc: Math.random(), p: [] };
    this.links.set(id, l);
    return l;
  }

  private snap() {
    for (const e of [...this.ents.values()]) {
      if (!e.tw) continue;
      if (e.tw.remove) this.removeEnt(e);
      else { e.cur = { ...e.tw.to }; e.tw = null; }
    }
    for (const l of [...this.links.values()]) {
      if (!l.tw) continue;
      if (l.tw.remove) this.removeLink(l);
      else { l.draw = l.tw.to.draw; l.o = l.tw.to.o; l.tw = null; }
    }
  }

  private removeEnt(e: Ent) {
    e.shape?.remove();
    e.label?.remove();
    this.ents.delete(e.id);
  }

  private removeLink(l: Link) {
    this.dropPackets(l.id);
    l.el.remove();
    this.links.delete(l.id);
  }

  private kick = () => {
    if (!this.raf && this.visible && !document.hidden && this.hasWork()) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  private hasWork() {
    for (const e of this.ents.values()) if (e.tw) return true;
    for (const l of this.links.values()) if (l.tw) return true;
    // 数据包：暂停或减少动效时不需要逐帧更新
    if (this.reduced || this.paused) return false;
    for (const l of this.links.values()) if (l.spec.flow) return true;
    return this.packets.length > 0;
  }

  private frame = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, (now - this.last) / 1000); // 切回标签页时不跳帧
    this.last = now;
    if (this.stepTweens(now)) this.renderAll();
    this.stepPackets(dt);
    this.kick();
  };

  private stepTweens(now: number) {
    let busy = false;
    for (const e of [...this.ents.values()]) {
      const tw = e.tw;
      if (!tw) continue;
      busy = true;
      const p = Math.min(1, Math.max(0, (now - tw.start - tw.delay) / DUR));
      const k = EASE(p);
      e.cur = {
        x: lerp(tw.from.x, tw.to.x, k), y: lerp(tw.from.y, tw.to.y, k),
        w: lerp(tw.from.w, tw.to.w, k), h: lerp(tw.from.h, tw.to.h, k), o: lerp(tw.from.o, tw.to.o, k),
      };
      if (p >= 1) {
        e.tw = null;
        if (tw.remove) this.removeEnt(e);
      }
    }
    for (const l of [...this.links.values()]) {
      const tw = l.tw;
      if (!tw) continue;
      busy = true;
      const p = Math.min(1, Math.max(0, (now - tw.start - tw.delay) / DUR));
      const k = EASE(p);
      l.draw = lerp(tw.from.draw, tw.to.draw, k);
      l.o = lerp(tw.from.o, tw.to.o, k);
      if (p >= 1) {
        l.tw = null;
        if (tw.remove) this.removeLink(l);
      }
    }
    return busy;
  }

  private renderAll() {
    for (const e of this.ents.values()) {
      const { x, y, w, h, o } = e.cur;
      if (e.shape) {
        e.shape.setAttribute("x", String(r2(x)));
        e.shape.setAttribute("y", String(r2(y)));
        e.shape.setAttribute("width", String(r2(Math.max(0, w))));
        e.shape.setAttribute("height", String(r2(Math.max(0, h))));
        e.shape.setAttribute("opacity", String(r2(o)));
      }
      if (e.label) {
        const at = e.spec.labelAt ?? "c";
        const lx = at === "tl" || at === "bl" ? x : at === "br" ? x + w : x + w / 2;
        const ly = at === "c" ? y + h / 2 : at === "tl" ? y : y + h;
        e.label.style.left = `${r2(lx)}px`;
        e.label.style.top = `${r2(ly)}px`;
        e.label.style.opacity = String(r2(o));
      }
    }
    for (const l of this.links.values()) {
      const a = this.ents.get(l.spec.from);
      const b = this.ents.get(l.spec.to);
      if (!a || !b) continue;
      const x1 = a.cur.x + a.cur.w * (0.5 + (l.spec.fx ?? 0));
      const y1 = a.cur.y + a.cur.h;
      const x2 = b.cur.x + b.cur.w * (0.5 + (l.spec.tx ?? 0));
      const y2 = b.cur.y;
      const dy = (y2 - y1) * 0.55;
      l.p = [x1, y1, x1, y1 + dy, x2, y2 - dy, x2, y2];
      l.el.setAttribute("d", `M${r2(x1)},${r2(y1)} C${r2(x1)},${r2(y1 + dy)} ${r2(x2)},${r2(y2 - dy)} ${r2(x2)},${r2(y2)}`);
      l.len = l.el.getTotalLength();
      if (l.draw < 1) {
        l.el.style.strokeDasharray = `${r2(l.len)} ${r2(l.len)}`;
        l.el.style.strokeDashoffset = String(r2(l.len * (1 - l.draw)));
      } else {
        l.el.style.strokeDasharray = "";
        l.el.style.strokeDashoffset = "";
      }
      l.el.setAttribute("opacity", String(r2(l.o)));
    }
  }

  private stepPackets(dt: number) {
    if (this.reduced || this.paused) return;
    for (const l of this.links.values()) {
      if (!l.spec.flow || l.tw || l.draw < 1) continue;
      for (l.acc += dt * l.spec.flow; l.acc >= 1; l.acc -= 1) this.spawn(l);
    }
    const keep: Packet[] = [];
    for (const pk of this.packets) {
      const l = this.links.get(pk.link);
      if (!l || l.len < 1) { pk.el.remove(); continue; }
      pk.u += (SPEED * dt) / l.len;
      if (pk.u >= 1) { pk.el.remove(); continue; }
      const [x, y] = bezier(l.p, pk.u);
      pk.el.setAttribute("cx", String(r2(x)));
      pk.el.setAttribute("cy", String(r2(y)));
      pk.el.setAttribute("opacity", String(r2(Math.min(1, pk.u * 8, (1 - pk.u) * 8))));
      keep.push(pk);
    }
    this.packets = keep;
  }

  private spawn(l: Link) {
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", "3.2");
    el.setAttribute("class", "pkt");
    el.setAttribute("opacity", "0");
    applyVars(el, l.spec.vars);
    this.gPkts.appendChild(el);
    this.packets.push({ link: l.id, u: 0, el });
  }

  private dropPackets(linkId: string) {
    this.packets = this.packets.filter((pk) => {
      if (pk.link !== linkId) return true;
      pk.el.remove();
      return false;
    });
  }

  private clearPackets() {
    for (const pk of this.packets) pk.el.remove();
    this.packets = [];
  }

  private onClick = (ev: MouseEvent) => {
    const t = (ev.target as Element).closest?.("[data-pick]") as SVGElement | null;
    if (t?.dataset.pick) this.onPick?.(t.dataset.pick);
  };
}

/** 把 CSS 变量写到元素上；上一次写过、这次没有的变量清掉。 */
function applyVars(el: HTMLElement | SVGElement | null, vars?: Record<string, string>) {
  if (!el || (!vars && !el.dataset.vars)) return;
  for (const k of el.dataset.vars?.split(" ") ?? []) if (!vars || !(k in vars)) el.style.removeProperty(k);
  for (const [k, v] of Object.entries(vars ?? {})) el.style.setProperty(k, v);
  if (vars) el.dataset.vars = Object.keys(vars).join(" ");
  else delete el.dataset.vars;
}

/** 三次贝塞尔曲线上参数 u 处的点（p = [x1,y1, c1x,c1y, c2x,c2y, x2,y2]）。 */
function bezier(p: number[], u: number): [number, number] {
  const v = 1 - u;
  const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]];
}
