import { describe, expect, it } from 'vitest';
import {
  PROJECT_FILE_SCHEMA_VERSION,
  isProjectFileName,
  parseProjectFileJson,
  serializeProjectFile,
} from './projectFileFormat';
import {
  createProjectRecord,
  createProjectSubLine,
  ensureProjectRecordsDefaultSubLines,
  sanitizeProjectRecords,
  normalizeProjectProgress,
  normalizeProjectSubLineStatus,
  sanitizeProjectRecordsWithReport,
} from './projectModel';

describe('project file format and model', () => {
  it('round-trips project files through sanitized records', () => {
    const records = [
      createProjectRecord({
        projectName: ' Alpha ',
        progress: '42.6',
        subLines: [
          createProjectSubLine({
            taskName: 'Main',
            status: '待处理',
          }),
        ],
      }),
    ];

    const parsed = parseProjectFileJson(serializeProjectFile(records));

    expect(parsed).toHaveLength(1);
    expect(parsed[0].projectName).toBe('Alpha');
    expect(parsed[0].progress).toBe('43');
    expect(parsed[0].subLines[0].taskName).toBe('Main');
    expect(parsed[0].subLines[0].status).toBe('待处理');
  });

  it('rejects malformed, wrong-module, unsupported-version, duplicate-name, and invalid-record files', () => {
    expect(() => parseProjectFileJson('{')).toThrow('malformed JSON');
    expect(() =>
      parseProjectFileJson(JSON.stringify({ module: 'wrong', schemaVersion: 1, projects: [] }))
    ).toThrow('missing or invalid project data');
    expect(() =>
      parseProjectFileJson(
        JSON.stringify({ module: 'project-management', schemaVersion: 999, projects: [] })
      )
    ).toThrow('missing or invalid project data');
    expect(() =>
      parseProjectFileJson(
        JSON.stringify({
          module: 'project-management',
          schemaVersion: PROJECT_FILE_SCHEMA_VERSION,
          projects: [
            createProjectRecord({ projectName: 'Same' }),
            createProjectRecord({ projectName: 'Same' }),
          ],
        })
      )
    ).toThrow('invalid project records');
    expect(() =>
      parseProjectFileJson(
        JSON.stringify({
          module: 'project-management',
          schemaVersion: PROJECT_FILE_SCHEMA_VERSION,
          projects: [{ id: 'bad', projectName: '' }],
        })
      )
    ).toThrow('invalid project records');
  });

  it('recognizes project file names case-insensitively', () => {
    expect(isProjectFileName('project-management.project')).toBe(true);
    expect(isProjectFileName('PROJECT-MANAGEMENT.PROJECT')).toBe(true);
    expect(isProjectFileName('project-management.project.json')).toBe(false);
  });

  it('normalizes progress and legacy subline statuses', () => {
    expect(normalizeProjectProgress('42.4')).toBe('42');
    expect(normalizeProjectProgress('150')).toBe('100');
    expect(normalizeProjectProgress('-5')).toBe('0');
    expect(normalizeProjectProgress('oops')).toBe('0');

    expect(normalizeProjectSubLineStatus('设计中')).toBe('待处理');
    expect(normalizeProjectSubLineStatus('已下单')).toBe('已提资/已完成');
    expect(normalizeProjectSubLineStatus('unknown')).toBe('未处理');
  });

  it('reports invalid records, invalid sublines, and duplicate project names', () => {
    const result = sanitizeProjectRecordsWithReport([
      {
        id: 'alpha',
        projectName: 'Alpha',
        contractNo: '',
        contractAmount: '',
        projectLevel: '',
        projectNo: '',
        schemeDesign: '',
        projectManager: '',
        subLines: [
          createProjectSubLine({ taskName: 'Valid' }),
          { id: 'bad-subline', taskName: '' },
        ],
      },
      createProjectRecord({ projectName: 'Alpha' }),
      { id: 'bad-record', projectName: '' },
    ]);

    expect(result.records).toHaveLength(1);
    expect(result.invalidRecordCount).toBe(1);
    expect(result.invalidSubLineCount).toBe(1);
    expect(result.duplicateProjectNameCount).toBe(1);
  });

  it('adds missing default sublines without duplicating existing task names', () => {
    const record = createProjectRecord({
      projectName: 'Alpha',
      subLines: [createProjectSubLine({ taskName: '主机设备' })],
    });

    const result = ensureProjectRecordsDefaultSubLines([record]);

    expect(result.records[0].subLines.map((subLine) => subLine.taskName)).toContain('主机设备');
    expect(
      result.records[0].subLines.filter((subLine) => subLine.taskName === '主机设备')
    ).toHaveLength(1);
    expect(result.addedSubLineCount).toBeGreaterThan(0);
  });

  it('normalizes sublines to the fixed default order', () => {
    const sourceRecord = {
      ...createProjectRecord({ projectName: 'Ordered' }),
      subLines: [
        createProjectSubLine({ taskName: '主机设备' }),
        createProjectSubLine({ taskName: '平台' }),
        createProjectSubLine({ taskName: '评审交底' }),
        createProjectSubLine({ taskName: '三维建模' }),
      ],
    };

    const [record] = sanitizeProjectRecords([sourceRecord]);
    const taskNames = record.subLines.map((subLine) => subLine.taskName);

    expect(taskNames[0]).toBe('三维建模');
    expect(taskNames[taskNames.indexOf('平台') + 1]).toBe('评审交底');
    expect(taskNames.indexOf('主机设备')).toBeLessThan(taskNames.indexOf('评审交底'));
  });

  it('fills missing default sublines in fixed order', () => {
    const record = {
      ...createProjectRecord({ projectName: 'Filled' }),
      subLines: [
        createProjectSubLine({ taskName: '主机设备' }),
        createProjectSubLine({ taskName: '平台' }),
      ],
    };

    const result = ensureProjectRecordsDefaultSubLines([record]);
    const taskNames = result.records[0].subLines.map((subLine) => subLine.taskName);

    expect(taskNames[0]).toBe('三维建模');
    expect(taskNames[taskNames.indexOf('平台') + 1]).toBe('评审交底');
    expect(taskNames).toHaveLength(17);
  });
});
