'use client';

/**
 * ReasoningNodeRenderer Component
 *
 * Renders reasoning nodes with custom shapes based on their subtype:
 * - Premises: Circles (foundation)
 * - Inferences: Diamonds (processing)
 * - Conclusions: Hexagons (result)
 *
 * Also includes step number badges and confidence indicators.
 */

import * as d3 from 'd3';
import { GraphNode, ReasoningNodeSubtype } from '@/types';
import {
  REASONING_STEP_COLORS,
  REASONING_STEP_BG_COLORS,
  REASONING_STEP_BORDER_COLORS,
} from '@/constants/graph';

/**
 * Generates SVG path for a diamond shape centered at (0, 0)
 */
function diamondPath(size: number): string {
  const half = size;
  return `M0,${-half} L${half},0 L0,${half} L${-half},0 Z`;
}

/**
 * Generates SVG path for a hexagon shape centered at (0, 0)
 */
function hexagonPath(size: number): string {
  const angle = Math.PI / 3; // 60 degrees
  let path = '';
  for (let i = 0; i < 6; i++) {
    const x = size * Math.cos(angle * i - Math.PI / 2);
    const y = size * Math.sin(angle * i - Math.PI / 2);
    path += (i === 0 ? 'M' : 'L') + `${x},${y} `;
  }
  return path + 'Z';
}

/**
 * Generates SVG path for a rounded square shape centered at (0, 0)
 */
function squarePath(size: number): string {
  const half = size * 0.8;
  return `M${-half},${-half} L${half},${-half} L${half},${half} L${-half},${half} Z`;
}

/**
 * Generates SVG path for a triangle shape centered at (0, 0)
 */
function trianglePath(size: number): string {
  const height = size * 1.2;
  const halfBase = size * 0.9;
  const top = -height * 0.6;
  const bottom = height * 0.4;
  return `M0,${top} L${halfBase},${bottom} L${-halfBase},${bottom} Z`;
}

/**
 * Gets the SVG path generator for a given step type
 */
export function getShapePath(subtype: ReasoningNodeSubtype, size: number): string {
  switch (subtype) {
    case 'premise':
      return ''; // Circle - use SVG circle element instead
    case 'inference':
      return diamondPath(size);
    case 'conclusion':
      return hexagonPath(size);
    case 'assumption':
      return squarePath(size);
    case 'observation':
      return trianglePath(size);
    default:
      return '';
  }
}

/**
 * Gets colors for a reasoning node based on its subtype
 */
export function getNodeColors(subtype: ReasoningNodeSubtype): {
  fill: string;
  stroke: string;
  text: string;
} {
  const fillColors: Record<ReasoningNodeSubtype, string> = REASONING_STEP_BG_COLORS;
  const strokeColors: Record<ReasoningNodeSubtype, string> = REASONING_STEP_BORDER_COLORS;
  const textColors: Record<ReasoningNodeSubtype, string> = REASONING_STEP_COLORS;

  return {
    fill: fillColors[subtype] || REASONING_STEP_BG_COLORS.inference,
    stroke: strokeColors[subtype] || REASONING_STEP_BORDER_COLORS.inference,
    text: textColors[subtype] || REASONING_STEP_COLORS.inference,
  };
}

/**
 * Renders reasoning nodes with custom shapes into the given D3 selection.
 *
 * @param nodeGroup - D3 selection containing node groups
 * @param nodes - Array of reasoning nodes to render
 * @param nodeSize - Base node size
 */
export function renderReasoningNodes(
  nodeGroup: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>,
  nodes: GraphNode[],
  nodeSize: number = 15
): void {
  // Filter to only reasoning nodes
  const reasoningNodes = nodeGroup.filter((d) => d.type === 'reasoning' && d.subtype);

  // Remove any existing shapes (to re-render)
  reasoningNodes.selectAll('.reasoning-shape').remove();
  reasoningNodes.selectAll('.node-circle').attr('display', 'none');

  reasoningNodes.each(function(d) {
    const group = d3.select(this);
    const subtype = d.subtype as ReasoningNodeSubtype;
    const colors = getNodeColors(subtype);
    const shapePath = getShapePath(subtype, nodeSize);

    if (subtype === 'premise') {
      // Use circle for premises
      group.append('circle')
        .attr('class', 'reasoning-shape')
        .attr('r', nodeSize)
        .attr('fill', colors.fill)
        .attr('stroke', colors.stroke)
        .attr('stroke-width', 2);
    } else if (shapePath) {
      // Use path for other shapes
      group.append('path')
        .attr('class', 'reasoning-shape')
        .attr('d', shapePath)
        .attr('fill', colors.fill)
        .attr('stroke', colors.stroke)
        .attr('stroke-width', 2);
    }
  });
}

/**
 * Updates reasoning node positions on simulation tick.
 */
export function updateReasoningNodePositions(
  nodeGroup: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>
): void {
  nodeGroup
    .filter((d) => d.type === 'reasoning')
    .attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
}

export default {
  getShapePath,
  getNodeColors,
  renderReasoningNodes,
  updateReasoningNodePositions,
};
