import { EXPORT_FORMATS } from '@/constants';
import type { ExportFormat } from '@/types';

export function generateTimestampedFilename(baseName: string, format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  const extension = EXPORT_FORMATS[format].extension;
  return `${baseName}-${date}${extension}`;
}

export function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function createBlobUrl(content: string, mimeType: string): string {
  const blob = new Blob([content], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const url = createBlobUrl(content, mimeType);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
