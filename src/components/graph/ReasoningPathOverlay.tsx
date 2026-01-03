'use client';

/**
 * ReasoningPathOverlay Component
 *
 * Renders reasoning chain paths as an overlay on the knowledge graph.
 * Shows the logical flow from premises through inferences to conclusions
 * with animated gradient paths.
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphLink } from '@/types';
import {
  REASONING_STEP_COLORS,
  REASONING_FLOW_GRADIENT,
  REASONING_LINK_COLORS,
} from '@/constants/graph';
import styles from './ReasoningPathOverlay.module.css';

export interface ReasoningPathOverlayProps {
  /** Reference to the parent SVG element */
  svgRef: React.RefObject<SVGSVGElement>;
  /** Links that represent reasoning flow (filtered to isLogicalFlow) */
  reasoningLinks: GraphLink[];
  /** Currently highlighted chain ID (or null for none) */
  highlightedChainId: string | null;
  /** Whether to animate the flow */
  animate?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Callback to update path positions (called from simulation tick) */
  onPathsUpdated?: () => void;
}

/**
 * Generates a curved path between two points.
 * Uses a quadratic bezier curve for smooth visual flow.
 */
function generateCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number = 0.2
): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Offset control point perpendicular to the line
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return `M${x1},${y1}L${x2},${y2}`;

  // Perpendicular offset
  const offsetX = -(dy / len) * len * curvature;
  const offsetY = (dx / len) * len * curvature;

  const ctrlX = midX + offsetX;
  const ctrlY = midY + offsetY;

  return `M${x1},${y1}Q${ctrlX},${ctrlY} ${x2},${y2}`;
}

/**
 * Generates a straight path between two points.
 */
function generateStraightPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  return `M${x1},${y1}L${x2},${y2}`;
}

/**
 * Creates gradient definitions for reasoning flow visualization
 */
function createGradientDefs(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
): void {
  // Get or create defs element
  let defs = svg.select<SVGDefsElement>('defs');
  if (defs.empty()) {
    defs = svg.append('defs');
  }

  // Remove existing reasoning gradients
  defs.selectAll('.reasoning-gradient').remove();

  // Create main flow gradient
  const flowGradient = defs.append('linearGradient')
    .attr('id', 'reasoning-flow-gradient')
    .attr('class', 'reasoning-gradient')
    .attr('gradientUnits', 'userSpaceOnUse');

  flowGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', REASONING_FLOW_GRADIENT.start);

  flowGradient.append('stop')
    .attr('offset', '50%')
    .attr('stop-color', REASONING_FLOW_GRADIENT.middle);

  flowGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', REASONING_FLOW_GRADIENT.end);

  // Create highlighted gradient (brighter)
  const highlightGradient = defs.append('linearGradient')
    .attr('id', 'reasoning-flow-gradient-highlighted')
    .attr('class', 'reasoning-gradient')
    .attr('gradientUnits', 'userSpaceOnUse');

  highlightGradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', REASONING_STEP_COLORS.premise);

  highlightGradient.append('stop')
    .attr('offset', '50%')
    .attr('stop-color', REASONING_STEP_COLORS.inference);

  highlightGradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', REASONING_STEP_COLORS.conclusion);
}

/**
 * Gets the appropriate CSS class for a reasoning path based on its state.
 */
function getPathClass(
  link: GraphLink,
  highlightedChainId: string | null,
  animate: boolean
): string {
  const classes: string[] = [];

  // Base path class based on animation setting
  if (!animate) {
    classes.push(styles.reasoningPathStatic);
  }

  // Check if this link is in the highlighted chain
  const isHighlighted = highlightedChainId && link.data?.chainId === highlightedChainId;
  const isDimmed = highlightedChainId && link.data?.chainId !== highlightedChainId;

  if (isHighlighted) {
    classes.push(styles.reasoningPathHighlighted);
  } else if (isDimmed) {
    classes.push(styles.reasoningPathDimmed);
  } else if (animate) {
    classes.push(styles.reasoningPath);
  }

  // Special handling for contradicting relationships
  if (link.type === 'contradicts') {
    classes.push(styles.reasoningPathContradicts);
  }

  // Evidence-to-premise paths get their own style
  if (link.data?.relationship === 'evidence-to-premise') {
    if (isHighlighted) {
      classes.push(styles.evidencePathHighlighted);
    } else {
      classes.push(styles.evidencePath);
    }
  }

  return classes.join(' ');
}

/**
 * Creates arrow marker definitions
 */
function createArrowMarkers(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
): void {
  let defs = svg.select<SVGDefsElement>('defs');
  if (defs.empty()) {
    defs = svg.append('defs');
  }

  // Remove existing reasoning markers
  defs.selectAll('.reasoning-marker').remove();

  // Create reasoning arrow marker
  const reasoningArrow = defs.append('marker')
    .attr('id', 'reasoning-arrow')
    .attr('class', 'reasoning-marker')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .attr('orient', 'auto');

  reasoningArrow.append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', REASONING_LINK_COLORS.requires);

  // Create highlighted arrow marker
  const highlightedArrow = defs.append('marker')
    .attr('id', 'reasoning-arrow-highlighted')
    .attr('class', 'reasoning-marker')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('markerWidth', 10)
    .attr('markerHeight', 10)
    .attr('orient', 'auto');

  highlightedArrow.append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', REASONING_STEP_COLORS.conclusion);
}

