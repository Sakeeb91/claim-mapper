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
  const reasoningNodes = nodeGroup.filter((d) => d.type === 'reasoning' && !!d.subtype);

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

/**
 * Renders step number badges on reasoning nodes.
 * Shows the step order within the reasoning chain.
 *
 * @param nodeGroup - D3 selection containing node groups
 * @param nodeSize - Base node size
 */
export function renderStepNumberBadges(
  nodeGroup: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>,
  nodeSize: number = 15
): void {
  // Filter to only reasoning nodes with step numbers
  const reasoningNodes = nodeGroup.filter(
    (d) => d.type === 'reasoning' && d.stepNumber !== undefined
  );

  // Remove any existing badges
  reasoningNodes.selectAll('.step-badge').remove();

  reasoningNodes.each(function(d) {
    const group = d3.select(this);
    const stepNumber = d.stepNumber!;
    const colors = getNodeColors(d.subtype as ReasoningNodeSubtype);

    // Create badge group
    const badgeGroup = group.append('g')
      .attr('class', 'step-badge')
      .attr('transform', `translate(${nodeSize * 0.8}, ${-nodeSize * 0.8})`);

    // Badge background circle
    badgeGroup.append('circle')
      .attr('r', 9)
      .attr('fill', colors.text)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // Step number text
    badgeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(stepNumber);
  });
}

/**
 * Renders confidence indicators on reasoning nodes.
 * Shows a small confidence ring around the node.
 *
 * @param nodeGroup - D3 selection containing node groups
 * @param nodeSize - Base node size
 */
export function renderConfidenceIndicators(
  nodeGroup: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>,
  nodeSize: number = 15
): void {
  // Filter to only reasoning nodes with confidence
  const reasoningNodes = nodeGroup.filter(
    (d) => d.type === 'reasoning' && d.confidence !== undefined
  );

  // Remove any existing indicators
  reasoningNodes.selectAll('.confidence-indicator').remove();

  reasoningNodes.each(function(d) {
    const group = d3.select(this);
    const confidence = d.confidence ?? 0;

    // Create confidence arc
    const arcRadius = nodeSize + 4;
    const arcWidth = 3;
    const arcGenerator = d3.arc<d3.DefaultArcObject>()
      .innerRadius(arcRadius - arcWidth / 2)
      .outerRadius(arcRadius + arcWidth / 2)
      .startAngle(-Math.PI * 0.75)
      .endAngle(-Math.PI * 0.75 + Math.PI * 1.5 * confidence);

    // Determine color based on confidence level
    let color = '#22C55E'; // Green for high confidence
    if (confidence < 0.4) {
      color = '#EF4444'; // Red for low
    } else if (confidence < 0.7) {
      color = '#F59E0B'; // Amber for medium
    }

    group.append('path')
      .attr('class', 'confidence-indicator')
      .attr('d', arcGenerator({} as d3.DefaultArcObject))
      .attr('fill', color)
      .attr('opacity', 0.8);

    // Background arc (gray)
    const bgArcGenerator = d3.arc<d3.DefaultArcObject>()
      .innerRadius(arcRadius - arcWidth / 2)
      .outerRadius(arcRadius + arcWidth / 2)
      .startAngle(-Math.PI * 0.75)
      .endAngle(-Math.PI * 0.75 + Math.PI * 1.5);

    group.insert('path', '.confidence-indicator')
      .attr('class', 'confidence-indicator-bg')
      .attr('d', bgArcGenerator({} as d3.DefaultArcObject))
      .attr('fill', '#E5E7EB')
      .attr('opacity', 0.4);
  });
}

export default {
  getShapePath,
  getNodeColors,
  renderReasoningNodes,
  updateReasoningNodePositions,
  renderStepNumberBadges,
  renderConfidenceIndicators,
};
