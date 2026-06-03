import { describe, expect, it } from 'vitest';
import {
  createProjectRecord,
  compareProjectLineNos,
  sortProjectRecords,
  createProjectSubLine,
  calculateProjectProgressFromSubLines,
} from './projectModel';
import type { ProjectSubLineStatus } from './projectTypes';

describe('compareProjectLineNos', () => {
  it('sorts by year ascending, then by code ascending', () => {
    expect(compareProjectLineNos('202501', '202601')).toBeLessThan(0);
    expect(compareProjectLineNos('202601', '202602')).toBeLessThan(0);
    expect(compareProjectLineNos('202602', '202509')).toBeGreaterThan(0);
  });

  it('puts empty line numbers at the end', () => {
    expect(compareProjectLineNos('', '202601')).toBeGreaterThan(0);
    expect(compareProjectLineNos('202601', '')).toBeLessThan(0);
    expect(compareProjectLineNos('', '')).toBe(0);
  });

  it('handles non-numeric or malformed values gracefully', () => {
    expect(compareProjectLineNos('abc', '202601')).toBeGreaterThan(0);
    expect(compareProjectLineNos('202601', 'abc')).toBeLessThan(0);
  });
});

describe('sortProjectRecords', () => {
  it('sorts records correctly based on lineNo', () => {
    const r1 = createProjectRecord({ lineNo: '202602', projectName: 'P1' });
    const r2 = createProjectRecord({ lineNo: '202509', projectName: 'P2' });
    const r3 = createProjectRecord({ lineNo: '202601', projectName: 'P3' });
    const r4 = createProjectRecord({ lineNo: '', projectName: 'P4' });

    const sorted = sortProjectRecords([r1, r2, r3, r4]);
    expect(sorted.map((r) => r.projectName)).toEqual(['P2', 'P3', 'P1', 'P4']);
  });
});

describe('calculateProjectProgressFromSubLines', () => {
  it('calculates 0 if no sublines are provided', () => {
    expect(calculateProjectProgressFromSubLines([])).toBe('0');
  });

  it('calculates 0 if all sublines are unprocessed or other non-done statuses', () => {
    const sl1 = createProjectSubLine({ taskName: '三维建模', status: '未处理' });
    const sl2 = createProjectSubLine({ taskName: '主机设备', status: '待处理' });
    const sl3 = createProjectSubLine({ taskName: '常规外购', status: '等待中' });
    expect(calculateProjectProgressFromSubLines([sl1, sl2, sl3])).toBe('0');
  });

  it('sum up workload ratios for done/processed sublines', () => {
    // 三维建模: 26.5, 主机设备: 11
    const sl1 = createProjectSubLine({ taskName: '三维建模', status: '已提资/已完成' });
    const sl2 = createProjectSubLine({ taskName: '主机设备', status: '已提资/已完成' });
    const sl3 = createProjectSubLine({ taskName: '常规外购', status: '待处理' });
    // Total is 26.5 + 11 = 37.5. Round to nearest integer: 38.
    expect(calculateProjectProgressFromSubLines([sl1, sl2, sl3])).toBe('38');
  });

  it('handles legacy statuses and maps them to done status', () => {
    // 三维建模: 26.5, 预制件: 10
    const sl1 = createProjectSubLine({
      taskName: '三维建模',
      status: '已处理' as unknown as ProjectSubLineStatus,
    });
    const sl2 = createProjectSubLine({
      taskName: '预制件',
      status: '已提资' as unknown as ProjectSubLineStatus,
    });
    expect(calculateProjectProgressFromSubLines([sl1, sl2])).toBe('37'); // 26.5 + 10 = 36.5 -> 37
  });
});
