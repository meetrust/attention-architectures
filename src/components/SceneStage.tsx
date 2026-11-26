import * as React from "react";
import { useReducedMotion } from "motion/react";
import { SceneEngine, type Scene } from "../scene/engine";

/**
 * 场景舞台：React 只负责把“画面描述”交给引擎（src/scene/engine.ts）；
 * 每帧的位置更新由引擎直接写 SVG 属性，不经过 React 渲染。
 *
 * build(width) 按容器实测宽度生成画面；sceneKey 变化时播放切换动画，宽度变化时直接跳到终态。
 */
export function SceneStage({ build, sceneKey, height, label, onPick, className = "", style }: {
  build: (width: number) => Scene;
  sceneKey: string;
  height: number;
  label: string;
  onPick?: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const host = React.useRef<HTMLDivElement>(null);
  const engine = React.useRef<SceneEngine | null>(null);
  const pick = React.useRef(onPick);
  pick.current = onPick;
  const buildRef = React.useRef(build);
  buildRef.current = build;
  const [width, setWidth] = React.useState(0);
  const lastWidth = React.useRef(0);
  const reduce = !!useReducedMotion();

  React.useEffect(() => {
    const el = host.current!;
    const e = new SceneEngine(el);
    e.onPick = (id) => pick.current?.(id);
    engine.current = e;
    lastWidth.current = 0;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => {
      ro.disconnect();
      e.destroy();
      engine.current = null;
    };
  }, []);

  React.useEffect(() => {
    engine.current?.setReduced(reduce);
  }, [reduce]);

  React.useEffect(() => {
    const e = engine.current;
    if (!e || !width) return;
    // 第一次出现时播放入场；之后只有宽度变化（旋转屏幕、折叠屏展开）才直接跳到终态
    const resized = lastWidth.current !== 0 && lastWidth.current !== width;
    lastWidth.current = width;
    e.goTo(buildRef.current(width), { instant: resized });
  }, [sceneKey, width]);

  return (
    <div
      ref={host}
      className={`scene-stage ${className}`.trim()}
      data-pickable={onPick ? "true" : undefined}
      role="img"
      aria-label={label}
      style={{ ...style, height }}
    />
  );
}
