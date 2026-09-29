import ExcelJS from 'exceljs';
import { buildXlsx, XLSX_CONTENT_TYPE } from './xlsx';

async function readBack(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  // exceljs's own ambient Buffer type predates @types/node's generic Buffer<T> --
  // this is a real Node Buffer at runtime, just a typing mismatch between the two.
  await workbook.xlsx.load(buffer as never);
  return workbook.worksheets[0];
}

describe('buildXlsx', () => {
  it('writes the header row and every data row with real types', async () => {
    const buffer = await buildXlsx(
      'Students',
      ['Name', 'Joined', 'Courses enrolled'],
      [['Ada Lovelace', new Date('2026-09-01T00:00:00Z'), 3]],
    );
    const sheet = await readBack(buffer);

    expect(sheet.name).toBe('Students');
    expect(sheet.getRow(1).getCell(1).value).toBe('Name');
    expect(sheet.getRow(2).getCell(1).value).toBe('Ada Lovelace');
    expect(sheet.getRow(2).getCell(3).value).toBe(3);
    expect(sheet.getRow(2).getCell(2).value).toBeInstanceOf(Date);
  });

  it('sets Yu Mincho on the header and data cells, and bolds only the header', async () => {
    const buffer = await buildXlsx('Sheet', ['Name'], [['Ada']]);
    const sheet = await readBack(buffer);

    expect(sheet.getRow(1).getCell(1).font?.name).toBe('Yu Mincho');
    expect(sheet.getRow(1).getCell(1).font?.bold).toBe(true);
    expect(sheet.getRow(2).getCell(1).font?.name).toBe('Yu Mincho');
    expect(sheet.getRow(2).getCell(1).font?.bold).toBeFalsy();
  });

  it('never turns a leading "=" in data into an executable formula', async () => {
    const buffer = await buildXlsx('Sheet', ['Name'], [['=HYPERLINK("http://evil","x")']]);
    const sheet = await readBack(buffer);
    const cell = sheet.getRow(2).getCell(1);

    expect(cell.value).toBe('=HYPERLINK("http://evil","x")');
    // A real formula cell's .value would be an object with a `formula` key -- a plain string never executes.
    expect(typeof cell.value).toBe('string');
  });

  it('advertises the standard .xlsx content type', () => {
    expect(XLSX_CONTENT_TYPE).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
