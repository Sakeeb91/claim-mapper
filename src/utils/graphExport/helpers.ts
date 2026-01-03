import { EXPORT_FORMATS } from '@/constants';
import type { ExportFormat } from '@/types';

/**
 * Generates a timestamped filename for graph exports.
 *
 * @param baseName - The base name for the file (e.g., 'claim-mapper-graph')
 * @param format - The export format determining the file extension
 * @returns A filename with format: `{baseName}-{YYYY-MM-DD}.{extension}`
 *
 * @example
 * generateTimestampedFilename('my-graph', 'png')
 * // Returns: 'my-graph-2024-01-15.png'
 */
export function generateTimestampedFilename(baseName: string, format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  const extension = EXPORT_FORMATS[format].extension;
  return `${baseName}-${date}${extension}`;
}

/**
 * Triggers a file download by creating and clicking a temporary anchor element.
 *
 * @param dataUrl - The data URL or blob URL to download
 * @param filename - The suggested filename for the download
 */
export function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Creates a temporary blob URL from string content.
 *
 * @param content - The string content to create a blob from
 * @param mimeType - The MIME type for the blob (e.g., 'application/json')
 * @returns A temporary blob URL that should be revoked after use
 */
export function createBlobUrl(content: string, mimeType: string): string {
  const blob = new Blob([content], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Downloads content as a file by creating a blob URL and triggering download.
 * Automatically revokes the blob URL after download.
 *
 * @param content - The string content to download
 * @param filename - The suggested filename for the download
 * @param mimeType - The MIME type for the content
 */
export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const url = createBlobUrl(content, mimeType);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * Escapes special XML characters to prevent injection and parsing errors.
 *
 * @param text - The text to escape
 * @returns The text with XML special characters escaped
 *
 * @example
 * escapeXml('<test & "value">') // Returns: '&lt;test &amp; &quot;value&quot;&gt;'
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
