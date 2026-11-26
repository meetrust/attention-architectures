/**
 * scene/attention.ts · FIG.01 注意力读取范围：示意模型 + 流动视图的画面描述。
 * 掩码网格与流动视图共用这里的 readSet，两种视图读取的位置永远一致。
 */
import type { EntSpec, LinkSpec, Scene } from "./engine";
import type { FamId } from "../data";

export const N = 16; // token 数
export const W = 4; // 窗口
export const K = 4; // Top-k（含自身）

/** 四种读取方式：id 就是机制家族的 id，名称和颜色都从 FAM 取，不另立对照表。 */
export const MODES = ["full", "swa", "sparse", "linear"] as const satisfies readonly FamId[];
export type Mode = (typeof MODES)[number];
export const isMode = (f: FamId): f is Mode => (MODES as readonly FamId[]).includes(f);

/** 示意用的确定性“索引器分数”：同一个 t 每次挑出的位置都一样。 */
const score = (t: number, j: number) => (j * 37 + t * 11 + j * j * 5) % 29;
const SCORE_MAX = 28;

export function readSet(mode: Mode, t: number): Set<number> {
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

/* ---------- 流动视图 ---------- */

/** 画面高度固定，切换方式时图不跳动。 */
export const FLOW_H = 228;
const PAD = 2;
const KEY_Y = 56; // token 行的顶边
const KEY_H = 20;
const STATE_Y = 118;
const STATE_H = 30;
const Q_Y = 186;
const Q_H = 34;
const FLOW = 0.75; // 每条读取连线每秒发出的数据包

export function buildFlowScene(mode: Mode, t: number, width: number): Scene {
  const w = Math.max(240, width);
  const pitch = (w - 2 * PAD) / N;
  const gap = Math.max(3, pitch * 0.2);
  const tokW = pitch - gap;
  const keyX = (j: number) => PAD + (j - 1) * pitch + gap / 2; // 第 j 个 token 的左边缘
  const port = (j: number) => ((j - 0.5) / N - 0.5) * 0.84; // 按位置排开入口，连线不交叉
  const read = readSet(mode, t);

  const ents: Record<string, EntSpec> = {};
  const links: Record<string, LinkSpec> = {};

  // 窗口：画在连线下面的区域框
  if (mode === "swa") {
    const lo = Math.max(1, t - W + 1);
    ents.win = {
      x: keyX(lo) - 4, y: KEY_Y - 5, w: (t - lo) * pitch + tokW + 8, h: KEY_H + 10, r: 6,
      cls: "zone", layer: "back", enter: "fade",
      label: `窗口 w = ${W}`, labelAt: "tl",
    };
  }

  // 稀疏：索引器给前 t − 1 个位置打分，柱高 = 分数，选中的 Top-k 用机制色
  if (mode === "sparse" && t > K) {
    ents.idx = { x: PAD, y: 22, w: 0, h: 0, cls: "none", enter: "fade", label: "索引器打分", labelAt: "tl" };
    for (let j = 1; j < t; j++) {
      const h = 3 + (score(t, j) / SCORE_MAX) * 24;
      ents[`s${j}`] = {
        x: keyX(j), y: KEY_Y - 6 - h, w: tokW, h, r: 2,
        cls: read.has(j) ? "bar is-pick" : "bar", enter: "grow",
      };
    }
  }

  // token 行
  for (let j = 1; j <= N; j++) {
    const state =
      j > t ? "is-future"
      : j === t ? "is-self"
      : mode === "linear" ? "is-fold"
      : read.has(j) ? "is-read"
      : "is-skip";
    ents[`k${j}`] = { x: keyX(j), y: KEY_Y, w: tokW, h: KEY_H, cls: `tok ${state}`, pick: String(j) };
  }
  // 行下的刻度：当前位置 t，以及两端的 1、16（与 t 重合时省掉）
  const tick = (j: number, text: string, cls: string): EntSpec => ({
    x: keyX(j), y: KEY_Y, w: tokW, h: KEY_H, cls: "none", enter: "fade", label: text, labelCls: cls,
    labelAt: j <= 2 ? "bl" : j >= N - 1 ? "br" : "b", // 两端贴边对齐，标签不出画面
  });
  ents.tick = tick(t, `t = ${t}`, "is-t");
  if (t > 2) ents.first = tick(1, "1", "is-axis");
  if (t < N - 1) ents.last = tick(N, String(N), "is-axis");

  // 查询，以及线性注意力的固定大小状态
  const qW = Math.min(240, w * 0.62);
  ents.q = { x: (w - qW) / 2, y: Q_Y, w: qW, h: Q_H, r: 6, cls: "box is-query", label: `查询 t = ${t}`, labelCls: "is-box" };

  if (mode === "linear") {
    const sW = Math.min(150, w * 0.4);
    const sx = w / 2 - qW / 4 - sW / 2;
    ents.state = { x: sx, y: STATE_Y, w: sW, h: STATE_H, r: 6, cls: "box is-state", label: "固定大小状态", labelCls: "is-box" };
    for (let j = 1; j < t; j++) {
      links[`f${j}`] = { from: `k${j}`, to: "state", tx: port(j), cls: "lk is-fold", enter: "fade" };
    }
    if (t > 1) links.s = { from: "state", to: "q", tx: -0.25, cls: "lk is-read", flow: FLOW * 1.2 };
    links[`sf${t}`] = { from: `k${t}`, to: "q", tx: 0.25, cls: "lk is-read", flow: FLOW * 1.2 };
  } else {
    for (const j of read) {
      links[`r${j}`] = { from: `k${j}`, to: "q", tx: port(j), cls: "lk is-read", flow: FLOW };
    }
  }

  return { w, h: FLOW_H, ents, links };
}
