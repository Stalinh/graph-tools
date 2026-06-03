import { describe, expect, it } from 'vitest';
import { createProjectRecord, compareProjectLineNos, sortProjectRecords } from './projectModel';

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
