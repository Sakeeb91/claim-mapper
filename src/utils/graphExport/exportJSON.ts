import { DEFAULT_EXPORT_OPTIONS, EXPORT_FORMATS, APP_VERSION } from '@/constants';
import type { ExportOptions, ExportResult, GraphData, ExportMetadata, GraphExportData } from '@/types';
import { generateTimestampedFilename, downloadBlob } from './helpers';

export interface JSONExportOptions extends ExportOptions {
  projectId?: string;
  projectName?: string;
  exportedBy?: string;
}

export function exportAsJSON(
  graphData: GraphData,
  options: JSONExportOptions = {}
): ExportResult {
  const { filename, includeMetadata, projectId, projectName, exportedBy } = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options
  };

  try {
    let exportData: GraphData | GraphExportData;

    if (includeMetadata) {
      const metadata: ExportMetadata = {
        exportDate: new Date().toISOString(),
        version: APP_VERSION,
        projectId,
        projectName,
        nodeCount: graphData.nodes.length,
        linkCount: graphData.links.length,
        exportedBy
      };

      exportData = {
        metadata,
        graph: graphData
      } satisfies GraphExportData;
    } else {
      exportData = graphData;
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const timestampedFilename = generateTimestampedFilename(filename, 'json');

    downloadBlob(jsonString, timestampedFilename, EXPORT_FORMATS.json.mimeType);

    return {
      success: true,
      filename: timestampedFilename,
      format: 'json'
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      format: 'json',
      error: error instanceof Error ? error.message : 'Failed to export as JSON'
    };
  }
}
