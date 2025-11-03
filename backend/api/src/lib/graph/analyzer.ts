/**
 * Graph Analyzer
 * Business logic for analyzing graph structure and metrics
 */

export interface GraphMetrics {
  nodeCount: number;
  linkCount: number;
  density: number;
  averageDegree: number;
  clusters: number;
}

export class GraphAnalyzer {
  /**
   * Calculate basic graph metrics
   */
  calculateMetrics(nodes: any[], links: any[]): GraphMetrics {
    const nodeCount = nodes.length;
    const linkCount = links.length;
    const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;
    const averageDegree = nodeCount > 0 ? (2 * linkCount) / nodeCount : 0;

    return {
      nodeCount,
      linkCount,
      density,
      averageDegree,
      clusters: 0, // TODO: Implement cluster detection
    };
  }

  /**
   * Find central nodes
   */
  findCentralNodes(nodes: any[], links: any[], limit: number = 10): any[] {
    const degreeMap = new Map<string, number>();

    // Calculate degree for each node
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
      degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
    });

    // Sort nodes by degree
    return nodes
      .map(node => ({
        ...node,
        degree: degreeMap.get(node.id) || 0,
      }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, limit);
  }
}
