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
  { field: "progress", labelZh: "进度", labelEn: "Progress", width: "170px", inputMode: "decimal" },
  { field: "contractNo", labelZh: "合同号", labelEn: "Contract No.", width: "150px" },
  { field: "detailDesign", labelZh: "细化设计", labelEn: "Detail Design", width: "160px" },
  { field: "projectNo", labelZh: "项目号", labelEn: "Project No.", width: "140px" },
  { field: "projectLevel", labelZh: "项目等级", labelEn: "Project Level", width: "130px" },
  { field: "schemeDesign", labelZh: "方案设计", labelEn: "Scheme Design", width: "160px" },
  { field: "projectManager", labelZh: "项目经理", labelEn: "Project Manager", width: "140px" },
];

export const PROJECT_LEVEL_OPTIONS = ["V", "K", "R", "N"];
export const PROJECT_SUB_LINE_STATUS_OPTIONS: ProjectSubLineStatus[] = [
  "未处理",
  "待处理",
  "等待中",
  "已提资/已完成",
];

export const PROJECT_DEFAULT_SUB_LINE_TASK_NAMES = [
  "主机设备",
  "输送设备",
  "常规外购",
  "个性化外购",
  "预制件",
  "溜管",
  "钢材软连接",
  "辅材",
  "平台",
  "专项-料仓",
  "专项-风网",
  "专项-空压",
  "专项-液体",
  "专项-蒸汽",
  "专项-液体模块",
];
