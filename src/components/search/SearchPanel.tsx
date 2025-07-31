'use client';

import { SearchPanelProps } from '@/types';
import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';

export function SearchPanel({ searchQuery, onSearchChange }: SearchPanelProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    type: [] as string[],
    tags: [] as string[],
    confidence: [0, 100] as [number, number],
  });

  const handleClearSearch = () => {
    onSearchChange('');
  };

  const toggleFilter = (category: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category as keyof typeof prev].includes(value)
        ? (prev[category as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[category as keyof typeof prev] as string[]), value]
    }));
  };

  return (
    <div className="border-b border-border">
      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search claims, evidence, reasoning..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-accent"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
          >
            <Filter className="h-3 w-3" />
            <span>Filters</span>
          </button>
          
          {Object.values(activeFilters).some(arr => arr.length > 0) && (
            <span className="text-xs text-muted-foreground">
              {activeFilters.type.length + activeFilters.tags.length} active
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Type Filters */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Type</h3>
            <div className="space-y-2">
              {['claim', 'evidence', 'reasoning'].map((type) => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={activeFilters.type.includes(type)}
                    onChange={() => toggleFilter('type', type)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tag Filters */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Tags</h3>
            <div className="space-y-2">
              {['scientific', 'political', 'economic', 'social'].map((tag) => (
                <label key={tag} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={activeFilters.tags.includes(tag)}
                    onChange={() => toggleFilter('tags', tag)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm capitalize">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Confidence Range */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Confidence</h3>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={activeFilters.confidence[1]}
                onChange={(e) => setActiveFilters(prev => ({
                  ...prev,
                  confidence: [prev.confidence[0], parseInt(e.target.value)]
                }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{activeFilters.confidence[0]}%</span>
                <span>{activeFilters.confidence[1]}%</span>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => setActiveFilters({ type: [], tags: [], confidence: [0, 100] })}
            className="w-full rounded-md border border-border py-2 text-sm hover:bg-accent"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}