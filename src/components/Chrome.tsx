import * as React from "react";
import { CommandPalette, Dialog } from "@cloudflare/kumo";
import { AnimatePresence, motion } from "motion/react";
import { TsButton } from "../kumo-ts/adapters";
import { DATA_DATE, GROUPS, SOURCE_TITLE, VERSIONS } from "../data";
import { Icon, Tail, scrollToId } from "./common";

export const SECTIONS = [
  { id: "routes", no: "01", title: "路线", full: "技术路线迁移" },
  { id: "explorer", no: "02", title: "图鉴", full: "架构图鉴" },
  { id: "layers", no: "03", title: "层序", full: "层序对照" },
  { id: "table", no: "04", title: "原表", full: "原表对照" },
  { id: "sources", no: "05", title: "来源", full: "参考资料" },
];

/* ---------- 顶部导航 + 滚动定位 ---------- */
export function Nav({ onPalette }: { onPalette: () => void }) {
  const [active, setActive] = React.useState<string | null>(null);
  React.useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
        else if (window.scrollY < 200) setActive(null);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <header className="nav">
      <div className="nav-in">
        <a className="brand" href="#top" aria-label="Attention Architectures：回到顶部">
          <span className="brand-mark">ATTENTION ARCHITECTURES</span>
          <span className="brand-name">Attention 架构对照</span>
        </a>
        <nav aria-label="页内导航" className="nav-links">
          <ol>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={active === s.id ? "active" : undefined} aria-current={active === s.id ? "location" : undefined}>
                  <span className="n">{s.no}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <span className="nav-act">
          <TsButton onClick={onPalette} aria-keyshortcuts="Control+K Meta+K">快速定位</TsButton>
        </span>
      </div>
    </header>
  );
}

/* ---------- 快速定位（Kumo CommandPalette） ---------- */
type PItem = { id: string; title: string; sub: string; go: () => void };
type PGroup = { id: string; label: string; items: PItem[] };

export function Palette({ open, setOpen, openGroup }: { open: boolean; setOpen: (o: boolean) => void; openGroup: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const all: PGroup[] = React.useMemo(() => [
    { id: "sec", label: "章节", items: SECTIONS.map((s) => ({ id: `s-${s.id}`, title: `${s.no} ${s.full}`, sub: "跳到章节", go: () => scrollToId(s.id) })) },
    { id: "grp", label: "模型族", items: GROUPS.map((g) => ({ id: `g-${g.id}`, title: g.title, sub: g.org, go: () => openGroup(g.id) })) },
    { id: "ver", label: "版本", items: VERSIONS.map((v) => ({ id: `v-${v.id}`, title: v.name, sub: `${v.group.no} ${v.group.title}`, go: () => openGroup(v.group.id) })) },
  ], [openGroup]);
  const choose = (it: PItem) => { setOpen(false); setQ(""); window.setTimeout(it.go, 60); };
  const needle = q.trim().toLowerCase();
  const items = all
    .map((g) => ({ ...g, items: g.items.filter((i) => !needle || `${i.title} ${i.sub}`.toLowerCase().includes(needle)) }))
    .filter((g) => g.items.length);

  return (
    <CommandPalette.Root
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}
      items={items}
      value={q}
      onValueChange={setQ}
      itemToStringValue={(g: PGroup) => g.label}
      getSelectableItems={(gs: PGroup[]) => gs.flatMap((g) => g.items)}
      onSelect={(it: PItem) => choose(it)}
    >
      <Dialog.Title className="sr-only">快速定位</Dialog.Title>
      <CommandPalette.Input placeholder="输入模型、版本或章节" aria-label="快速定位" />
      <CommandPalette.List>
        <CommandPalette.Results>
          {(g: PGroup) => (
            <CommandPalette.Group key={g.id} items={g.items}>
              <CommandPalette.GroupLabel>{g.label}</CommandPalette.GroupLabel>
              <CommandPalette.Items>
                {(i: PItem) => (
                  <CommandPalette.Item key={i.id} value={i} onClick={() => choose(i)}>
                    <span>{i.title}</span>
                    <span className="pal-sub">{i.sub}</span>
                  </CommandPalette.Item>
                )}
              </CommandPalette.Items>
            </CommandPalette.Group>
          )}
        </CommandPalette.Results>
        <CommandPalette.Empty>没有匹配的结果，换个关键词试试。</CommandPalette.Empty>
      </CommandPalette.List>
    </CommandPalette.Root>
  );
}

/* ---------- 回到顶部 ---------- */
export function BackToTop() {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const f = () => setOn(window.scrollY > 900);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <AnimatePresence>
      {on ? (
        <motion.button
          type="button"
          className="totop fixed"
          aria-label="回到顶部"
          onClick={() => scrollToId("top")}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
        >
          <Icon name="up" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------- 页脚 ---------- */
export function Footer() {
  return (
    <footer className="foot wrap">
      <p>
        <Tail>{`数据来源：《${SOURCE_TITLE}》，核对于 ${DATA_DATE}。架构描述、技术路线与参考文献取自原文，其中 MiMo-V2-Flash 的层数已按官方 README 更正；机制分类与层序条码按原文整理，绘制规则写在 FIG.04 下方；FIG.01 只是示意，不代表任何模型的真实参数。`}</Tail>
      </p>
      <p>
        与
        <a href="https://meetrust.github.io/llm-visual-guide/" target="_blank" rel="noopener">《大模型可视化学习指南》</a>
        、
        <a href="https://meetrust.github.io/stanford-ai-courses/" target="_blank" rel="noopener">《斯坦福 AI 课程地图》</a>
        同一设计系列 · Tight Surface 白昼主题 · 源码见{" "}
        <a href="https://github.com/meetrust/attention-architectures" target="_blank" rel="noopener">GitHub</a>
      </p>
    </footer>
  );
}
