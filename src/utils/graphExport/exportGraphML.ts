import { DEFAULT_EXPORT_OPTIONS, EXPORT_FORMATS, GRAPHML_NAMESPACE, GRAPHML_KEYS } from '@/constants';
import type { ExportOptions, ExportResult, GraphData, GraphNode, GraphLink } from '@/types';
import { generateTimestampedFilename, downloadBlob, escapeXml } from './helpers';

/**
 * Extracts the node ID from either a string ID or GraphNode object.
 * D3.js force simulation may replace string IDs with object references.
 */
function getNodeId(node: string | GraphNode): string {
  return typeof node === 'string' ? node : node.id;
}

/**
 * Builds a complete GraphML XML document from graph data.
 * Includes key definitions for node and edge attributes.
 */
function buildGraphMLDocument(graphData: GraphData): string {
  const keyDefinitions = `
    <key id="${GRAPHML_KEYS.NODE_LABEL}" for="node" attr.name="label" attr.type="string"/>
    <key id="${GRAPHML_KEYS.NODE_TYPE}" for="node" attr.name="type" attr.type="string"/>
    <key id="${GRAPHML_KEYS.NODE_CONFIDENCE}" for="node" attr.name="confidence" attr.type="double"/>
    <key id="${GRAPHML_KEYS.EDGE_TYPE}" for="edge" attr.name="type" attr.type="string"/>
    <key id="${GRAPHML_KEYS.EDGE_WEIGHT}" for="edge" attr.name="weight" attr.type="double"/>`;

  const nodes = graphData.nodes
    .map(
      (node) => `
    <node id="${escapeXml(node.id)}">
      <data key="${GRAPHML_KEYS.NODE_LABEL}">${escapeXml(node.label)}</data>
      <data key="${GRAPHML_KEYS.NODE_TYPE}">${escapeXml(node.type)}</data>
      ${node.confidence !== undefined ? `<data key="${GRAPHML_KEYS.NODE_CONFIDENCE}">${node.confidence}</data>` : ''}
    </node>`
    )
    .join('');

  const edges = graphData.links
    .map(
      (link: GraphLink, index: number) => `
    <edge id="e${index}" source="${escapeXml(getNodeId(link.source))}" target="${escapeXml(getNodeId(link.target))}">
      <data key="${GRAPHML_KEYS.EDGE_TYPE}">${escapeXml(link.type)}</data>
      <data key="${GRAPHML_KEYS.EDGE_WEIGHT}">${link.strength || 1}</data>
    </edge>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="${GRAPHML_NAMESPACE}">
  ${keyDefinitions}
  <graph id="G" edgedefault="directed">
    ${nodes}
    ${edges}
  </graph>
</graphml>`;
}

/**
 * Exports graph data as GraphML format for network analysis tools.
 * GraphML is compatible with Gephi, Cytoscape, and other graph analysis software.
 *
 * Exported attributes:
 * - Nodes: id, label, type, confidence (if available)
 * - Edges: source, target, type, weight (strength)
 *
 * @param graphData - The graph data containing nodes and links
 * @param options - Export configuration options
 * @returns ExportResult with success status and filename
 *
 * @example
 * const result = exportAsGraphML(graphData);
 * // Opens in Gephi for advanced network analysis
 */
export function exportAsGraphML(
  graphData: GraphData,
  options: ExportOptions = {}
): ExportResult {
  const { filename } = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options
  };

  try {
    const graphmlString = buildGraphMLDocument(graphData);
    const timestampedFilename = generateTimestampedFilename(filename, 'graphml');

    downloadBlob(graphmlString, timestampedFilename, EXPORT_FORMATS.graphml.mimeType);

    return {
      success: true,
      filename: timestampedFilename,
      format: 'graphml'
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      format: 'graphml',
      error: error instanceof Error ? error.message : 'Failed to export as GraphML'
    };
  }
}
