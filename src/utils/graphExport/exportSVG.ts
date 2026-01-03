import { DEFAULT_EXPORT_OPTIONS, EXPORT_FORMATS } from '@/constants';
import type { ExportOptions, ExportResult } from '@/types';
import { generateTimestampedFilename, downloadBlob } from './helpers';

export function exportAsSVG(
  svgElement: SVGSVGElement,
  options: ExportOptions = {}
): ExportResult {
  const { filename } = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options
  };

  try {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    // Add XML declaration and DOCTYPE
    const fullSvgString = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;

    const timestampedFilename = generateTimestampedFilename(filename, 'svg');

    downloadBlob(fullSvgString, timestampedFilename, EXPORT_FORMATS.svg.mimeType);

    return {
      success: true,
      filename: timestampedFilename,
      format: 'svg'
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      format: 'svg',
      error: error instanceof Error ? error.message : 'Failed to export as SVG'
    };
  }
}
