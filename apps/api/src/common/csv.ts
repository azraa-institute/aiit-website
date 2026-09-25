/**
 * Minimal CSV writer for admin exports.
 *
 * Cells that start with = + - @ (or a tab / carriage return) are prefixed with a
 * single quote so a spreadsheet treats them as text: student names and notes are
 * user-supplied, and an unguarded "=HYPERLINK(...)" in a name would otherwise
 * run as a formula when an admin opens the export in Excel or Sheets.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTF-8 byte-order mark, written as an escape so no invisible character sits in the source. */
const BOM = String.fromCharCode(0xfeff);

export function toCsv(header: string[], rows: unknown[][]): string {
  // Leading BOM so Excel opens UTF-8 names correctly.
  return `${BOM}${[header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
