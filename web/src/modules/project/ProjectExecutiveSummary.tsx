import type { ProjectMetrics } from './projectMetrics';

interface ProjectExecutiveSummaryProps {
  isZh: boolean;
  metrics: ProjectMetrics;
}

interface SummaryItem {
  detail: string;
  label: string;
  tone?: 'danger' | 'success' | 'warning';
  value: string;
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function ProjectExecutiveSummary({ isZh, metrics }: ProjectExecutiveSummaryProps) {
  const hasConfigIssues = metrics.unconfiguredWorkloadSubLineCount > 0;
  const items: SummaryItem[] = [
    {
      label: isZh ? '项目总数' : 'Projects',
      value: String(metrics.projectCount),
      detail: isZh ? `${metrics.subLineCount} 条子行` : `${metrics.subLineCount} sublines`,
    },
    {
      label: isZh ? '平均进度' : 'Average progress',
      value: formatPercent(metrics.averageProgress),
      detail: isZh
        ? `${metrics.completedProjectCount} 个已完成`
        : `${metrics.completedProjectCount} completed`,
      tone: metrics.averageProgress >= 80 ? 'success' : undefined,
    },
    {
      label: isZh ? '进行中' : 'Active',
      value: String(metrics.activeProjectCount),
      detail: isZh
        ? `${metrics.notStartedProjectCount} 个未启动`
        : `${metrics.notStartedProjectCount} not started`,
    },
    {
      label: isZh ? '等待中子项' : 'Waiting sublines',
      value: String(metrics.waitingSubLineCount),
      detail: isZh ? '需要外部输入' : 'Need external input',
      tone: metrics.waitingSubLineCount > 0 ? 'warning' : undefined,
    },
    {
      label: isZh ? '待处理子项' : 'Pending sublines',
      value: String(metrics.pendingSubLineCount),
      detail: isZh
        ? `完成率 ${formatPercent(metrics.completedSubLineRatio)}`
        : `${formatPercent(metrics.completedSubLineRatio)} complete`,
    },
    {
      label: isZh ? '配置异常' : 'Config issues',
      value: String(metrics.unconfiguredWorkloadSubLineCount),
      detail: hasConfigIssues
        ? isZh
          ? `${metrics.unconfiguredWorkloadSubLineCount} 项待配置`
          : `${metrics.unconfiguredWorkloadSubLineCount} need config`
        : isZh
          ? '全部已配置'
          : 'All configured',
      tone: hasConfigIssues ? 'danger' : 'success',
    },
  ];

  return (
    <section
      className="project-summary"
      role="region"
      aria-label={isZh ? '项目组合概览' : 'Project portfolio summary'}
    >
      {items.map((item, itemIndex) => (
        <div
          className={`project-summary__item ${
            item.tone ? `project-summary__item--${item.tone}` : ''
          } ${itemIndex < 2 ? 'project-summary__item--primary' : ''}`}
          key={item.label}
        >
          <span className="project-summary__label">{item.label}</span>
          <strong className="project-summary__value">{item.value}</strong>
          <span className="project-summary__detail">{item.detail}</span>
        </div>
      ))}
    </section>
  );
}
