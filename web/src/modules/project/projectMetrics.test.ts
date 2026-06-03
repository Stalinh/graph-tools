import { describe, expect, it } from 'vitest';
import { createProjectRecord, createProjectSubLine } from './projectModel';
import { calculateProjectMetrics } from './projectMetrics';
import type { ProjectRecord } from './projectTypes';

function createRecordWithProgress(progress: string): ProjectRecord {
  return { ...createProjectRecord({ projectName: `Progress ${progress}` }), progress };
}

describe('calculateProjectMetrics', () => {
  it('returns zeroed metrics for an empty project portfolio', () => {
    expect(calculateProjectMetrics([])).toEqual({
      projectCount: 0,
      subLineCount: 0,
      averageProgress: 0,
      completedProjectCount: 0,
      activeProjectCount: 0,
      notStartedProjectCount: 0,
      completedSubLineCount: 0,
      waitingSubLineCount: 0,
      pendingSubLineCount: 0,
      completedSubLineRatio: 0,
      unconfiguredWorkloadSubLineCount: 0,
    });
  });

  it('counts project progress buckets and average progress', () => {
    const records = [
      createRecordWithProgress('0'),
      createRecordWithProgress('40'),
      createRecordWithProgress('100'),
      createRecordWithProgress('invalid'),
    ];

    const metrics = calculateProjectMetrics(records);

    expect(metrics.projectCount).toBe(4);
    expect(metrics.averageProgress).toBe(35);
    expect(metrics.completedProjectCount).toBe(1);
    expect(metrics.activeProjectCount).toBe(1);
    expect(metrics.notStartedProjectCount).toBe(2);
  });

  it('counts subline statuses and completed ratio', () => {
    const records = [
      createProjectRecord({
        projectName: 'Subline Statuses',
        subLines: [
          createProjectSubLine({ taskName: '主机设备', status: '未处理' }),
          createProjectSubLine({ taskName: '平台', status: '待处理' }),
          createProjectSubLine({ taskName: '专项-风网', status: '等待中' }),
          createProjectSubLine({ taskName: '三维建模', status: '已提资/已完成' }),
        ],
      }),
    ];

    const metrics = calculateProjectMetrics(records);

    expect(metrics.subLineCount).toBe(4);
    expect(metrics.pendingSubLineCount).toBe(2);
    expect(metrics.waitingSubLineCount).toBe(1);
    expect(metrics.completedSubLineCount).toBe(1);
    expect(metrics.completedSubLineRatio).toBe(25);
  });

  it('counts sublines with unconfigured workload ratios', () => {
    const records = [
      createProjectRecord({
        projectName: 'Config quality',
        subLines: [
          createProjectSubLine({ taskName: '主机设备' }),
          createProjectSubLine({ taskName: '未配置任务' }),
          createProjectSubLine({ taskName: '' }),
        ],
      }),
    ];

    const metrics = calculateProjectMetrics(records);

    expect(metrics.unconfiguredWorkloadSubLineCount).toBe(2);
  });
});
