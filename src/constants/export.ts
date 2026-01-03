import type { ExportFormat, ExportOptions } from '@/types';

export const EXPORT_FORMATS: Record<ExportFormat, { label: string; extension: string; mimeType: string; description: string }> = {
  png: {
    label: 'PNG Image',
    extension: '.png',
    mimeType: 'image/png',
    description: 'High-quality raster image'
  },
  svg: {
    label: 'SVG Vector',
    extension: '.svg',
    mimeType: 'image/svg+xml',
    description: 'Scalable vector graphics'
  },
  json: {
    label: 'JSON Data',
    extension: '.json',
    mimeType: 'application/json',
    description: 'Structured graph data with metadata'
  },
  graphml: {
    label: 'GraphML',
    extension: '.graphml',
    mimeType: 'application/xml',
    description: 'Network analysis format (Gephi, Cytoscape)'
  }
} as const;

export const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions> = {
  filename: 'claim-mapper-graph',
  includeMetadata: true,
  quality: 1.0,
  backgroundColor: '#ffffff'
} as const;

export const EXPORT_FILENAME_PREFIX = 'claim-mapper-graph';

export const GRAPHML_NAMESPACE = 'http://graphml.graphdrawing.org/xmlns';

export const GRAPHML_KEYS = {
  NODE_LABEL: 'label',
  NODE_TYPE: 'type',
  NODE_CONFIDENCE: 'confidence',
  EDGE_TYPE: 'edgeType',
  EDGE_WEIGHT: 'weight'
} as const;
