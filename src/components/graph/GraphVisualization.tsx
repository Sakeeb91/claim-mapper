'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphVisualizationProps, GraphNode, GraphLink } from '@/types';
import { useAppStore } from '@/store/useAppStore';

export function GraphVisualization({ selectedClaim, searchQuery, onNodeSelect }: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { graphData, loadGraphData } = useAppStore();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadGraphData(selectedClaim || undefined);
  }, [selectedClaim, loadGraphData]);

  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create container group
    const container = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create links
    const links = container.selectAll('.link')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-width', d => Math.sqrt(d.strength * 2))
      .attr('opacity', 0.6);

    // Create link labels
    const linkLabels = container.selectAll('.link-label')
      .data(graphData.links.filter(d => d.label))
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .text(d => d.label || '');

    // Create nodes
    const nodes = container.selectAll('.node')
      .data(graphData.nodes)
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
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    nodes.append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .text(d => d.label.length > 20 ? d.label.substring(0, 20) + '...' : d.label);

    // Add click handler
    nodes.on('click', (event, d) => {
      onNodeSelect(d.id);
    });

    // Update positions on tick
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

    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions, onNodeSelect]);

  return (
    <div className="graph-container relative h-full w-full">
      <svg
        ref={svgRef}
        className="h-full w-full"
        style={{ background: '#fafafa' }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 rounded-lg bg-white p-4 shadow-lg">
        <h3 className="mb-2 font-semibold">Legend</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <span>Claims</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span>Evidence</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-purple-500"></div>
            <span>Reasoning</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex space-x-2">
        <button
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg.transition().call(
              d3.zoom<SVGSVGElement, unknown>().transform,
              d3.zoomIdentity
            );
          }}
          className="rounded bg-white px-3 py-1 text-sm shadow hover:bg-gray-50"
        >
          Reset Zoom
        </button>
      </div>
    </div>
  );
}