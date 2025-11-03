/**
 * Graph Filter Engine
 * Business logic for filtering graph data
 */

import type { GraphNode, GraphLink, GraphData } from '@/types';

export interface FilterCriteria {
  nodeTypes?: string[];
  linkTypes?: string[];
  minConfidence?: number;
  tags?: string[];
  searchQuery?: string;
}

export class FilterEngine {
  /**
   * Filter nodes based on criteria
   */
  filterNodes(nodes: GraphNode[], criteria: FilterCriteria): GraphNode[] {
    let filtered = [...nodes];

    if (criteria.nodeTypes && criteria.nodeTypes.length > 0) {
      filtered = filtered.filter(node => criteria.nodeTypes!.includes(node.type));
    }

    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      filtered = filtered.filter(node =>
        node.label.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  /**
   * Filter links based on criteria and filtered nodes
   */
  filterLinks(links: GraphLink[], filteredNodeIds: Set<string>, criteria: FilterCriteria): GraphLink[] {
    let filtered = links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    if (criteria.linkTypes && criteria.linkTypes.length > 0) {
      filtered = filtered.filter(link => criteria.linkTypes!.includes(link.type));
    }

    return filtered;
  }

  /**
   * Filter entire graph
   */
  filterGraph(graphData: GraphData, criteria: FilterCriteria): GraphData {
    const filteredNodes = this.filterNodes(graphData.nodes, criteria);
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = this.filterLinks(graphData.links, filteredNodeIds, criteria);

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }
}
