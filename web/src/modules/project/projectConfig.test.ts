import { describe, expect, it } from "vitest";
import {
  getSubLineWorkloadRatio,
  PROJECT_DEFAULT_SUB_LINE_TASK_NAMES,
  PROJECT_SUB_LINE_WORKLOAD_RATIO,
} from "./projectConfig";

describe("PROJECT_SUB_LINE_WORKLOAD_RATIO", () => {
  it("returns a number for every default subline task name", () => {
    for (const taskName of PROJECT_DEFAULT_SUB_LINE_TASK_NAMES) {
      const ratio = getSubLineWorkloadRatio(taskName);
      expect(ratio, `taskName=${taskName}`).toBeTypeOf("number");
    }
  });

  it("returns null for task names that are not registered", () => {
    expect(getSubLineWorkloadRatio("完全不在表里的名字")).toBeNull();
    expect(getSubLineWorkloadRatio("")).toBeNull();
  });

  it("exposes a known mapping for 主机设备", () => {
    expect(getSubLineWorkloadRatio("主机设备")).toBe(11);
  });

  it("sums to 100 across all registered ratios", () => {
    const total = Object.values(PROJECT_SUB_LINE_WORKLOAD_RATIO).reduce(
      (sum, value) => sum + value,
      0
    );
    expect(total).toBe(100);
  });
});

describe("PROJECT_DEFAULT_SUB_LINE_TASK_NAMES ordering", () => {
  it("places 三维建模 at the head and 评审交底 right after 平台", () => {
    expect(PROJECT_DEFAULT_SUB_LINE_TASK_NAMES[0]).toBe("三维建模");
    const platformIndex = PROJECT_DEFAULT_SUB_LINE_TASK_NAMES.indexOf("平台");
    expect(platformIndex).toBeGreaterThanOrEqual(0);
    expect(PROJECT_DEFAULT_SUB_LINE_TASK_NAMES[platformIndex + 1]).toBe("评审交底");
    expect(PROJECT_DEFAULT_SUB_LINE_TASK_NAMES).toHaveLength(17);
  });
});
