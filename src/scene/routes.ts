/**
 * scene/routes.ts · FIG.02 路线回放：一组模型的某个版本 → 画面描述。
 * 上排是这个版本用到的机制（version.mech），下排是原文给出的重复单元（version.unit）；
 * 数据包从机制流向用这种机制的层。切换版本时，引擎按差异播放：去掉的机制淡出，保留的移位，新增的进入。
 * 只画数据里有的东西：没有重复单元的版本显示占位框，不推测比例。
 */
import type { EntSpec, LinkSpec, Scene } from "./engine";
import { FAM, FAMILIES, type FamId, type Group, type Version } from "../data";

export const ROUTE_H = 196;
const PAD = 2;
const MECH_Y = 26;
const MECH_H = 34;
const CELL_Y = 124;
const CELL_H = 30;
const FLOW = 0.5;

/** 版本用到的机制，按图例顺序排列（与页面其他图一致）。 */
export function versionFams(v: Version): FamId[] {
  return FAMILIES.map((f) => f.id).filter((id) => v.mech.includes(id));
}

const colour = (f: FamId) => ({ "--c": `var(--${FAM[f].c})` });

export function buildRouteScene(g: Group, vi: number, width: number): Scene {
  const v = g.versions[vi];
  const w = Math.max(240, width);
  const fams = versionFams(v);
  const ents: Record<string, EntSpec> = {};
  const links: Record<string, LinkSpec> = {};

  // 上排：机制块
  const gap = 12;
  const bw = Math.min(112, (w - 2 * PAD - (fams.length - 1) * gap) / fams.length);
  const bx0 = (w - (fams.length * bw + (fams.length - 1) * gap)) / 2;
  ents.mnote = { x: PAD, y: MECH_Y - 2, w: 0, h: 0, cls: "none", enter: "fade", label: "机制", labelAt: "tl" };
  fams.forEach((f, k) => {
    ents[`m-${f}`] = {
      x: bx0 + k * (bw + gap), y: MECH_Y, w: bw, h: MECH_H, r: 6,
      cls: "mech", label: FAM[f].short, labelCls: "is-mech", vars: colour(f),
    };
  });

  // 下排：重复单元的每一层
  if (v.unit) {
    const cells = v.unit.segs.flatMap((s) => Array.from({ length: s.n }, () => s.kind));
    const n = cells.length;
    const cg = 4;
    const cw = Math.min(34, (w * 0.72 - (n - 1) * cg) / n);
    const cx0 = (w - (n * cw + (n - 1) * cg)) / 2;
    const seen: Partial<Record<FamId, number>> = {};
    const per: Partial<Record<FamId, number>> = {};
    cells.forEach((k) => { per[k.fam] = (per[k.fam] ?? 0) + 1; });
    cells.forEach((k, i) => {
      // 按“机制 + 第几层”命名：换版本时，两个版本都有的那类层原地移位，而不是把别的层改个颜色
      const j = (seen[k.fam] = (seen[k.fam] ?? -1) + 1);
      const id = `u-${k.fam}-${j}`;
      ents[id] = { x: cx0 + i * (cw + cg), y: CELL_Y, w: cw, h: CELL_H, r: 3, cls: "cell", vars: colour(k.fam) };
      if (!fams.includes(k.fam)) return;
      // 同一机制连向多层时，出口在机制块底边上按顺序排开
      const m = per[k.fam]!;
      links[`l-${k.fam}-${j}`] = {
        from: `m-${k.fam}`, to: id, fx: m > 1 ? (j / (m - 1) - 0.5) * 0.7 : 0,
        cls: "lk", flow: FLOW, vars: colour(k.fam),
      };
    });
    // 比例不同时作为新标签淡入，不在原处换字
    ents[`ratio:${v.unit.ratio}`] = {
      x: cx0, y: CELL_Y, w: n * cw + (n - 1) * cg, h: CELL_H, cls: "none", enter: "fade",
      label: `重复单元：${v.unit.ratio}`, labelAt: "b",
    };
  } else {
    const nw = Math.min(240, w - 2 * PAD);
    ents.none = {
      x: (w - nw) / 2, y: CELL_Y, w: nw, h: CELL_H, r: 6, cls: "cell-none", enter: "fade",
      label: v.stack ? `完整 ${v.stack.seq.length} 层见 FIG.04` : "原文未列重复单元",
    };
  }

  return { w, h: ROUTE_H, ents, links };
}
