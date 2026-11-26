import * as React from "react";
import { Checkbox, Input, Select } from "@cloudflare/kumo";
import { AnimatePresence, motion } from "motion/react";
import { Chip, ResourceButton, TsButton } from "../kumo-ts/adapters";
import {
  FAM, FAMILIES, GROUPS, REF_BY_NO, groupFamilies, groupHaystack, refLabel, stackCounts,
  type FamId, type Group,
} from "../data";
import { FamDots, RouteArrow, SectionHead, Tail, UnitBar, cvar, glue, useMedia } from "./common";
import { stageFams } from "./Routes";

export const routeText = (g: Group) => g.stages.map((s) => s.route).join(" → ");

/** 复制用的纯文本摘录：原文架构、技术路线与参考文献链接。 */
export function groupExcerpt(g: Group) {
  const refs = [...new Set(g.versions.flatMap((v) => v.refs))].map((n) => {
    const r = REF_BY_NO[n];
    return `[${refLabel(n)}] ${r.title}｜${r.kind} · ${r.src} · ${r.url}`;
  });
  return [
    `${g.no} ${g.title}`,
    ...g.versions.map((v) => `${v.name}：${v.arch}`),
    `技术路线：${routeText(g)}`,
    "参考文献：",
    ...refs,
  ].join("\n");
}

type DetailProps = {
  g: Group;
  inCompare: boolean;
  onToggleCompare: (id: string, next: boolean) => void;
  onCopy: (g: Group) => void;
  onShowStack: (versionId: string) => void;
};

