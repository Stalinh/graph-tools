/**
 * @vitest-environment jsdom
 */
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProjectRecord } from './projectModel';
import {
  createFpdsUploadFileName,
  downloadProjectFpdsUploadTemplate,
  fillFpdsUploadTemplate,
} from './projectFpdsTemplate';

const SHEET_PATH = 'xl/worksheets/sheet1.xml';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function createMinimalTemplate() {
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:AR8"/>
  <sheetData>
    <row r="1">
      <c r="E1" t="inlineStr"><is><t>项目号</t></is></c>
      <c r="F1" t="inlineStr"><is><t>项目名称</t></is></c>
      <c r="G1" t="inlineStr"><is><t>合同号</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>原有内容</t></is></c>
      <c r="S2" t="inlineStr"><is><t>模板说明</t></is></c>
    </row>
  </sheetData>
  <mergeCells count="1"><mergeCell ref="S2:X8"/></mergeCells>
</worksheet>`;

  return zipSync({
    [SHEET_PATH]: strToU8(sheetXml),
    'xl/workbook.xml': strToU8('<workbook/>'),
  });
}

function readSheetXml(workbookBytes: Uint8Array) {
  const unzipped = unzipSync(workbookBytes);
  return strFromU8(unzipped[SHEET_PATH]);
}

function getCellText(sheetXml: string, cellRef: string) {
  const document = new DOMParser().parseFromString(sheetXml, 'application/xml');
  const cell = document.querySelector(`c[r="${cellRef}"]`);
  return cell?.querySelector('t')?.textContent ?? '';
}

describe('fillFpdsUploadTemplate', () => {
  it('fills project number, project name, and contract number for 10 data rows', () => {
    const record = createProjectRecord({
      contractNo: 'HT-2026',
      projectName: 'Alpha 项目',
      projectNo: 'P-1001',
    });

    const filled = fillFpdsUploadTemplate(createMinimalTemplate(), record);
    const sheetXml = readSheetXml(filled);

    for (let row = 2; row <= 11; row++) {
      expect(getCellText(sheetXml, `E${row}`)).toBe('P-1001');
      expect(getCellText(sheetXml, `F${row}`)).toBe('Alpha 项目');
      expect(getCellText(sheetXml, `G${row}`)).toBe('HT-2026');
    }
  });

  it('leaves unrelated template cells and merged-cell metadata intact', () => {
    const record = createProjectRecord({
      contractNo: 'HT-2026',
      projectName: 'Alpha 项目',
      projectNo: 'P-1001',
    });

    const sheetXml = readSheetXml(fillFpdsUploadTemplate(createMinimalTemplate(), record));

    expect(getCellText(sheetXml, 'A2')).toBe('原有内容');
    expect(getCellText(sheetXml, 'S2')).toBe('模板说明');
    expect(sheetXml).toContain('<mergeCell ref="S2:X8"');
    expect(sheetXml).toContain('ref="A1:AR11"');
  });
});

describe('createFpdsUploadFileName', () => {
  it('uses the project name with the FPDS upload suffix', () => {
    expect(createFpdsUploadFileName(createProjectRecord({ projectName: 'Alpha 项目' }))).toBe(
      'Alpha 项目_FPDS上传清单.xlsx'
    );
  });

  it('removes path separators that are invalid on macOS and Windows', () => {
    expect(createFpdsUploadFileName(createProjectRecord({ projectName: 'A/B:C*项目' }))).toBe(
      'A-B-C-项目_FPDS上传清单.xlsx'
    );
  });
});

describe('downloadProjectFpdsUploadTemplate', () => {
  it('downloads a filled workbook with the project-based FPDS filename', async () => {
    const record = createProjectRecord({
      contractNo: 'HT-2026',
      projectName: 'Alpha 项目',
      projectNo: 'P-1001',
    });
    const anchor = document.createElement('a');
    const click = vi.fn();
    anchor.click = click;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const downloadCapture: { blob?: Blob } = {};
    const createObjectURL = vi.fn((blob: Blob) => {
      downloadCapture.blob = blob;
      return 'blob:fpds-template';
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(createMinimalTemplate()))
    );

    await downloadProjectFpdsUploadTemplate(record);

    expect(anchor.download).toBe('Alpha 项目_FPDS上传清单.xlsx');
    expect(anchor.href).toBe('blob:fpds-template');
    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const downloadedBlob = downloadCapture.blob;
    if (!downloadedBlob) {
      throw new Error('Expected the generated workbook Blob.');
    }
    expect(downloadedBlob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const sheetXml = readSheetXml(new Uint8Array(await downloadedBlob.arrayBuffer()));
    expect(getCellText(sheetXml, 'E2')).toBe('P-1001');
    expect(getCellText(sheetXml, 'F11')).toBe('Alpha 项目');
    expect(getCellText(sheetXml, 'G11')).toBe('HT-2026');
  });
});
