import * as React from "react";
import { Toasty, useKumoToastManager } from "@cloudflare/kumo";
import { MotionConfig, useReducedMotion } from "motion/react";
import { GROUPS, VERSION_BY_ID, type Group } from "./data";
import { copyText, scrollToId } from "./components/common";
import { Hero } from "./components/Hero";
import { Routes } from "./components/Routes";
import { Explorer, groupExcerpt } from "./components/Explorer";
import { Layers } from "./components/Layers";
import { SourceTable, Sources } from "./components/Reference";
import { COMPARE_MAX, CompareDialog, CompareTray } from "./components/Compare";
import { BackToTop, Footer, Nav, Palette } from "./components/Chrome";

function Shell() {
  const toast = useKumoToastManager();
  const [sel, setSel] = React.useState(GROUPS[0].id);
  const [compare, setCompare] = React.useState<string[]>([]);
  const [cmpOpen, setCmpOpen] = React.useState(false);
  const [palOpen, setPalOpen] = React.useState(false);
  const [stackFocus, setStackFocus] = React.useState<string | null>(null);

  // Ctrl / ⌘ + K 打开快速定位
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openGroup = React.useCallback((id: string) => {
    setSel(id);
    const narrow = window.matchMedia("(max-width: 759px)").matches;
    window.requestAnimationFrame(() => scrollToId(narrow ? `g-${id}` : "explorer"));
  }, []);

  const toggleCompare = (id: string, next: boolean) => {
    setCompare((cur) => {
      if (!next) return cur.filter((x) => x !== id);
      if (cur.includes(id)) return cur;
      if (cur.length >= COMPARE_MAX) {
        toast.add({ title: `最多同时对比 ${COMPARE_MAX} 组`, description: "先在下方对比栏移出一组，再加入新的。", variant: "warning" });
        return cur;
      }
      return [...cur, id];
    });
  };

  const onCopy = async (g: Group) => {
    const ok = await copyText(groupExcerpt(g));
    toast.add(
      ok
        ? { title: "已复制本组摘录", description: `${g.no} ${g.title}：原文架构、技术路线与参考文献链接。`, variant: "success" }
        : { title: "复制失败", description: "浏览器拦截了剪贴板，请在第 04 节的原表中手动选取。", variant: "error" },
    );
  };

  const showStack = (versionId: string) => {
    setStackFocus(null);
    window.requestAnimationFrame(() => {
      setStackFocus(versionId);
      scrollToId(`ls-${versionId}`);
    });
  };

  return (
    <div className="app ts-dot-bg isolate" data-tray={compare.length ? "on" : undefined}>
      <a className="skip" href="#routes">跳到正文</a>
      <Nav onPalette={() => setPalOpen(true)} />
      <main>
        <Hero />
        <Routes onOpen={openGroup} />
        <Explorer sel={sel} setSel={setSel} compare={compare} onToggleCompare={toggleCompare} onCopy={onCopy} onShowStack={showStack} />
        <Layers focus={stackFocus && VERSION_BY_ID[stackFocus]?.stack ? stackFocus : null} />
        <SourceTable />
        <Sources />
      </main>
      <Footer />
      <CompareTray
        ids={compare}
        onRemove={(id) => toggleCompare(id, false)}
        onClear={() => setCompare([])}
        onOpen={() => setCmpOpen(true)}
      />
      <CompareDialog ids={compare} open={cmpOpen && compare.length >= 2} setOpen={setCmpOpen} />
      <Palette open={palOpen} setOpen={setPalOpen} openGroup={openGroup} />
      <BackToTop />
    </div>
  );
}

export function App() {
  const reduce = useReducedMotion();
  return (
    <MotionConfig reducedMotion="user" transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
      <Toasty>
        <Shell />
      </Toasty>
    </MotionConfig>
  );
}
