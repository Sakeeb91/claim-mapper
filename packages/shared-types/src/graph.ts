/**
 * Graph Type Definitions
 */

export type NodeType = 'claim' | 'evidence' | 'reasoning';

export type LinkType = 'supports' | 'contradicts' | 'neutral' | 'related';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  data: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: LinkType;
  weight?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphLayout {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface GraphFilter {
  nodeTypes?: NodeType[];
  linkTypes?: LinkType[];
  minConfidence?: number;
  tags?: string[];
  searchQuery?: string;
}
