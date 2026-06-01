/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRichEditorShortcutHelp } from "./useRichEditorShortcutHelp";

describe("useRichEditorShortcutHelp", () => {
  it("filters shortcuts by localized descriptions", () => {
    const { result } = renderHook(() => useRichEditorShortcutHelp(false));

    act(() => {
      result.current.setHelpSearch("checklist automatically");
    });

    expect(result.current.filteredShortcuts.map((item) => item.id)).toContain("checklist-create");
  });

  it("resets search text when help is opened, toggled, or closed", () => {
    const { result } = renderHook(() => useRichEditorShortcutHelp(true));

    act(() => {
      result.current.setHelpSearch("保存");
      result.current.openHelp();
    });
    expect(result.current.isHelpOpen).toBe(true);
    expect(result.current.helpSearch).toBe("");

    act(() => {
      result.current.setHelpSearch("撤销");
      result.current.toggleHelp();
    });
    expect(result.current.isHelpOpen).toBe(false);
    expect(result.current.helpSearch).toBe("");

    act(() => {
      result.current.setHelpSearch("关闭");
      result.current.closeHelp();
    });
    expect(result.current.isHelpOpen).toBe(false);
    expect(result.current.helpSearch).toBe("");
  });
});
