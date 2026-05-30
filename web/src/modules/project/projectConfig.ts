import type { ProjectColumn, ProjectSubLineStatus } from "./projectTypes";

export const PROJECT_COLUMNS: ProjectColumn[] = [
  { field: "projectName", labelZh: "项目名称", labelEn: "Project Name", width: "220px" },
  {
    field: "contractAmount",
    labelZh: "合同额",
    labelEn: "Contract Amount",
    width: "150px",
    inputMode: "decimal",
  },
  { field: "contractNo", labelZh: "合同号", labelEn: "Contract No.", width: "150px" },
  { field: "projectNo", labelZh: "项目号", labelEn: "Project No.", width: "140px" },
  { field: "projectLevel", labelZh: "项目等级", labelEn: "Project Level", width: "130px" },
  { field: "progress", labelZh: "进度", labelEn: "Progress", width: "170px", inputMode: "decimal" },
  { field: "schemeDesign", labelZh: "方案设计", labelEn: "Scheme Design", width: "160px" },
  { field: "projectManager", labelZh: "项目经理", labelEn: "Project Manager", width: "140px" },
];

export const PROJECT_LEVEL_OPTIONS = ["V", "K", "R", "N"];
export const PROJECT_SUB_LINE_STATUS_OPTIONS: ProjectSubLineStatus[] = [
  "未处理",
  "设计中",
  "待评审",
  "已下单",
];
