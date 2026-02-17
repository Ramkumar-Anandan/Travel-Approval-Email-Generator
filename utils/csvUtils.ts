
import { FormData } from '../types';

/**
 * Generates a vertical CSV where Column 1 contains keys (row headers)
 * and Column 2 contains the corresponding values.
 */
export const generateCsvTemplate = (data: FormData): string => {
  return Object.entries(data)
    .map(([key, val]) => {
      // Prepare the value: escape commas and quotes
      let formattedVal = String(val);
      if (formattedVal.includes(',') || formattedVal.includes('"') || formattedVal.includes('\n')) {
        formattedVal = `"${formattedVal.replace(/"/g, '""')}"`;
      }
      return `${key},${formattedVal}`;
    })
    .join('\n');
};

/**
 * Parses a vertical CSV where Column 1 is the key and Column 2 is the value.
 */
export const parseCsvToFormData = (csv: string): Partial<FormData> => {
  const lines = csv.split(/\r?\n/);
  const result: any = {};
  
  lines.forEach(line => {
    // We look for the first comma to split key and value
    const firstCommaIndex = line.indexOf(',');
    if (firstCommaIndex === -1) return;
    
    const key = line.substring(0, firstCommaIndex).trim();
    let val = line.substring(firstCommaIndex + 1).trim();
    
    // Remove wrapping quotes if present and unescape double quotes
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1).replace(/""/g, '"');
    }
    
    if (key) {
      // Type conversion for booleans
      if (val === 'true') result[key] = true;
      else if (val === 'false') result[key] = false;
      else result[key] = val;
    }
  });
  
  return result;
};

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};
