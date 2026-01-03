import html2canvas from 'html2canvas';
import { DEFAULT_EXPORT_OPTIONS } from '@/constants';
import type { ExportOptions, ExportResult } from '@/types';
import { generateTimestampedFilename, triggerDownload } from './helpers';

export async function exportAsPNG(
  svgElement: SVGSVGElement,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const { filename, quality, backgroundColor } = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options
  };

  try {
    const parentElement = svgElement.parentElement;
    if (!parentElement) {
      throw new Error('SVG element must have a parent element');
    }

    const canvas = await html2canvas(parentElement, {
      backgroundColor,
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true
    });

    const dataUrl = canvas.toDataURL('image/png', quality);
    const timestampedFilename = generateTimestampedFilename(filename, 'png');

    triggerDownload(dataUrl, timestampedFilename);

    return {
      success: true,
      filename: timestampedFilename,
      format: 'png'
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      format: 'png',
      error: error instanceof Error ? error.message : 'Failed to export as PNG'
    };
  }
}
