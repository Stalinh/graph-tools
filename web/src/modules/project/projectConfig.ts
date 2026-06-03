import type { ProjectColumn, ProjectSubLineStatus } from './projectTypes';

export const PROJECT_COLUMNS: ProjectColumn[] = [
  { field: 'projectName', labelZh: '项目名称', labelEn: 'Project Name', width: '220px' },
  {
    field: 'contractAmount',
    labelZh: '合同额',
    labelEn: 'Amount',
    width: '105px',
    inputMode: 'decimal',
  },
  { field: 'projectLevel', labelZh: '项目等级', labelEn: 'Level', width: '65px' },
  { field: 'progress', labelZh: '进度', labelEn: 'Progress', width: '136px', inputMode: 'decimal' },
  { field: 'contractNo', labelZh: '合同号', labelEn: 'Contract No.', width: '150px' },
  { field: 'detailDesign', labelZh: '细化设计', labelEn: 'Detail Design', width: '72px' },
  { field: 'projectNo', labelZh: '项目号', labelEn: 'Project No.', width: '90px' },
  { field: 'schemeDesign', labelZh: '方案设计', labelEn: 'Scheme Design', width: '72px' },
  { field: 'projectManager', labelZh: '项目经理', labelEn: 'Project Manager', width: '72px' },
];

export const PROJECT_LEVEL_OPTIONS = ['V', 'K', 'R', 'N'];
export const PROJECT_SUB_LINE_STATUS_OPTIONS: ProjectSubLineStatus[] = [
  '未处理',
  '待处理',
  '等待中',
  '已提资/已完成',
];

export const PROJECT_DEFAULT_SUB_LINE_TASK_NAMES = [
  '三维建模',
  '主机设备',
  '常规外购',
  '个性化外购',
  '输送设备',
  '预制件',
  '溜管',
  '钢材软连接',
  '辅材',
  '平台',
  '评审交底',
  '专项-料仓',
  '专项-风网',
  '专项-液体',
  '专项-蒸汽',
  '专项-空压',
  '专项-液体模块',
];

export const PROJECT_SUB_LINE_WORKLOAD_RATIO: Record<string, number> = {
  三维建模: 26.5,
  '专项-液体模块': 0,
  '专项-料仓': 7,
  '专项-风网': 8,
  '专项-液体': 2.5,
  '专项-蒸汽': 2,
  '专项-空压': 2.5,
  平台: 7,
  评审交底: 4,
  主机设备: 11,
  输送设备: 6,
  常规外购: 1,
  个性化外购: 1,
  预制件: 10,
  溜管: 1.5,
  钢材软连接: 7,
  辅材: 3,
};

export function getSubLineWorkloadRatio(taskName: string): number | null {
  const ratio = PROJECT_SUB_LINE_WORKLOAD_RATIO[taskName];
  return typeof ratio === 'number' ? ratio : null;
}
