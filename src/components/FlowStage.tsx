import { FLOW_H, buildFlowScene, type Mode } from "../scene/attention";
import type { FamId } from "../data";
import { cvar } from "./common";
import { SceneStage } from "./SceneStage";

/** FIG.01 的流动视图（FIG.04 的逐层读取也用它）：t 个 token 中，查询位置 t 读取哪些位置。 */
export function FlowStage({ mode, t, fam, label, onPick }: {
  mode: Mode;
  t: number;
  fam: FamId;
  label: string;
  /** 不传时 token 不可点，只做展示 */
  onPick?: (t: number) => void;
}) {
  return (
    <SceneStage
      className="flow-stage"
      build={(w) => buildFlowScene(mode, t, w)}
      sceneKey={`${mode}:${t}`}
      height={FLOW_H}
      label={label}
      onPick={onPick ? (id) => onPick(Number(id)) : undefined}
      style={cvar(fam)}
    />
  );
}
