import * as React from "react";
import { Select } from "@cloudflare/kumo";
import { Chip } from "../kumo-ts/adapters";
import { FAM, GROUPS, type FamId } from "../data";
import { ROUTE_H, buildRouteScene, versionFams } from "../scene/routes";
import { SceneStage } from "./SceneStage";
import { FamDots, RouteArrow, Tail, cj, cvar, glue } from "./common";

/** 能回放的组：至少有两个版本。 */
const REPLAY = GROUPS.filter((g) => g.versions.length > 1);
const ITEMS: Record<string, string> = Object.fromEntries(REPLAY.map((g) => [g.id, `${g.no} ${g.title}`]));
const DEFAULT = REPLAY.find((g) => g.id === "minimax")!.id;

const names = (fs: FamId[]) => fs.map((f) => FAM[f].short).join("、");

/** FIG.02 上半部分：选一组模型，逐个版本回放机制的增减。 */
export function RouteReplay() {
  const [gid, setGid] = React.useState(DEFAULT);
  const [vi, setVi] = React.useState(0);
  const g = REPLAY.find((x) => x.id === gid)!;
  const v = g.versions[vi];
  const stage = g.stages.find((s) => s.versions.includes(v.id))!;
  const fams = versionFams(v);
  const prev = vi > 0 ? versionFams(g.versions[vi - 1]) : null;
  const added = prev ? fams.filter((f) => !prev.includes(f)) : [];
  const dropped = prev ? prev.filter((f) => !fams.includes(f)) : [];
  const kept = prev ? fams.filter((f) => prev.includes(f)) : [];

  const unitText = v.unit
    ? `重复单元（${v.unit.ratio}）：` + v.unit.segs.map((s) => cj(`${s.n} 层`, s.kind.label)).join("、")
    : "原文未列重复单元";
  const label = `${v.name}（${vi + 1} / ${g.versions.length}）用到的机制：${names(fams)}。${unitText}。`;

  return (
    <div className="rp">
      <div className="rp-ctrl">
        <div className="rp-sel">
          <Select
            label="回放"
            value={gid}
            onValueChange={(x) => { setGid((x as string) ?? DEFAULT); setVi(0); }}
            items={ITEMS}
            className="w-full"
          />
        </div>
        {/* 版本按钮与下方路线行同款：可换行，当前版本用 aria-current 标出 */}
        <ol className="rr-stages rp-vers" aria-label={cj(g.title, "的版本")}>
          {g.versions.map((x, i) => (
            <li key={x.id}>
              {i > 0 ? <RouteArrow /> : null}
              <button
                type="button"
                className="stage rp-ver"
                aria-current={i === vi ? "step" : undefined}
                onClick={() => setVi(i)}
              >
                <FamDots fams={versionFams(x)} />
                <span className="nm">{glue(x.name)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <SceneStage
        className="route-stage"
        build={(w) => buildRouteScene(g, vi, w)}
        sceneKey={`${g.id}:${vi}`}
        height={ROUTE_H}
        label={label}
      />

      <div className="rp-say" aria-live="polite">
        <p className="rp-head">
          <b>{glue(v.name)}</b>
          <span className="rp-step">{vi + 1}&nbsp;/ {g.versions.length}</span>
          <span>路线：{stage.route}</span>
        </p>
        <p className="rp-arch"><Tail>{v.arch}</Tail></p>
        {prev ? (
          <p className="rp-diff">
            <span>相比 {glue(g.versions[vi - 1].name)}</span>
            {added.length ? <span className="rp-diff-g"><span>新增</span>{added.map((f) => <Chip key={f} c={FAM[f].c}>{FAM[f].short}</Chip>)}</span> : null}
            {dropped.length ? <span className="rp-diff-g"><span>去掉</span>{dropped.map((f) => <Chip key={f} c={FAM[f].c}>{FAM[f].short}</Chip>)}</span> : null}
            {kept.length ? <span className="rp-diff-g"><span>保留</span>{kept.map((f) => <Chip key={f} c={FAM[f].c}>{FAM[f].short}</Chip>)}</span> : null}
          </p>
        ) : (
          <p className="rp-diff"><span><Tail>这一组的第一个版本，点上方的版本继续回放。</Tail></span></p>
        )}
        {v.unit ? (
          <ul className="fig-key rp-key" aria-label={unitText}>
            {v.unit.segs.map((s, i) => (
              <li key={i} style={cvar(s.kind.fam)}>
                <i aria-hidden="true" />
                <span>{glue(s.kind.label)}</span>
                <b>{s.n}</b>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
