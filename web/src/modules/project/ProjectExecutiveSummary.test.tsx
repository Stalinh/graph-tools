/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectExecutiveSummary } from './ProjectExecutiveSummary';
import type { ProjectMetrics } from './projectMetrics';

afterEach(() => {
  cleanup();
});

const baseMetrics: ProjectMetrics = {
  projectCount: 8,
  subLineCount: 24,
  averageProgress: 63,
  completedProjectCount: 2,
  activeProjectCount: 5,
  notStartedProjectCount: 1,
  completedSubLineCount: 12,
  waitingSubLineCount: 3,
  pendingSubLineCount: 9,
  completedSubLineRatio: 50,
  unconfiguredWorkloadSubLineCount: 0,
};

describe('ProjectExecutiveSummary', () => {
  it('renders the core portfolio metrics in Chinese', () => {
    render(<ProjectExecutiveSummary isZh metrics={baseMetrics} />);

    expect(screen.getByRole('region', { name: '项目组合概览' })).toBeTruthy();
    expect(screen.getByText('项目总数')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('平均进度')).toBeTruthy();
    expect(screen.getByText('63%')).toBeTruthy();
    expect(screen.getByText('进行中')).toBeTruthy();
    expect(screen.getByText('等待中子项')).toBeTruthy();
    expect(screen.getByText('配置异常')).toBeTruthy();
    expect(screen.getByText('全部已配置')).toBeTruthy();
  });

  it('renders the core portfolio metrics in English', () => {
    render(<ProjectExecutiveSummary isZh={false} metrics={baseMetrics} />);

    expect(screen.getByRole('region', { name: 'Project portfolio summary' })).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Average progress')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Waiting sublines')).toBeTruthy();
    expect(screen.getByText('Config issues')).toBeTruthy();
    expect(screen.getByText('All configured')).toBeTruthy();
  });

  it('marks configuration issues when workload ratios are missing', () => {
    render(
      <ProjectExecutiveSummary
        isZh
        metrics={{ ...baseMetrics, unconfiguredWorkloadSubLineCount: 2 }}
      />
    );

    const issueItem = screen.getByText('配置异常').closest('.project-summary__item');
    expect(issueItem?.className).toContain('project-summary__item--danger');
    expect(screen.getByText('2 项待配置')).toBeTruthy();
  });
});
