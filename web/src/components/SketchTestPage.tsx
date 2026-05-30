import { useI18n } from "../i18n";

export function SketchTestPage() {
  const { isZh } = useI18n();
  return (
    <div
      className="sketch-test-page"
      style={{ padding: "2rem", textAlign: "center", color: "var(--color-muted)" }}
    >
      <p>{isZh ? "草图实验区暂未开放。" : "Sketch lab is not open yet."}</p>
    </div>
  );
}
