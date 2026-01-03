'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { KnowledgeGraph, KnowledgeGraphHandle } from '@/components/graph/KnowledgeGraph';
import { GraphControls } from '@/components/graph/GraphControls';
import { NodeDetailsPanel } from '@/components/graph/NodeDetailsPanel';
import { ExportButton } from '@/components/graph/ExportButton';
import { ReasoningChainVisualizer } from '@/components/reasoning/ReasoningChainVisualizer';
import { toast } from 'react-hot-toast';
import { Loader2, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/utils';
import { useGraphExport } from '@/hooks';
import type { ExportFormat } from '@/types';

export default function ExplorePage() {
  const {
    graphData,
    graphFilters,
    graphLayout,
    graphSearchQuery,
    selectedNode,
    loading,
    error,
    setGraphFilters,
    setGraphLayout,
    setSelectedNode,
    searchInGraph,
    resetGraphView,
    loadGraphData,
    connectNodes
  } = useAppStore();

  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showReasoningVisualizer, setShowReasoningVisualizer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<KnowledgeGraphHandle>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Update SVG ref when graph ref changes
  useEffect(() => {
    if (graphRef.current) {
      const svg = graphRef.current.getSvgElement();
      if (svg) {
        (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = svg;
      }
    }
  });

  // Graph export hook
  const { exportGraph, isExporting } = useGraphExport(svgRef, graphData, {
    projectId: 'explore',
    projectName: 'Knowledge Graph Explorer'
  });

  // Load graph data on component mount
  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Handle node selection
  const handleNodeSelect = (nodeId: string) => {
    if (nodeId) {
      setSelectedNode(nodeId);
      setShowDetailsPanel(true);
      
      // If it's a reasoning node, show the reasoning visualizer
      const node = graphData.nodes.find(n => n.id === nodeId);
      if (node?.type === 'reasoning') {
        setShowReasoningVisualizer(true);
      }
    } else {
      setSelectedNode(null);
      setShowDetailsPanel(false);
      setShowReasoningVisualizer(false);
    }
  };

  // Handle node double-click for detailed view
  const handleNodeDoubleClick = (nodeId: string) => {
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      toast.success(`Opening detailed view for ${node.label}`);
      // Could navigate to a detailed page or open modal
    }
  };

  // Handle graph controls
  const handleFiltersChange = (newFilters: typeof graphFilters) => {
    setGraphFilters(newFilters);
  };

  const handleLayoutChange = (newLayout: typeof graphLayout) => {
    setGraphLayout(newLayout);
  };

  const handleSearchChange = (query: string) => {
    searchInGraph(query);
  };

  const handleResetView = () => {
    resetGraphView();
    toast.success('Graph view reset');
  };

  const handleExport = async (format: ExportFormat) => {
    await exportGraph(format);
  };

  // Handle node connection
  const handleConnect = async (sourceId: string, targetId: string) => {
    try {
      await connectNodes(sourceId, targetId, 'relates');
      toast.success('Nodes connected successfully');
    } catch (error) {
      toast.error('Failed to connect nodes');
    }
  };

  // Handle node editing
  const handleEdit = (_nodeId: string) => {
    toast.success('Edit functionality coming soon!');
    // Could open edit modal or navigate to edit page
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Close panels
  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setSelectedNode(null);
  };

  const closeReasoningVisualizer = () => {
    setShowReasoningVisualizer(false);
  };

  // Get selected node's reasoning data
  const selectedNodeReasoningData = selectedNode 
    ? graphData.nodes.find(n => n.id === selectedNode && n.type === 'reasoning')?.data
    : null;

  return (
    <div className={cn(
      "flex flex-col h-screen bg-gray-50",
      isFullscreen && "fixed inset-0 z-50 bg-white"
    )}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Graph Explorer</h1>
            <p className="text-sm text-gray-600 mt-1">
              Visualize and explore the relationships between claims, evidence, and reasoning
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowReasoningVisualizer(!showReasoningVisualizer)}
              className={cn(
                "flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                showReasoningVisualizer
                  ? "bg-purple-100 text-purple-700"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              {showReasoningVisualizer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>Reasoning View</span>
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>

            <ExportButton
              onExport={handleExport}
              isExporting={isExporting}
              disabled={graphData.nodes.length === 0}
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Controls */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <GraphControls
              filters={graphFilters}
              onFiltersChange={handleFiltersChange}
              layout={graphLayout}
              onLayoutChange={handleLayoutChange}
              searchQuery={graphSearchQuery}
              onSearchChange={handleSearchChange}
              onResetView={handleResetView}
            />
          </div>
        </div>

        {/* Center - Graph Visualization */}
        <div className="flex-1 relative" ref={graphContainerRef}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-600">Loading graph data...</span>
              </div>
            </div>
          ) : (
            <KnowledgeGraph
              ref={graphRef}
              data={graphData}
              selectedNodeId={selectedNode || undefined}
              onNodeSelect={handleNodeSelect}
              onNodeDoubleClick={handleNodeDoubleClick}
              filters={graphFilters}
              layout={graphLayout}
              width={graphContainerRef.current?.clientWidth}
              height={graphContainerRef.current?.clientHeight}
              className="w-full h-full"
            />
          )}

          {/* Reasoning Visualizer Overlay */}
          {showReasoningVisualizer && selectedNodeReasoningData && (
            <div className="absolute bottom-4 left-4 right-4 max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Reasoning Chain</h3>
                  <button
                    onClick={closeReasoningVisualizer}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <ReasoningChainVisualizer
                  reasoning={selectedNodeReasoningData as any}
                  interactive={true}
                  compact={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Node Details */}
        {showDetailsPanel && selectedNode && (
          <NodeDetailsPanel
            nodeId={selectedNode}
            onClose={closeDetailsPanel}
            onEdit={handleEdit}
            onConnect={handleConnect}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Nodes: {graphData.nodes.length}</span>
            <span>Connections: {graphData.links.length}</span>
            {selectedNode && (
              <span className="font-medium text-blue-600">
                Selected: {graphData.nodes.find(n => n.id === selectedNode)?.label}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span>Layout: {graphLayout.label}</span>
            <span>
              Filters: {graphFilters.nodeTypes.length} types, 
              {graphFilters.linkTypes.length} relationships
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}