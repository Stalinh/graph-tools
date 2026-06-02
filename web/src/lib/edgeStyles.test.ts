import { describe, expect, it } from "vitest";
import { EDGE_STYLES, isEdgeStyle, normalizeEdgeStyle } from "./edgeStyles";

describe("edgeStyles", () => {
  it("recognizes every legal edge style", () => {
    for (const style of EDGE_STYLES) {
      expect(isEdgeStyle(style)).toBe(true);
      expect(normalizeEdgeStyle(style)).toBe(style);
    }
  });

  it("normalizes missing or invalid edge styles to note dash", () => {
    expect(isEdgeStyle(undefined)).toBe(false);
    expect(isEdgeStyle("dotted")).toBe(false);
    expect(normalizeEdgeStyle(undefined)).toBe("note-dash");
    expect(normalizeEdgeStyle("dotted")).toBe("note-dash");
  });
});
