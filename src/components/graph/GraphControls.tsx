'use client';

import { useState } from 'react';
import { Search, Filter, Layout, RotateCcw, Download, Settings } from 'lucide-react';
import { GraphControlsProps, GraphLayout } from '@/types';
import { cn } from '@/utils';

const LAYOUT_PRESETS: GraphLayout[] = [
  {
    name: 'force',
    label: 'Force Directed',
    description: 'Natural clustering based on connections',
    forces: {
      link: { distance: 100, strength: 1 },
      charge: { strength: -300 },
      center: { x: 0, y: 0 },
      collision: { radius: 30 }
    }
  },
  {
    name: 'hierarchical',
    label: 'Hierarchical',
    description: 'Tree-like structure showing relationships',
    forces: {
      link: { distance: 80, strength: 2 },
      charge: { strength: -500 },
      center: { x: 0, y: 0 },
      collision: { radius: 25 }
    }
  },
  {
    name: 'circular',
    label: 'Circular',
    description: 'Nodes arranged in circular pattern',
    forces: {
      link: { distance: 60, strength: 0.5 },
      charge: { strength: -200 },
      center: { x: 0, y: 0 },
      collision: { radius: 35 }
    }
  },
  {
    name: 'clustered',
    label: 'Clustered',
    description: 'Strong clustering by node type',
    forces: {
      link: { distance: 120, strength: 1.5 },
      charge: { strength: -400 },
      center: { x: 0, y: 0 },
      collision: { radius: 40 }
    }
  }
];

export function GraphControls({
  filters,
  onFiltersChange,
  layout,
  onLayoutChange,
  searchQuery,
  onSearchChange,
  onResetView,
  onExport
}: GraphControlsProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleNodeTypeToggle = (nodeType: 'claim' | 'evidence' | 'reasoning') => {
    const newNodeTypes = filters.nodeTypes.includes(nodeType)
      ? filters.nodeTypes.filter(t => t !== nodeType)
      : [...filters.nodeTypes, nodeType];
    
    onFiltersChange({
      ...filters,
      nodeTypes: newNodeTypes
    });
  };

  const handleLinkTypeToggle = (linkType: 'supports' | 'contradicts' | 'relates' | 'reasoning') => {
    const newLinkTypes = filters.linkTypes.includes(linkType)
      ? filters.linkTypes.filter(t => t !== linkType)
      : [...filters.linkTypes, linkType];
    
    onFiltersChange({
      ...filters,
      linkTypes: newLinkTypes
    });
  };

  const handleConfidenceRangeChange = (range: [number, number]) => {
    onFiltersChange({
      ...filters,
      confidenceRange: range
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Main Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        {/* Search */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search in graph..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              showFilters
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              showSettings
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Layout</span>
          </button>

          <button
            onClick={onResetView}
            className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset View</span>
          </button>

          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Node Types */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Node Types</h4>
              <div className="space-y-2">
                {[
                  { key: 'claim' as const, label: 'Claims', color: 'bg-blue-500' },
                  { key: 'evidence' as const, label: 'Evidence', color: 'bg-green-500' },
                  { key: 'reasoning' as const, label: 'Reasoning', color: 'bg-purple-500' }
                ].map(({ key, label, color }) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.nodeTypes.includes(key)}
                      onChange={() => handleNodeTypeToggle(key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className={`w-3 h-3 rounded-full ${color}`}></div>
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Link Types */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Relationship Types</h4>
              <div className="space-y-2">
                {[
                  { key: 'supports' as const, label: 'Supports', color: 'text-green-600' },
                  { key: 'contradicts' as const, label: 'Contradicts', color: 'text-red-600' },
                  { key: 'relates' as const, label: 'Related', color: 'text-gray-600' },
                  { key: 'reasoning' as const, label: 'Reasoning', color: 'text-purple-600' }
                ].map(({ key, label, color }) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.linkTypes.includes(key)}
                      onChange={() => handleLinkTypeToggle(key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${color}`}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Display Options</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showLabels}
                    onChange={(e) => onFiltersChange({ ...filters, showLabels: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Labels</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showIsolated}
                    onChange={(e) => onFiltersChange({ ...filters, showIsolated: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Isolated Nodes</span>
                </label>
              </div>

              {/* Confidence Range */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Range: {filters.confidenceRange[0]} - {filters.confidenceRange[1]}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.confidenceRange[0]}
                  onChange={(e) => handleConfidenceRangeChange([parseFloat(e.target.value), filters.confidenceRange[1]])}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.confidenceRange[1]}
                  onChange={(e) => handleConfidenceRangeChange([filters.confidenceRange[0], parseFloat(e.target.value)])}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Layout Algorithm</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LAYOUT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onLayoutChange(preset)}
                className={cn(
                  "p-3 text-left rounded-lg border transition-colors",
                  layout.name === preset.name
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                )}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Layout className="h-4 w-4" />
                  <span className="font-medium text-sm">{preset.label}</span>
                </div>
                <p className="text-xs text-gray-600">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}