/**
 * Updates path positions based on current node positions.
 * Call this from the D3 simulation tick handler.
 */
export function updateReasoningPaths(
  pathGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  links: GraphLink[]
): void {
  pathGroup.selectAll<SVGPathElement, GraphLink>('.reasoning-path')
    .attr('d', (d) => {
      const source = d.source as { x?: number; y?: number };
      const target = d.target as { x?: number; y?: number };

      if (source.x === undefined || source.y === undefined ||
          target.x === undefined || target.y === undefined) {
        return '';
      }

      // Use curved paths for evidence links, straight for reasoning flow
      if (d.curved || d.data?.relationship === 'evidence-to-premise') {
        return generateCurvedPath(source.x, source.y, target.x, target.y);
      }

      return generateStraightPath(source.x, source.y, target.x, target.y);
    });
}

export function ReasoningPathOverlay({
  svgRef,
  reasoningLinks,
  highlightedChainId,
  animate = true,
  animationDuration = 500,
  onPathsUpdated,
}: ReasoningPathOverlayProps) {
  const pathGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Create gradient and marker definitions
    createGradientDefs(svg);
    createArrowMarkers(svg);

    // Get or create reasoning paths group
    let pathGroup = svg.select<SVGGElement>('.reasoning-paths-group');
    if (pathGroup.empty()) {
      pathGroup = svg.select('.graph-container')
        .insert('g', '.links') // Insert before links
        .attr('class', 'reasoning-paths-group');
    }
    pathGroupRef.current = pathGroup;

    // Filter to only logical flow links
    const flowLinks = reasoningLinks.filter((link) => link.data?.isLogicalFlow);

    // Update paths
    const paths = pathGroup.selectAll<SVGPathElement, GraphLink>('.reasoning-path')
      .data(flowLinks, (d) => d.id);

    // Remove old paths
    paths.exit()
      .transition()
      .duration(animationDuration / 2)
      .attr('opacity', 0)
      .remove();

    // Add new paths
    const pathsEnter = paths.enter()
      .append('path')
      .attr('class', (d) => `reasoning-path ${styles.pathEnter} ${getPathClass(d, highlightedChainId, animate)}`)
      .attr('fill', 'none')
      .attr('opacity', 0);

    // Update all paths
    const pathsMerge = pathsEnter.merge(paths);

    pathsMerge
      // Update CSS classes for animation state
      .attr('class', (d) => `reasoning-path ${getPathClass(d, highlightedChainId, animate)}`)
      .transition()
      .duration(animate ? animationDuration : 0)
      .attr('stroke', (d) => {
        if (highlightedChainId && d.data?.chainId === highlightedChainId) {
          return 'url(#reasoning-flow-gradient-highlighted)';
        }
        return d.type === 'contradicts'
          ? REASONING_LINK_COLORS.contradicts
          : REASONING_LINK_COLORS.requires;
      })
      .attr('stroke-width', (d) => {
        if (highlightedChainId && d.data?.chainId === highlightedChainId) {
          return 3;
        }
        return highlightedChainId ? 1 : 2;
      })
      .attr('opacity', (d) => {
        if (highlightedChainId) {
          return d.data?.chainId === highlightedChainId ? 1 : 0.2;
        }
        return 0.7;
      })
      .attr('marker-end', (d) => {
        if (highlightedChainId && d.data?.chainId === highlightedChainId) {
          return 'url(#reasoning-arrow-highlighted)';
        }
        return 'url(#reasoning-arrow)';
      })
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .on('end', () => {
        // Initial path position update
        if (pathGroupRef.current) {
          updateReasoningPaths(pathGroupRef.current, flowLinks);
        }
        onPathsUpdated?.();
      });

    // Cleanup on unmount
    return () => {
      if (pathGroupRef.current) {
        pathGroupRef.current.selectAll('.reasoning-path').remove();
      }
    };
  }, [svgRef, reasoningLinks, highlightedChainId, animate, animationDuration, onPathsUpdated]);

  // This component renders via D3, not React JSX
  return null;
}

/**
 * Hook to get the reasoning paths group reference.
 * Use this to update paths on simulation tick.
 */
export function getReasoningPathGroup(
  svgRef: React.RefObject<SVGSVGElement>
): d3.Selection<SVGGElement, unknown, null, undefined> | null {
  if (!svgRef.current) return null;
  const svg = d3.select(svgRef.current);
  const group = svg.select<SVGGElement>('.reasoning-paths-group');
  return group.empty() ? null : group;
}

export default ReasoningPathOverlay;
