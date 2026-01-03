/**
 * Graph Analyzer Unit Tests
 * Tests graph metrics calculation and central node identification
 */

import { GraphAnalyzer } from '../analyzer';

interface TestNode {
  id: string;
  type: string;
  label?: string;
  [key: string]: unknown;
}

interface TestLink {
  source: string | { id: string };
  target: string | { id: string };
  type?: string;
  [key: string]: unknown;
}

describe('GraphAnalyzer', () => {
  let analyzer: GraphAnalyzer;

  beforeEach(() => {
    analyzer = new GraphAnalyzer();
  });

  describe('calculateMetrics', () => {
    describe('Basic Counts', () => {
      it('should return correct node count', () => {
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links: TestLink[] = [];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.nodeCount).toBe(3);
      });

      it('should return correct link count', () => {
        const nodes = [{ id: '1', type: 'claim' }, { id: '2', type: 'claim' }];
        const links = [
          { source: '1', target: '2' },
        ];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.linkCount).toBe(1);
      });

      it('should handle empty graph', () => {
        const nodes: TestNode[] = [];
        const links: TestLink[] = [];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.nodeCount).toBe(0);
        expect(metrics.linkCount).toBe(0);
        expect(metrics.density).toBe(0);
        expect(metrics.averageDegree).toBe(0);
      });
    });

    describe('Density Calculation', () => {
      it('should calculate density correctly for complete graph', () => {
        // Complete graph with 3 nodes has 3 edges (n*(n-1)/2 = 3)
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links = [
          { source: '1', target: '2' },
          { source: '1', target: '3' },
          { source: '2', target: '3' },
        ];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.density).toBe(1);
      });

      it('should calculate density correctly for sparse graph', () => {
        // Graph with 4 nodes and 2 edges
        // Max possible edges = 4*3/2 = 6
        // Density = 2/6 = 0.333...
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
          { id: '4', type: 'claim' },
        ];
        const links = [
          { source: '1', target: '2' },
          { source: '3', target: '4' },
        ];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.density).toBeCloseTo(0.333, 2);
      });

      it('should return 0 density for single node', () => {
        const nodes = [{ id: '1', type: 'claim' }];
        const links: TestLink[] = [];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.density).toBe(0);
      });

      it('should handle disconnected graph', () => {
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links: TestLink[] = []; // No connections

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.density).toBe(0);
      });
    });

    describe('Average Degree Calculation', () => {
      it('should calculate average degree correctly', () => {
        // Graph: 1-2-3 (linear)
        // Degrees: node 1 = 1, node 2 = 2, node 3 = 1
        // Average = (1+2+1)/3 = 4/3 ≈ 1.33
        // Formula: 2*links/nodes = 2*2/3 ≈ 1.33
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links = [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
        ];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.averageDegree).toBeCloseTo(1.333, 2);
      });

      it('should return 0 average degree for single node', () => {
        const nodes = [{ id: '1', type: 'claim' }];
        const links: TestLink[] = [];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.averageDegree).toBe(0);
      });

      it('should calculate average degree for star graph', () => {
        // Star graph: center node connected to 4 peripheral nodes
        // Center degree = 4, peripherals = 1 each
        // Average = (4+1+1+1+1)/5 = 8/5 = 1.6
        // Formula: 2*4/5 = 1.6
        const nodes = [
          { id: 'center', type: 'claim' },
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
          { id: '4', type: 'claim' },
        ];
        const links = [
          { source: 'center', target: '1' },
          { source: 'center', target: '2' },
          { source: 'center', target: '3' },
          { source: 'center', target: '4' },
        ];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.averageDegree).toBeCloseTo(1.6, 1);
      });
    });

    describe('Return Type', () => {
      it('should return all required metric fields', () => {
        const nodes = [{ id: '1', type: 'claim' }];
        const links: TestLink[] = [];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics).toHaveProperty('nodeCount');
        expect(metrics).toHaveProperty('linkCount');
        expect(metrics).toHaveProperty('density');
        expect(metrics).toHaveProperty('averageDegree');
        expect(metrics).toHaveProperty('clusters');
      });

      it('should return clusters as 0 (placeholder)', () => {
        const nodes = [{ id: '1', type: 'claim' }, { id: '2', type: 'claim' }];
        const links = [{ source: '1', target: '2' }];

        const metrics = analyzer.calculateMetrics(nodes, links);

        expect(metrics.clusters).toBe(0);
      });
    });
  });

  describe('findCentralNodes', () => {
    describe('Degree Calculation', () => {
      it('should identify most connected node', () => {
        const nodes = [
          { id: 'hub', type: 'claim' },
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links = [
          { source: 'hub', target: '1' },
          { source: 'hub', target: '2' },
          { source: 'hub', target: '3' },
        ];

        const centralNodes = analyzer.findCentralNodes(nodes, links);

        expect(centralNodes[0].id).toBe('hub');
        expect(centralNodes[0].degree).toBe(3);
      });

      it('should calculate degrees for all nodes', () => {
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links = [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
        ];

        const centralNodes = analyzer.findCentralNodes(nodes, links);

        // Node 2 should have degree 2, others have degree 1
        const node2 = centralNodes.find(n => n.id === '2');
        expect(node2?.degree).toBe(2);

        const node1 = centralNodes.find(n => n.id === '1');
        expect(node1?.degree).toBe(1);
      });

      it('should return nodes sorted by degree descending', () => {
        const nodes = [
          { id: 'low', type: 'claim' },
          { id: 'high', type: 'claim' },
          { id: 'medium', type: 'claim' },
        ];
        const links = [
          { source: 'high', target: 'low' },
          { source: 'high', target: 'medium' },
          { source: 'medium', target: 'low' },
        ];

        const centralNodes = analyzer.findCentralNodes(nodes, links);

        expect(centralNodes[0].degree as number).toBeGreaterThanOrEqual(centralNodes[1].degree as number);
        expect(centralNodes[1].degree as number).toBeGreaterThanOrEqual(centralNodes[2].degree as number);
      });
    });

    describe('Limit Parameter', () => {
      it('should respect limit parameter', () => {
        const nodes = Array.from({ length: 20 }, (_, i) => ({ id: `node-${i}`, type: 'claim' }));
        const links = nodes.slice(1).map(node => ({
          source: 'node-0',
          target: node.id,
        }));

        const centralNodes = analyzer.findCentralNodes(nodes, links, 5);

        expect(centralNodes).toHaveLength(5);
      });

      it('should return all nodes if limit exceeds node count', () => {
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
        ];
        const links = [{ source: '1', target: '2' }];

        const centralNodes = analyzer.findCentralNodes(nodes, links, 10);

        expect(centralNodes).toHaveLength(2);
      });

      it('should default to limit of 10', () => {
        const nodes = Array.from({ length: 20 }, (_, i) => ({ id: `node-${i}`, type: 'claim' }));
        const links = nodes.slice(1).map(node => ({
          source: 'node-0',
          target: node.id,
        }));

        const centralNodes = analyzer.findCentralNodes(nodes, links);

        expect(centralNodes).toHaveLength(10);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty nodes array', () => {
        const nodes: TestNode[] = [];
        const links: TestLink[] = [];

        const centralNodes = analyzer.findCentralNodes(nodes, links);

        expect(centralNodes).toHaveLength(0);
      });

      it('should handle nodes with no connections', () => {
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links: TestLink[] = [];

        const centralNodes = analyzer.findCentralNodes(nodes, links);

        expect(centralNodes).toHaveLength(3);
        centralNodes.forEach(node => {
          expect(node.degree).toBe(0);
        });
      });

      it('should handle link objects with nested source/target', () => {
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links = [
          { source: { id: '1' }, target: { id: '2' } },
          { source: { id: '2' }, target: { id: '3' } },
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const centralNodes = analyzer.findCentralNodes(nodes, links as any);

        const node2 = centralNodes.find(n => n.id === '2');
        expect(node2?.degree).toBe(2);
      });

      it('should preserve original node properties', () => {
        const nodes = [
          { id: '1', label: 'Node 1', type: 'claim' },
          { id: '2', label: 'Node 2', type: 'evidence' },
        ];
        const links = [{ source: '1', target: '2' }];

        const centralNodes = analyzer.findCentralNodes(nodes, links);

        expect(centralNodes[0]).toHaveProperty('label');
        expect(centralNodes[0]).toHaveProperty('type');
        expect(centralNodes[0]).toHaveProperty('degree');
      });
    });

    describe('Tie Breaking', () => {
      it('should handle nodes with equal degrees', () => {
        const nodes = [
          { id: '1', type: 'claim' },
          { id: '2', type: 'claim' },
          { id: '3', type: 'claim' },
        ];
        const links = [
          { source: '1', target: '2' },
          { source: '2', target: '3' },
        ];

        const centralNodes = analyzer.findCentralNodes(nodes, links);

        // Nodes 1 and 3 have degree 1, node 2 has degree 2
        expect(centralNodes[0].id).toBe('2');
        // Both 1 and 3 should be included with same degree
        const degreeOnNodes = centralNodes.filter(n => n.degree === 1);
        expect(degreeOnNodes).toHaveLength(2);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should correctly analyze a social network-like graph', () => {
      // Simulate a small social network with influencers
      const nodes = [
        { id: 'influencer1', type: 'user' },
        { id: 'influencer2', type: 'user' },
        { id: 'follower1', type: 'user' },
        { id: 'follower2', type: 'user' },
        { id: 'follower3', type: 'user' },
        { id: 'follower4', type: 'user' },
      ];
      const links = [
        { source: 'influencer1', target: 'follower1' },
        { source: 'influencer1', target: 'follower2' },
        { source: 'influencer1', target: 'follower3' },
        { source: 'influencer2', target: 'follower2' },
        { source: 'influencer2', target: 'follower4' },
        { source: 'influencer1', target: 'influencer2' },
      ];

      const metrics = analyzer.calculateMetrics(nodes, links);
      const centralNodes = analyzer.findCentralNodes(nodes, links, 3);

      expect(metrics.nodeCount).toBe(6);
      expect(metrics.linkCount).toBe(6);
      expect(centralNodes[0].id).toBe('influencer1');
      expect(centralNodes[0].degree).toBe(4);
    });

    it('should correctly analyze a knowledge graph structure', () => {
      // Simulate a knowledge graph with claims and evidence
      const nodes = [
        { id: 'claim1', type: 'claim' },
        { id: 'claim2', type: 'claim' },
        { id: 'evidence1', type: 'evidence' },
        { id: 'evidence2', type: 'evidence' },
        { id: 'evidence3', type: 'evidence' },
      ];
      const links = [
        { source: 'evidence1', target: 'claim1' },
        { source: 'evidence2', target: 'claim1' },
        { source: 'evidence3', target: 'claim1' },
        { source: 'evidence3', target: 'claim2' },
      ];

      const metrics = analyzer.calculateMetrics(nodes, links);
      const centralNodes = analyzer.findCentralNodes(nodes, links);

      expect(metrics.nodeCount).toBe(5);
      expect(metrics.linkCount).toBe(4);

      // Claim1 has most evidence supporting it
      const claim1 = centralNodes.find(n => n.id === 'claim1');
      expect(claim1?.degree).toBe(3);

      // Evidence3 supports multiple claims
      const evidence3 = centralNodes.find(n => n.id === 'evidence3');
      expect(evidence3?.degree).toBe(2);
    });

    it('should handle large graphs efficiently', () => {
      // Generate a large graph
      const nodeCount = 1000;
      const nodes = Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${i}`,
        type: 'claim',
      }));

      // Create random links (approximately 2 links per node on average)
      const linkCount = nodeCount * 2;
      const links = Array.from({ length: linkCount }, (_, i) => ({
        source: `node-${i % nodeCount}`,
        target: `node-${(i + Math.floor(Math.random() * 100)) % nodeCount}`,
      }));

      const startTime = Date.now();
      const metrics = analyzer.calculateMetrics(nodes, links);
      const centralNodes = analyzer.findCentralNodes(nodes, links, 10);
      const endTime = Date.now();

      expect(metrics.nodeCount).toBe(nodeCount);
      expect(centralNodes).toHaveLength(10);
      // Should complete in reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
