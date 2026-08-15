/**
 * RFC 4180 Compliant CSV Export Utility
 * Guarantees proper escaping of quotes, commas, and line-breaks.
 * Prepends UTF-8 Byte Order Mark (BOM) to prevent Excel character corruption for ₹ and Unicode names.
 */

export interface CSVColumn<T = any> {
  key: string;
  label: string;
  formatter?: (val: any, row: T) => string | number;
}

/**
 * Escapes an individual field according to RFC 4180.
 * If value contains comma, double quotes, or newline, it is enclosed in quotes
 * and any inner double quotes are doubled (" -> "").
 */
export function escapeCSVField(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates an RFC 4180 CSV string with UTF-8 BOM.
 */
export function generateRFC4180CSV<T extends Record<string, any>>(
  data: T[],
  columns: CSVColumn<T>[]
): string {
  const BOM = '\uFEFF';
  const headerLine = columns.map((c) => escapeCSVField(c.label)).join(',');

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const rawVal = col.formatter ? col.formatter(row[col.key], row) : row[col.key];
        return escapeCSVField(rawVal);
      })
      .join(',')
  );

  return BOM + [headerLine, ...rows].join('\r\n') + '\r\n';
}

/**
 * Triggers a browser download of the CSV content.
 */
export function downloadCSVFile(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const CSVExporter = {
  escapeField: escapeCSVField,
  generateCSV: generateRFC4180CSV,
  downloadCSV: downloadCSVFile,
};

export default CSVExporter;
