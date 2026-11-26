import * as React from "react";
import { motion } from "motion/react";
import { FilterButton } from "../kumo-ts/adapters";
import {
  FAM, FAMILIES, FAMILY_COUNTS, GROUPS, SWITCHED, VERSION_BY_ID,
  groupFamilies, type FamId, type Group, type Stage,
} from "../data";
import { FamDots, RouteArrow, SectionHead, Tail, cj, cvar, glue } from "./common";

export function stageFams(g: Group, s: Stage): FamId[] {
  const set = new Set(s.versions.flatMap((id) => g.versions.find((v) => v.id === id)!.mech));
  return FAMILIES.map((f) => f.id).filter((id) => set.has(id));
}
const stageVersions = (s: Stage) => s.versions.map((id) => VERSION_BY_ID[id].name).join(" · ");

const SCALE = 12; // 条形刻度上限：0、3、6、9、12，与 25% 网格线对齐

export function Routes({ onOpen }: { onOpen: (groupId: string) => void }) {
  const [pin, setPin] = React.useState<FamId | null>(null);
  const total = GROUPS.length;
  const sparse = FAMILY_COUNTS.find((f) => f.fam.id === "sparse")!;
  const maxLatest = Math.max(...FAMILY_COUNTS.map((f) => f.latest));
  const full = FAMILY_COUNTS.find((f) => f.fam.id === "full")!;

  return (
    <section className="sec wrap" id="routes" aria-labelledby="routes-h">
      <SectionHead idx="01" title="技术路线迁移" meta="Routes" id="routes-h" />
      <p className="sec-lead">
        <Tail>每一行是一组模型，箭头表示版本演进，圆点是这一段用到的机制。点选一类机制，相关的组保持清晰、其余变淡，再点一次取消；点击任一段路线可以跳到架构图鉴。</Tail>
      </p>

      <div className="fam-filter" role="group" aria-label="按机制高亮">
        <FilterButton pressed={pin === null} onPressedChange={() => setPin(null)}>全部</FilterButton>
        {FAMILY_COUNTS.map(({ fam, groups }) => (
          <FilterButton key={fam.id} pressed={pin === fam.id} onPressedChange={(p) => setPin(p ? fam.id : null)}>
            <span className="fdot">
              <i className="fam-dot" style={cvar(fam.id)} aria-hidden="true" />
              {fam.short}
              <span className="cnt">{groups}</span>
            </span>
          </FilterButton>
        ))}
      </div>

      <div className="route-figs">
        <figure className="fig" aria-labelledby="fig02-cap">
          <figcaption id="fig02-cap">
            <b>FIG.02&nbsp;· 技术路线迁移</b>
            <span>{glue(pin ? `高亮：${FAM[pin].name}` : `${total} 组模型 · 箭头为版本演进`)}</span>
          </figcaption>
          <div className="fig-body">
            <ol className="routes">
              {GROUPS.map((g) => {
                const hit = !pin || groupFamilies(g).includes(pin);
                return (
                  <motion.li key={g.id} className="rr" initial={false} animate={{ opacity: hit ? 1 : 0.3 }} data-hit={hit}>
                    <div className="rr-head">
                      <span className="rr-no">{g.no}</span>
                      <span className="rr-title"><Tail>{g.title}</Tail></span>
                      <span className="rr-org">{g.org}</span>
                    </div>
                    <ol className="rr-stages" aria-label={cj(g.title, "的技术路线")}>
                      {g.stages.map((s, i) => {
                        const sf = stageFams(g, s);
                        const on = !!pin && sf.includes(pin);
                        const vn = stageVersions(s);
                        return (
                          <li key={s.route + i}>
                            {i > 0 ? <RouteArrow /> : null}
                            <button
                              type="button"
                              className="stage"
                              data-hit={on}
                              style={pin ? ({ "--hc": `var(--${FAM[pin].c})` } as React.CSSProperties) : undefined}
                              onClick={() => onOpen(g.id)}
                              aria-label={`${s.route} ${vn}：在架构图鉴中查看`}
                            >
                              <FamDots fams={sf} />
                              <span className="rt">{s.route}</span>{" "}
                              <span className="vn">{glue(vn)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </motion.li>
                );
              })}
            </ol>
          </div>
          <div className="fig-foot">
            <ul className="fig-key" aria-label="机制图例">
              {FAMILY_COUNTS.map(({ fam, groups }) => (
                <li key={fam.id} style={cvar(fam.id)}>
                  <i aria-hidden="true" />
                  <span>{glue(fam.name)}</span>
                  <b>{groups}</b>
                </li>
              ))}
            </ul>
          </div>
        </figure>

        <figure className="fig" aria-labelledby="fig03-cap">
          <figcaption id="fig03-cap">
            <b>FIG.03&nbsp;· 机制出现在多少组里</b>
            <span><Tail>深色：最新版本仍在使用 · 浅色：任一版本使用过</Tail></span>
          </figcaption>
          <div className="fig-body">
            <ul className="bars duo">
              {FAMILY_COUNTS.map(({ fam, groups, latest }) => (
                <li key={fam.id} style={cvar(fam.id)}>
                  <span className="nm"><i className="fam-dot" aria-hidden="true" style={cvar(fam.id)} />{glue(fam.name)}</span>
                  <span className="tr" role="img" aria-label={`${fam.name}：${groups} 组用过，其中 ${latest} 组的最新版本仍在使用`}>
                    <motion.span className="any" style={{ width: `${(groups / SCALE) * 100}%`, height: "100%" }} initial={{ scaleX: 0.12 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} />
                    <motion.span className="now" style={{ width: `${(latest / SCALE) * 100}%`, height: "100%" }} initial={{ scaleX: 0.12 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} />
                  </span>
                  <span className="vl" aria-hidden="true"><b>{latest}</b><span> / {groups}</span></span>
                </li>
              ))}
            </ul>
            <div className="bars-axis duo" aria-hidden="true">
              <span />
              <span className="ticks">{[0, 3, 6, 9, 12].map((x) => <span key={x}>{x}</span>)}</span>
              <span />
            </div>
          </div>
          <div className="fig-foot duo-key">
            <span><i className="now" aria-hidden="true" />最新版本仍在使用</span>
            <span><i aria-hidden="true" />任一版本使用过</span>
            <span>单位：组，共 {total} 组</span>
          </div>
        </figure>
      </div>

      <ul className="route-notes">
        <li>
          <b>{sparse.latest}<small>/ {total}</small></b>
          <Tail>{`组的最新版本含稀疏注意力${sparse.latest === maxLatest ? `，是 ${FAMILIES.length} 类机制里最多的` : ""}。`}</Tail>
        </li>
        <li>
          <b>{SWITCHED.length}<small>/ {total}</small></b>
          <Tail>{`组换过路线：${SWITCHED.map((g) => g.org).join("、")}。`}</Tail>
        </li>
        <li>
          <b>{full.latest}<small>/ {full.groups}</small></b>
          <Tail>{`用过全局层的 ${full.groups} 组里，只有 ${full.latest} 组的最新版本还保留全局层。`}</Tail>
        </li>
      </ul>
    </section>
  );
}
