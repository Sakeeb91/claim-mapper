'use client';

import { useCallback, useState, RefObject } from 'react';
import { toast } from 'react-hot-toast';
import { EXPORT_FORMATS } from '@/constants';
import type { ExportFormat, GraphData, ExportResult } from '@/types';
import { exportAsPNG, exportAsSVG, exportAsJSON, exportAsGraphML } from '@/utils/graphExport';

interface UseGraphExportOptions {
  projectId?: string;
  projectName?: string;
  exportedBy?: string;
}

interface UseGraphExportReturn {
  exportGraph: (format: ExportFormat) => Promise<void>;
  isExporting: boolean;
  lastExport: ExportResult | null;
}

export function useGraphExport(
  svgRef: RefObject<SVGSVGElement>,
  graphData: GraphData,
  options: UseGraphExportOptions = {}
): UseGraphExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  const exportGraph = useCallback(
    async (format: ExportFormat) => {
      if (!svgRef.current && (format === 'png' || format === 'svg')) {
        toast.error('Graph element not found');
        return;
      }

      setIsExporting(true);

      const loadingToast = toast.loading(`Exporting as ${EXPORT_FORMATS[format].label}...`);

      try {
        let result: ExportResult;

        switch (format) {
          case 'png':
            result = await exportAsPNG(svgRef.current!);
            break;
          case 'svg':
            result = exportAsSVG(svgRef.current!);
            break;
          case 'json':
            result = exportAsJSON(graphData, {
              projectId: options.projectId,
              projectName: options.projectName,
              exportedBy: options.exportedBy
            });
            break;
          case 'graphml':
            result = exportAsGraphML(graphData);
            break;
          default:
            throw new Error(`Unsupported export format: ${format}`);
        }

        setLastExport(result);

        if (result.success) {
          toast.success(`Graph exported as ${result.filename}`, { id: loadingToast });
        } else {
          toast.error(result.error || 'Export failed', { id: loadingToast });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Export failed';
        toast.error(errorMessage, { id: loadingToast });
        setLastExport({
          success: false,
          filename: '',
          format,
          error: errorMessage
        });
      } finally {
        setIsExporting(false);
      }
    },
    [svgRef, graphData, options.projectId, options.projectName, options.exportedBy]
  );

  return { exportGraph, isExporting, lastExport };
}
