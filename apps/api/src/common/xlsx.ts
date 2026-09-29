import ExcelJS from 'exceljs';

/**
 * The admin reports' shared spreadsheet font, requested explicitly (Yu Mincho
 * -- a serif face) rather than left to whatever the viewer's spreadsheet app
 * defaults to. This is only possible as a real .xlsx: a plain .csv carries no
 * formatting at all, so a font can't be set on one -- it was the reason these
 * exports moved off CSV. If Yu Mincho isn't installed on the machine opening
 * the file, the spreadsheet app substitutes its own default for display, the
 * same as any other font choice; the file itself is unaffected.
 */
const REPORT_FONT = 'Yu Mincho';

/**
 * Builds a single-sheet .xlsx as a Buffer. Values are written with their real
 * type (string/number/Date), not pre-formatted text, so a date still sorts
 * and filters correctly in Excel/Sheets. Unlike CSV, a string cell here can
 * never be misread as a formula -- .xlsx only executes a cell that carries an
 * explicit formula, which nothing here ever sets.
 */
export async function buildXlsx(
  sheetName: string,
  header: string[],
  rows: (string | number | Date | null)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AIIT.NETWORK';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = header.map((title) => ({ header: title, width: columnWidth(title) }));
  for (const row of rows) sheet.addRow(row);

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.font = { name: REPORT_FONT, size: 10, bold: rowNumber === 1 };
    });
  });
  sheet.getRow(1).font = { name: REPORT_FONT, size: 10, bold: true };

  // ExcelJS's own Buffer type is its own ambient alias, not Node's -- convert explicitly.
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

function columnWidth(title: string): number {
  return Math.min(40, Math.max(12, title.length + 4));
}

export const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
