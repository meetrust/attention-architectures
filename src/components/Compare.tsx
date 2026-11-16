import * as React from "react";
import { Dialog } from "@cloudflare/kumo";
import { AnimatePresence, motion } from "motion/react";
import { Chip, TsButton } from "../kumo-ts/adapters";
import { FAM, GROUPS, groupFamilies } from "../data";
import { FamDots, Icon, Tail } from "./common";
import { stageFams } from "./Routes";

export const COMPARE_MAX = 3;

export function CompareTray({ ids, onRemove, onClear, onOpen }: {
  ids: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpen: () => void;
}) {
  const gs = ids.map((id) => GROUPS.find((g) => g.id === id)!);
  return (
    <AnimatePresence>
      {ids.length ? (
        <motion.div
          className="tray"
          role="region"
          aria-label="对比栏"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
        >
          <span className="tray-t">对比 <b>{ids.length}</b> / {COMPARE_MAX}</span>
          <ul className="tray-list">
            {gs.map((g) => (
              <li key={g.id}>
                <button type="button" className="tray-chip" onClick={() => onRemove(g.id)} aria-label={`${g.no} ${g.title}：移出对比`}>
                  <span className="tx">{g.no} {g.title}</span>
                  <span className="tray-x" aria-hidden="true"><Icon name="cross" /></span>
                </button>
              </li>
            ))}
          </ul>
          <div className="tray-acts">
            <TsButton tone="ghost" onClick={onClear}>清空</TsButton>
            <TsButton tone="primary" onClick={onOpen} disabled={ids.length < 2}>
              {ids.length < 2 ? "再选 1 组" : "开始对比"}
            </TsButton>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function CompareDialog({ ids, open, setOpen }: { ids: string[]; open: boolean; setOpen: (o: boolean) => void }) {
  const gs = ids.map((id) => GROUPS.find((g) => g.id === id)!);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog size="xl" className="w-[min(1080px,calc(100vw-32px))] max-w-none max-h-[calc(100dvh-48px)] overflow-auto p-0">
        <div className="cmp-head">
          <div>
            <Dialog.Title className="text-xl font-black">对比 {gs.length} 组模型</Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-kumo-subtle">架构描述取自原文，更正处单独标注；圆点与胶囊是机制分类。</Dialog.Description>
          </div>
          <Dialog.Close render={(p) => <TsButton {...(p as object)} tone="ghost">关闭</TsButton>} />
        </div>
        <div className="cmp-grid" style={{ "--k": Math.max(gs.length, 1) } as React.CSSProperties}>
          {gs.map((g) => (
            <section className="cmp-col" key={g.id} aria-labelledby={`cmp-${g.id}`}>
              <h3 id={`cmp-${g.id}`}><span className="no">{g.no}</span><Tail>{g.title}</Tail></h3>
              <div className="cmp-sec">
                <span>ROUTE</span>
                <div className="cmp-chips">
                  {g.stages.map((s, i) => (
                    <span key={s.route + i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {i > 0 ? <Icon name="to" className="rr-arrow" /> : null}
                      <span className="route-pill"><FamDots fams={stageFams(g, s)} />{s.route}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="cmp-sec">
                <span>MECHANISMS</span>
                <div className="cmp-chips">
                  {groupFamilies(g).map((m) => <Chip key={m} c={FAM[m].c}>{FAM[m].name}</Chip>)}
                </div>
              </div>
              <div className="cmp-sec">
                <span>ARCHITECTURE</span>
                {g.versions.map((v) => (
                  <React.Fragment key={v.id}>
                    <p className="cmp-ver" style={{ margin: 0 }}><b>{v.name}</b><Tail>{v.arch}</Tail></p>
                    {v.note ? <p className="t-note" style={{ margin: 0 }}><Tail>{`更正：${v.note}`}</Tail></p> : null}
                  </React.Fragment>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
