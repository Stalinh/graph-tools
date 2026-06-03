export interface ProjectLine {
  id: string;
  lineNo: string;
  contractNo: string;
  detailDesign: string;
  projectNo: string;
  projectName: string;
  contractAmount: string;
  projectLevel: string;
  progress: string;
  schemeDesign: string;
  projectManager: string;
}

export type ProjectSubLineStatus = '未处理' | '待处理' | '等待中' | '已提资/已完成';

export interface ProjectSubLine {
  id: string;
  lineNo: string;
  taskName: string;
  status: ProjectSubLineStatus;
  detailDesign: string;
}

export interface ProjectRecord extends ProjectLine {
  subLines: ProjectSubLine[];
}

export type ProjectRecordField = Exclude<keyof ProjectLine, 'id'>;
export type ProjectSubLineField = keyof Omit<ProjectSubLine, 'id'>;

export interface ProjectColumn {
  field: ProjectRecordField;
  labelZh: string;
  labelEn: string;
  width: string;
  inputMode?: 'text' | 'decimal';
}
