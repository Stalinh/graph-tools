export interface ProjectLine {
  id: string;
  contractNo: string;
  projectNo: string;
  projectName: string;
  contractAmount: string;
  projectLevel: string;
  progress: string;
  schemeDesign: string;
  projectManager: string;
}

export interface ProjectRecord extends ProjectLine {
  subLines: ProjectLine[];
}

export type ProjectRecordField = Exclude<keyof ProjectLine, "id">;

export interface ProjectColumn {
  field: ProjectRecordField;
  labelZh: string;
  labelEn: string;
  width: string;
  inputMode?: "text" | "decimal";
}