function GroupDetail({ g, inCompare, onToggleCompare, onCopy, onShowStack }: DetailProps) {
  return (
    <article className="exd" id={`exd-${g.id}`} aria-labelledby={`exd-h-${g.id}`}>
      <header className="exd-head">
        <span className="exd-no" aria-hidden="true">{g.no}</span>
        <div>
          <p className="eyebrow">{g.org}</p>
          <h3 id={`exd-h-${g.id}`}><Tail>{g.title}</Tail></h3>
        </div>
        <ol className="exd-route" aria-label="技术路线">
          {g.stages.map((s, i) => (
            <li key={s.route + i}>
              {i > 0 ? <RouteArrow /> : null}
              <span className="route-pill"><FamDots fams={stageFams(g, s)} />{s.route}</span>
            </li>
          ))}
        </ol>
      </header>
      <ol className="exd-body">
        {g.versions.map((v) => (
          <li className="ver" key={v.id}>
            <div className="ver-head">
              <h4>{glue(v.name)}</h4>
              <div className="ver-mech">
                {v.mech.map((m) => <Chip key={m} c={FAM[m].c}>{FAM[m].name}</Chip>)}
              </div>
            </div>
            <p className="ver-arch"><Tail>{v.arch}</Tail></p>
            {v.note ? <p className="ver-note"><b>更正</b><Tail>{v.note}</Tail></p> : null}
            {v.unit ? (
              <UnitBar unit={v.unit} />
            ) : v.stack ? (
              <div className="ver-stack">
                <span className="unit-key">
                  {v.stack.kinds.map((k, i) => (
                    <span key={k.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <i style={cvar(k.fam)} aria-hidden="true" />
                      {stackCounts(v.stack!)[i]} {k.label}
                    </span>
                  ))}
                </span>
                <TsButton size="sm" onClick={() => onShowStack(v.id)}>查看 {v.stack.seq.length} 层条码</TsButton>
              </div>
            ) : (
              <p className="unit-none">没有画重复单元：文中没有给出各类层的数量或比例。</p>
            )}
            <div className="ver-refs">
              {v.refs.map((n) => {
                const r = REF_BY_NO[n];
                return <ResourceButton key={n} title={`[${refLabel(n)}] ${r.title}｜${r.kind}`} note={r.src} href={r.url} />;
              })}
            </div>
          </li>
        ))}
      </ol>
      <footer className="exd-foot">
        <Checkbox label="加入对比" checked={inCompare} onCheckedChange={(c) => onToggleCompare(g.id, !!c)} />
        <div className="acts">
          <TsButton onClick={() => onCopy(g)}>复制本组摘录</TsButton>
        </div>
      </footer>
    </article>
  );
}

type ExplorerProps = {
  sel: string;
  setSel: (id: string) => void;
  compare: string[];
  onToggleCompare: (id: string, next: boolean) => void;
  onCopy: (g: Group) => void;
  onShowStack: (versionId: string) => void;
};

const FAM_ITEMS: Record<string, string> = { all: "全部机制", ...Object.fromEntries(FAMILIES.map((f) => [f.id, f.name])) };

export function Explorer({ sel, setSel, compare, onToggleCompare, onCopy, onShowStack }: ExplorerProps) {
  const [q, setQ] = React.useState("");
  const [fam, setFam] = React.useState<string>("all");
  const narrow = useMedia("(max-width: 759px)");
  const needle = q.trim().toLowerCase();
  const list = GROUPS.filter(
    (g) => (!needle || groupHaystack(g).includes(needle)) && (fam === "all" || groupFamilies(g).includes(fam as FamId)),
  );
  const visible = list.find((g) => g.id === sel);
  const current = visible ?? (narrow ? undefined : list[0]);

  // 从路线图或快速定位选中一组、而它被当前搜索或筛选挡住时，清掉筛选，让选中的组可见
  React.useEffect(() => {
    if (!sel) return;
    const g = GROUPS.find((x) => x.id === sel);
    const hidden = g && ((needle && !groupHaystack(g).includes(needle)) || (fam !== "all" && !groupFamilies(g).includes(fam as FamId)));
    if (hidden) { setQ(""); setFam("all"); }
  }, [sel]); // 有意只跟随 sel：用户之后改搜索或筛选时不再触发

  // 宽屏：当前项被筛掉时，详情跟到列表第一项
  React.useEffect(() => {
    if (!narrow && list.length && !visible) setSel(list[0].id);
  }, [narrow, needle, fam]); // 有意不跟随 sel 与 list：只在宽窄屏或筛选条件变化时校正

  const detail = (g: Group) => (
    <GroupDetail g={g} inCompare={compare.includes(g.id)} onToggleCompare={onToggleCompare} onCopy={onCopy} onShowStack={onShowStack} />
  );
  const clear = () => { setQ(""); setFam("all"); };

  return (
    <section className="sec wrap" id="explorer" aria-labelledby="explorer-h">
      <SectionHead idx="02" title="架构图鉴" meta="Explorer" id="explorer-h" />
      <p className="sec-lead">
        <Tail>按模型族查看每个版本的原文架构、机制分类、重复单元和参考文献。勾选“加入对比”，最多可以把 3 组放在一起看。</Tail>
      </p>
      <div className="ex-tools">
        <div className="ex-q">
          <Input label="搜索" placeholder="模型名、机制或关键词，如 KDA" value={q} onChange={(e) => setQ(e.target.value)} className="w-full" />
        </div>
        <div className="ex-f">
          <Select label="机制" value={fam} onValueChange={(v) => setFam((v as string) ?? "all")} items={FAM_ITEMS} className="w-full" />
        </div>
        <p className="ex-count" role="status"><b>{list.length}</b> / {GROUPS.length} 组</p>
      </div>

      {list.length === 0 ? (
        <div className="empty" role="status">
          <p style={{ margin: "0 0 12px" }}>没有匹配的模型。换个关键词，或把机制改回“全部机制”。</p>
          <TsButton onClick={clear}>清除筛选</TsButton>
        </div>
      ) : (
        <div className="explorer">
          <ul className="ex-list" aria-label="模型族">
            {list.map((g) => {
              const on = current?.id === g.id;
              return (
                <li key={g.id} id={`g-${g.id}`}>
                  <button
                    type="button"
                    className="ex-item"
                    aria-current={on ? "true" : undefined}
                    aria-expanded={narrow ? on : undefined}
                    aria-controls={narrow ? (on ? `exd-${g.id}` : undefined) : "ex-pane"}
                    onClick={() => setSel(narrow && on ? "" : g.id)}
                  >
                    <span className="no">{g.no}</span>
                    <span className="tt"><Tail>{g.title}</Tail></span>
                    <span className="rt">{routeText(g)}</span>
                    <FamDots fams={groupFamilies(g)} />
                  </button>
                  {narrow ? (
                    <AnimatePresence initial={false}>
                      {on ? (
                        <motion.div className="ex-inline" key="d" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          {detail(g)}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {!narrow && current ? (
            <div className="ex-pane" id="ex-pane" role="region" aria-label="模型族详情" tabIndex={-1}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  {detail(current)}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
