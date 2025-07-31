'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { KnowledgeGraphProps, GraphNode, GraphLink } from '@/types';
import { cn } from '@/utils';

export function KnowledgeGraph({
  data,
  selectedNodeId,
  onNodeSelect,
  onNodeDoubleClick,
  filters,
  layout,
  width = 800,
  height = 600,
  className
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    const filteredNodes = data.nodes.filter(node => {
      // Filter by node type
      if (!filters.nodeTypes.includes(node.type)) return false;
      
      // Filter by confidence range (if confidence exists)
      if (node.confidence !== undefined) {
        const [min, max] = filters.confidenceRange;
        if (node.confidence < min || node.confidence > max) return false;
      }
      
      return true;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = data.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      // Only include links between visible nodes
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) return false;
      
      // Filter by link type
      if (!filters.linkTypes.includes(link.type)) return false;
      
      return true;
    });

    // Filter isolated nodes if option is disabled
    if (!filters.showIsolated) {
      const connectedNodeIds = new Set();
      filteredLinks.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        connectedNodeIds.add(sourceId);
        connectedNodeIds.add(targetId);
      });
      
      return {
        nodes: filteredNodes.filter(node => connectedNodeIds.has(node.id)),
        links: filteredLinks
      };
    }

    return { nodes: filteredNodes, links: filteredLinks };
  }, [data, filters]);

  // Color scales for nodes
  const nodeColorScale = useMemo(() => {
    return d3.scaleOrdinal<string>()
      .domain(['claim', 'evidence', 'reasoning'])
      .range(['#3b82f6', '#10b981', '#8b5cf6']);
  }, []);

  const linkColorScale = useMemo(() => {
    return d3.scaleOrdinal<string>()
      .domain(['supports', 'contradicts', 'relates', 'reasoning'])
      .range(['#10b981', '#ef4444', '#6b7280', '#8b5cf6']);
  }, []);

  // Initialize and update visualization
  const updateVisualization = useCallback(() => {
    if (!svgRef.current || !filteredData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create container group for zoom/pan
    const container = svg.append('g').attr('class', 'graph-container');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create simulation with custom forces based on layout
    const simulation = d3.forceSimulation<GraphNode>(filteredData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(filteredData.links)
        .id(d => d.id)
        .distance(layout.forces.link?.distance || 100)
        .strength(layout.forces.link?.strength || 1)
      )
      .force('charge', d3.forceManyBody()
        .strength(layout.forces.charge?.strength || -300)
      )
      .force('center', d3.forceCenter(
        layout.forces.center?.x || width / 2,
        layout.forces.center?.y || height / 2
      ))
      .force('collision', d3.forceCollide()
        .radius(layout.forces.collision?.radius || 30)
      );

    simulationRef.current = simulation;

    // Create arrows for directed links
    const defs = svg.append('defs');
    const arrowMarker = defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 13)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 13)
      .attr('markerHeight', 13)
      .attr('xoverflow', 'visible');

    arrowMarker.append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999')
      .style('stroke', 'none');

    // Create links
    const linkGroup = container.append('g').attr('class', 'links');
    const links = linkGroup.selectAll('.link')
      .data(filteredData.links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => linkColorScale(d.type))
      .attr('stroke-width', d => Math.sqrt(d.strength * 2))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Create link labels
    const linkLabels = linkGroup.selectAll('.link-label')
      .data(filteredData.links.filter(d => d.label && filters.showLabels))
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d.label || '');

    // Create nodes
    const nodeGroup = container.append('g').attr('class', 'nodes');
    const nodes = nodeGroup.selectAll('.node')
      .data(filteredData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Add circles to nodes
    nodes.append('circle')
      .attr('r', d => d.size || 15)
      .attr('fill', d => d.color || nodeColorScale(d.type))
      .attr('stroke', d => d.id === selectedNodeId ? '#ff6b35' : '#fff')
      .attr('stroke-width', d => d.id === selectedNodeId ? 3 : 2)
      .attr('opacity', d => {
        if (d.confidence !== undefined) {
          return 0.3 + (d.confidence * 0.7); // Map confidence to opacity
        }
        return 1;
      });

    // Add labels to nodes (if enabled)
    if (filters.showLabels) {
      nodes.append('text')
        .attr('dy', d => (d.size || 15) + 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#333')
        .attr('font-weight', d => d.id === selectedNodeId ? 'bold' : 'normal')
        .text(d => {
          const maxLength = 20;
          return d.label.length > maxLength ? d.label.substring(0, maxLength) + '...' : d.label;
        });
    }

    // Add confidence indicators for claims
    nodes.filter(d => d.type === 'claim' && d.confidence !== undefined)
      .append('circle')
      .attr('r', 3)
      .attr('cx', d => (d.size || 15) - 5)
      .attr('cy', d => -(d.size || 15) + 5)
      .attr('fill', d => {
        const confidence = d.confidence || 0;
        if (confidence > 0.7) return '#10b981';
        if (confidence > 0.4) return '#f59e0b';
        return '#ef4444';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Event handlers
    nodes.on('click', (event, d) => {
      event.stopPropagation();
      onNodeSelect(d.id);
    });

    if (onNodeDoubleClick) {
      nodes.on('dblclick', (event, d) => {
        event.stopPropagation();
        onNodeDoubleClick(d.id);
      });
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      linkLabels
        .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Handle clicks on empty space to deselect
    svg.on('click', () => {
      if (selectedNodeId) {
        onNodeSelect('');
      }
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData, layout, selectedNodeId, onNodeSelect, onNodeDoubleClick, filters, width, height, nodeColorScale, linkColorScale]);

  useEffect(() => {
    updateVisualization();
    
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [updateVisualization]);

  // Method to reset zoom/pan
  const resetView = useCallback(() => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(750).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity
    );
  }, []);

  // Expose reset method via ref
  useEffect(() => {
    (svgRef.current as any)?.resetView && ((svgRef.current as any).resetView = resetView);
  }, [resetView]);

  return (
    <div className={cn("relative overflow-hidden bg-gray-50", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg"
        style={{ background: 'radial-gradient(circle, #fafafa 0%, #f3f4f6 100%)' }}
      />
      
      {/* Node count indicator */}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium text-gray-600">
        {filteredData.nodes.length} nodes, {filteredData.links.length} connections
      </div>

      {/* Loading indicator */}
      {filteredData.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-500">No data to visualize</div>
        </div>
      )}
    </div>
  );
}