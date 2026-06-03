import { getSubLineWorkloadRatio } from './projectConfig';
import { normalizeProjectProgress, normalizeProjectSubLineStatus } from './projectModel';
import type { ProjectRecord } from './projectTypes';

export interface ProjectMetrics {
  projectCount: number;
  subLineCount: number;
  averageProgress: number;
  completedProjectCount: number;
  activeProjectCount: number;
  notStartedProjectCount: number;
  completedSubLineCount: number;
  waitingSubLineCount: number;
  pendingSubLineCount: number;
  completedSubLineRatio: number;
  unconfiguredWorkloadSubLineCount: number;
}

function toProgressNumber(progress: string) {
  return Number(normalizeProjectProgress(progress));
}

function toRoundedPercent(value: number) {
  return Math.round(value);
}

export function calculateProjectMetrics(records: readonly ProjectRecord[]): ProjectMetrics {
  let progressTotal = 0;
  let completedProjectCount = 0;
  let activeProjectCount = 0;
  let notStartedProjectCount = 0;
  let subLineCount = 0;
  let completedSubLineCount = 0;
  let waitingSubLineCount = 0;
  let pendingSubLineCount = 0;
  let unconfiguredWorkloadSubLineCount = 0;

  for (const record of records) {
    const progress = toProgressNumber(record.progress);
    progressTotal += progress;

    if (progress >= 100) {
      completedProjectCount += 1;
    } else if (progress > 0) {
      activeProjectCount += 1;
    } else {
      notStartedProjectCount += 1;
    }

    for (const subLine of record.subLines) {
      subLineCount += 1;
      const status = normalizeProjectSubLineStatus(subLine.status);

      if (status === '已提资/已完成') {
        completedSubLineCount += 1;
      } else if (status === '等待中') {
        waitingSubLineCount += 1;
      } else {
        pendingSubLineCount += 1;
      }

      if (getSubLineWorkloadRatio(subLine.taskName) === null) {
        unconfiguredWorkloadSubLineCount += 1;
      }
    }
  }

  return {
    projectCount: records.length,
    subLineCount,
    averageProgress: records.length > 0 ? toRoundedPercent(progressTotal / records.length) : 0,
    completedProjectCount,
    activeProjectCount,
    notStartedProjectCount,
    completedSubLineCount,
    waitingSubLineCount,
    pendingSubLineCount,
    completedSubLineRatio:
      subLineCount > 0 ? toRoundedPercent((completedSubLineCount / subLineCount) * 100) : 0,
    unconfiguredWorkloadSubLineCount,
  };
}
