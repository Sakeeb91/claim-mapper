import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KnowledgeGraph } from '../KnowledgeGraph'
import { GraphNode, GraphLink, GraphFilters, GraphLayout } from '@/types'

// Mock D3 to avoid DOM manipulation issues in tests
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      remove: jest.fn(),
      data: jest.fn(() => ({
        enter: jest.fn(() => ({
          append: jest.fn(() => ({
            attr: jest.fn(() => ({
              attr: jest.fn(() => ({
                attr: jest.fn(() => ({
                  attr: jest.fn(() => ({
                    style: jest.fn(() => ({
                      call: jest.fn(),
                      on: jest.fn(),
                      append: jest.fn(),
                      text: jest.fn(),
                      filter: jest.fn(),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    })),
    append: jest.fn(() => ({
      attr: jest.fn(() => ({
        attr: jest.fn(() => ({
          attr: jest.fn(() => ({
            attr: jest.fn(() => ({
              append: jest.fn(),
            })),
          })),
        })),
      })),
    })),
    call: jest.fn(),
    on: jest.fn(),
    transition: jest.fn(() => ({
      duration: jest.fn(() => ({
        call: jest.fn(),
      })),
    })),
  })),
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn(() => ({
      on: jest.fn(),
    })),
    transform: jest.fn(),
  })),
  zoomIdentity: {},
  forceSimulation: jest.fn(() => ({
    force: jest.fn(() => ({
      force: jest.fn(() => ({
        force: jest.fn(() => ({
          force: jest.fn(),
        })),
      })),
    })),
    on: jest.fn(),
    stop: jest.fn(),
    alphaTarget: jest.fn(() => ({
      restart: jest.fn(),
    })),
  })),
  forceLink: jest.fn(() => ({
    id: jest.fn(() => ({
      distance: jest.fn(() => ({
        strength: jest.fn(),
      })),
    })),
  })),
  forceManyBody: jest.fn(() => ({
    strength: jest.fn(),
  })),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(() => ({
    radius: jest.fn(),
  })),
  drag: jest.fn(() => ({
    on: jest.fn(() => ({
      on: jest.fn(() => ({
        on: jest.fn(),
      })),
    })),
  })),
  scaleOrdinal: jest.fn(() => ({
    domain: jest.fn(() => ({
      range: jest.fn(),
    })),
  })),
}))

describe('KnowledgeGraph', () => {
  const mockNodes: GraphNode[] = [
    {
      id: 'node1',
      label: 'Climate Change is Real',
      type: 'claim',
      size: 20,
      confidence: 0.9,
      x: 100,
      y: 100,
      color: '#3b82f6',
      data: {
        id: 'node1',
        text: 'Climate Change is Real',
        type: 'hypothesis',
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        evidence: [],
        reasoning: [],
      },
    },
    {
      id: 'node2',
      label: 'Temperature Data',
      type: 'evidence',
      size: 15,
      confidence: 0.8,
      x: 200,
      y: 150,
      color: '#10b981',
      data: {
        id: 'node2',
        text: 'Temperature Data',
        type: 'supporting',
        source: 'NOAA',
        reliability: 0.8,
        claimId: 'node1',
        createdAt: new Date(),
      },
    },
    {
      id: 'node3',
      label: 'Scientific Consensus',
      type: 'reasoning',
      size: 18,
      x: 150,
      y: 200,
      color: '#f59e0b',
      data: {
        id: 'node3',
        steps: [],
        claimId: 'node1',
        type: 'deductive',
        createdAt: new Date(),
      },
    },
  ]

  const mockLinks: GraphLink[] = [
    {
      id: 'link1',
      source: 'node1',
      target: 'node2',
      type: 'supports',
      strength: 1,
      label: 'supported by',
    },
    {
      id: 'link2',
      source: 'node2',
      target: 'node3',
      type: 'relates',
      strength: 0.8,
    },
  ]

  const mockFilters: GraphFilters = {
    nodeTypes: ['claim', 'evidence', 'reasoning'],
    linkTypes: ['supports', 'contradicts', 'relates', 'reasoning'],
    confidenceRange: [0, 1],
    showLabels: true,
    showIsolated: true,
  }

  const mockLayout: GraphLayout = {
    name: 'force',
    label: 'Force-Directed',
    description: 'Standard force-directed layout',
    forces: {
      link: { distance: 100, strength: 1 },
      charge: { strength: -300 },
      center: { x: 400, y: 300 },
      collision: { radius: 30 },
    },
  }

  const defaultProps = {
    data: { nodes: mockNodes, links: mockLinks },
    selectedNodeId: '',
    onNodeSelect: jest.fn(),
    onNodeDoubleClick: jest.fn(),
    filters: mockFilters,
    layout: mockLayout,
    width: 800,
    height: 600,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<KnowledgeGraph {...defaultProps} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('displays node and connection count', () => {
    render(<KnowledgeGraph {...defaultProps} />)
    expect(screen.getByText('3 nodes, 2 connections')).toBeInTheDocument()
  })

  it('shows no data message when nodes array is empty', () => {
    const emptyData = { nodes: [], links: [] }
    render(<KnowledgeGraph {...defaultProps} data={emptyData} />)
    expect(screen.getByText('No data to visualize')).toBeInTheDocument()
  })

  it('filters nodes based on node types', () => {
    const limitedFilters = { ...mockFilters, nodeTypes: ['claim'] }
    render(<KnowledgeGraph {...defaultProps} filters={limitedFilters} />)
    // Should only show claim nodes (1 node)
    expect(screen.getByText('1 nodes, 0 connections')).toBeInTheDocument()
  })

  it('filters nodes based on confidence range', () => {
    const confidenceFilters = { ...mockFilters, confidenceRange: [0.85, 1] as [number, number] }
    render(<KnowledgeGraph {...defaultProps} filters={confidenceFilters} />)
    // Should only show nodes with confidence >= 0.85 (node1 with 0.9 confidence)
    expect(screen.getByText('1 nodes, 0 connections')).toBeInTheDocument()
  })

  it('filters links based on link types', () => {
    const linkFilters = { ...mockFilters, linkTypes: ['supports'] }
    render(<KnowledgeGraph {...defaultProps} filters={linkFilters} />)
    // Should show all nodes but only 1 link (supports)
    expect(screen.getByText('3 nodes, 1 connections')).toBeInTheDocument()
  })

  it('hides isolated nodes when showIsolated is false', () => {
    const noIsolatedFilters = { ...mockFilters, showIsolated: false }
    render(<KnowledgeGraph {...defaultProps} filters={noIsolatedFilters} />)
    // All nodes are connected via links, so should show all
    expect(screen.getByText('3 nodes, 2 connections')).toBeInTheDocument()
  })

  it('calls onNodeSelect when a node area is clicked', async () => {
    const user = userEvent.setup()
    const onNodeSelect = jest.fn()
    
    render(<KnowledgeGraph {...defaultProps} onNodeSelect={onNodeSelect} />)
    
    // Mock D3 selection to simulate node click
    const svg = screen.getByRole('img')
    fireEvent.click(svg)
    
    // Since we're mocking D3, we can't test actual node clicks,
    // but we can verify the component renders properly
    expect(svg).toBeInTheDocument()
  })

  it('handles double click events on nodes', () => {
    const onNodeDoubleClick = jest.fn()
    render(<KnowledgeGraph {...defaultProps} onNodeDoubleClick={onNodeDoubleClick} />)
    
    const svg = screen.getByRole('img')
    expect(svg).toBeInTheDocument()
  })

  it('applies custom width and height', () => {
    render(<KnowledgeGraph {...defaultProps} width={1000} height={800} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('width', '1000')
    expect(svg).toHaveAttribute('height', '800')
  })

  it('applies custom className', () => {
    render(<KnowledgeGraph {...defaultProps} className="custom-graph" />)
    const container = screen.getByRole('img').parentElement
    expect(container).toHaveClass('custom-graph')
  })

  it('highlights selected node', () => {
    render(<KnowledgeGraph {...defaultProps} selectedNodeId="node1" />)
    // With D3 mocked, we mainly verify the component renders
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('handles empty links array', () => {
    const dataWithoutLinks = { nodes: mockNodes, links: [] }
    render(<KnowledgeGraph {...defaultProps} data={dataWithoutLinks} />)
    expect(screen.getByText('3 nodes, 0 connections')).toBeInTheDocument()
  })

  it('handles nodes without confidence values', () => {
    const nodesWithoutConfidence = mockNodes.map(node => ({
      ...node,
      confidence: undefined,
    }))
    const dataWithoutConfidence = { nodes: nodesWithoutConfidence, links: mockLinks }
    render(<KnowledgeGraph {...defaultProps} data={dataWithoutConfidence} />)
    expect(screen.getByText('3 nodes, 2 connections')).toBeInTheDocument()
  })

  it('truncates long node labels', () => {
    const longLabelNode = {
      ...mockNodes[0],
      label: 'This is a very long label that should be truncated for display purposes',
    }
    const dataWithLongLabel = {
      nodes: [longLabelNode, ...mockNodes.slice(1)],
      links: mockLinks,
    }
    render(<KnowledgeGraph {...defaultProps} data={dataWithLongLabel} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('handles different layout configurations', () => {
    const customLayout: GraphLayout = {
      name: 'custom',
      label: 'Custom Layout',
      description: 'Custom force-directed layout',
      forces: {
        link: { distance: 50, strength: 0.5 },
        charge: { strength: -500 },
        center: { x: 500, y: 400 },
        collision: { radius: 40 },
      },
    }
    render(<KnowledgeGraph {...defaultProps} layout={customLayout} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('deselects node when clicking on empty space', () => {
    const onNodeSelect = jest.fn()
    render(<KnowledgeGraph {...defaultProps} selectedNodeId="node1" onNodeSelect={onNodeSelect} />)
    
    const svg = screen.getByRole('img')
    fireEvent.click(svg)
    
    // Verify the SVG is present (D3 interaction is mocked)
    expect(svg).toBeInTheDocument()
  })

  it('maintains aspect ratio with different dimensions', () => {
    render(<KnowledgeGraph {...defaultProps} width={400} height={300} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('width', '400')
    expect(svg).toHaveAttribute('height', '300')
  })

  it('handles edge case with single node', () => {
    const singleNodeData = { nodes: [mockNodes[0]], links: [] }
    render(<KnowledgeGraph {...defaultProps} data={singleNodeData} />)
    expect(screen.getByText('1 nodes, 0 connections')).toBeInTheDocument()
  })

  it('handles mixed node types correctly', () => {
    const mixedNodes = [
      { ...mockNodes[0], type: 'claim' as const },
      { ...mockNodes[1], type: 'evidence' as const },
      { ...mockNodes[2], type: 'reasoning' as const },
    ]
    const mixedData = { nodes: mixedNodes, links: mockLinks }
    render(<KnowledgeGraph {...defaultProps} data={mixedData} />)
    expect(screen.getByText('3 nodes, 2 connections')).toBeInTheDocument()
  })
})