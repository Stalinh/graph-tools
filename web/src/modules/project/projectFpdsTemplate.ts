import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import fpdsUploadTemplateUrl from './assets/fpds-upload-template.xlsx?url';
import type { ProjectRecord } from './projectTypes';

const FPDS_UPLOAD_SHEET_PATH = 'xl/worksheets/sheet1.xml';
const FPDS_UPLOAD_START_ROW = 2;
const FPDS_UPLOAD_ROW_COUNT = 10;
const FPDS_UPLOAD_LAST_ROW = FPDS_UPLOAD_START_ROW + FPDS_UPLOAD_ROW_COUNT - 1;
const SPREADSHEET_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';
const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*]/g;

interface FpdsUploadValues {
  contractNo: string;
  projectName: string;
  projectNo: string;
}

function getSpreadsheetElements(parent: Document | Element, localName: string) {
  return Array.from(parent.getElementsByTagNameNS(SPREADSHEET_NAMESPACE, localName));
}

function getDirectChildElements(parent: Element, localName: string) {
  return Array.from(parent.children).filter((child) => child.localName === localName);
}

function parseCellRef(cellRef: string) {
  const match = /^([A-Z]+)(\d+)$/.exec(cellRef);
  if (!match) {
    return null;
  }

  return {
    column: match[1],
    row: Number.parseInt(match[2], 10),
  };
}

function columnNameToNumber(columnName: string) {
  let columnNumber = 0;
  for (const character of columnName) {
    columnNumber = columnNumber * 26 + character.charCodeAt(0) - 64;
  }
  return columnNumber;
}

function getOrCreateRow(document: Document, sheetData: Element, rowIndex: number) {
  const rows = getDirectChildElements(sheetData, 'row');
  const existingRow = rows.find((row) => row.getAttribute('r') === String(rowIndex));
  if (existingRow) {
    return existingRow;
  }

  const row = document.createElementNS(SPREADSHEET_NAMESPACE, 'row');
  row.setAttribute('r', String(rowIndex));
  const nextRow = rows.find((currentRow) => {
    const currentIndex = Number.parseInt(currentRow.getAttribute('r') ?? '', 10);
    return Number.isFinite(currentIndex) && currentIndex > rowIndex;
  });
  sheetData.insertBefore(row, nextRow ?? null);
  return row;
}

function getOrCreateCell(document: Document, row: Element, cellRef: string) {
  const cells = getDirectChildElements(row, 'c');
  const existingCell = cells.find((cell) => cell.getAttribute('r') === cellRef);
  if (existingCell) {
    return existingCell;
  }

  const cell = document.createElementNS(SPREADSHEET_NAMESPACE, 'c');
  cell.setAttribute('r', cellRef);
  const targetColumn = parseCellRef(cellRef)?.column;
  const targetColumnNumber = targetColumn ? columnNameToNumber(targetColumn) : Number.MAX_VALUE;
  const nextCell = cells.find((currentCell) => {
    const currentColumn = parseCellRef(currentCell.getAttribute('r') ?? '')?.column;
    return currentColumn ? columnNameToNumber(currentColumn) > targetColumnNumber : false;
  });
  row.insertBefore(cell, nextCell ?? null);
  return cell;
}

function setInlineStringCell(document: Document, row: Element, cellRef: string, value: string) {
  const cell = getOrCreateCell(document, row, cellRef);
  while (cell.firstChild) {
    cell.removeChild(cell.firstChild);
  }

  cell.setAttribute('t', 'inlineStr');
  const inlineString = document.createElementNS(SPREADSHEET_NAMESPACE, 'is');
  const text = document.createElementNS(SPREADSHEET_NAMESPACE, 't');
  if (/^\s|\s$/.test(value)) {
    text.setAttributeNS(XML_NAMESPACE, 'xml:space', 'preserve');
  }
  text.textContent = value;
  inlineString.appendChild(text);
  cell.appendChild(inlineString);
}

function expandDimensionRows(ref: string, lastRow: number) {
  const [startRef, endRef = startRef] = ref.split(':');
  const end = parseCellRef(endRef);
  if (!end || end.row >= lastRow) {
    return ref;
  }

  return `${startRef}:${end.column}${lastRow}`;
}

function fillSheetXml(sheetXml: string, values: FpdsUploadValues) {
  const document = new DOMParser().parseFromString(sheetXml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid FPDS upload template worksheet XML.');
  }

  const sheetData = getSpreadsheetElements(document, 'sheetData')[0];
  if (!sheetData) {
    throw new Error('Invalid FPDS upload template worksheet data.');
  }

  for (let rowIndex = FPDS_UPLOAD_START_ROW; rowIndex <= FPDS_UPLOAD_LAST_ROW; rowIndex++) {
    const row = getOrCreateRow(document, sheetData, rowIndex);
    setInlineStringCell(document, row, `E${rowIndex}`, values.projectNo);
    setInlineStringCell(document, row, `F${rowIndex}`, values.projectName);
    setInlineStringCell(document, row, `G${rowIndex}`, values.contractNo);
  }

  const dimension = getSpreadsheetElements(document, 'dimension')[0];
  const ref = dimension?.getAttribute('ref');
  if (dimension && ref) {
    dimension.setAttribute('ref', expandDimensionRows(ref, FPDS_UPLOAD_LAST_ROW));
  }

  return new XMLSerializer().serializeToString(document);
}

function sanitizeFileNamePart(fileNamePart: string) {
  const sanitized = fileNamePart
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(INVALID_FILE_NAME_CHARS, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  return sanitized || '项目';
}

export function createFpdsUploadFileName(record: ProjectRecord) {
  const baseName = sanitizeFileNamePart(record.projectName || record.projectNo || '项目');
  return `${baseName}_FPDS上传清单.xlsx`;
}

export function fillFpdsUploadTemplate(templateBytes: Uint8Array, record: ProjectRecord) {
  const workbookEntries = unzipSync(templateBytes);
  const sheetBytes = workbookEntries[FPDS_UPLOAD_SHEET_PATH];
  if (!sheetBytes) {
    throw new Error('Invalid FPDS upload template workbook.');
  }

  workbookEntries[FPDS_UPLOAD_SHEET_PATH] = strToU8(
    fillSheetXml(strFromU8(sheetBytes), {
      contractNo: record.contractNo,
      projectName: record.projectName,
      projectNo: record.projectNo,
    })
  );

  return zipSync(workbookEntries);
}

async function fetchFpdsUploadTemplate(templateUrl = fpdsUploadTemplateUrl) {
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error('Failed to load FPDS upload template.');
  }

  return new Uint8Array(await response.arrayBuffer());
}

function triggerWorkbookDownload(workbookBytes: Uint8Array, fileName: string) {
  const workbookBuffer = new ArrayBuffer(workbookBytes.byteLength);
  new Uint8Array(workbookBuffer).set(workbookBytes);
  const blob = new Blob([workbookBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.rel = 'noopener';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export async function downloadProjectFpdsUploadTemplate(record: ProjectRecord) {
  const templateBytes = await fetchFpdsUploadTemplate();
  const workbookBytes = fillFpdsUploadTemplate(templateBytes, record);
  triggerWorkbookDownload(workbookBytes, createFpdsUploadFileName(record));
}
