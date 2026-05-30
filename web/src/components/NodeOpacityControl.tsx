import { useRef } from "react";
import { useI18n } from "../i18n";

interface NodeOpacityControlProps {
  value?: number;
  onChangePreview?: (opacity: number) => void;
  onChangeCommit?: (opacity: number) => void;
}

export function NodeOpacityControl({
  value = 1,
  onChangePreview,
  onChangeCommit,
}: NodeOpacityControlProps) {
  const { isZh } = useI18n();
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  const lastCommittedPercentRef = useRef<number | null>(percent);

  const commitChange = (target: EventTarget) => {
    const nextPercent = Number((target as HTMLInputElement).value);
    if (lastCommittedPercentRef.current === nextPercent) {
      return;
    }

    lastCommittedPercentRef.current = nextPercent;
    onChangeCommit?.(nextPercent / 100);
  };

  return (
    <section className="field-section">
      <div className="field-heading-row">
        <h3 className="field-label">{isZh ? "透明度" : "Opacity"}</h3>
        <span className="opacity-control__value">{percent}%</span>
      </div>
      <input
        type="range"
        className="opacity-control__slider"
        min={0}
        max={100}
        step={1}
        value={percent}
        aria-label={isZh ? "节点透明度" : "Node opacity"}
        onChange={(event) => {
          lastCommittedPercentRef.current = null;
          onChangePreview?.(Number(event.target.value) / 100);
        }}
        onMouseUp={(event) => commitChange(event.target)}
        onTouchEnd={(event) => commitChange(event.target)}
        onKeyUp={(event) => commitChange(event.target)}
      />
    </section>
  );
}
