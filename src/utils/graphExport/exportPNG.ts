import html2canvas from 'html2canvas';
import { DEFAULT_EXPORT_OPTIONS } from '@/constants';
import type { ExportOptions, ExportResult } from '@/types';
import { generateTimestampedFilename, triggerDownload } from './helpers';

/**
 * Exports an SVG graph visualization as a high-quality PNG image.
 * Uses html2canvas to rasterize the SVG and its parent container.
 *
 * @param svgElement - The SVG element to export (must have a parent element)
 * @param options - Export configuration options
 * @returns Promise resolving to an ExportResult with success status and filename
 *
 * @example
 * const result = await exportAsPNG(svgElement, { filename: 'my-graph' });
 * if (result.success) {
 *   console.log(`Exported as ${result.filename}`);
 * }
 */
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
