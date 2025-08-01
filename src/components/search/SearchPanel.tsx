'use client';

import { SearchPanelProps } from '@/types';
import { Search, Filter, X, Settings, Brain, Calendar } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useSearchStore } from '@/store/searchStore';
import { useSearch } from '@/hooks/useSearch';

export function SearchPanel({ searchQuery, onSearchChange }: SearchPanelProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const { query, semanticEnabled, toggleSemanticSearch } = useSearchStore();
  const { refineSearch } = useSearch();
  
  const [activeFilters, setActiveFilters] = useState({
    type: [] as string[],
    tags: [] as string[],
    confidence: [0, 100] as [number, number],
    dateRange: null as { start: Date; end: Date } | null,
  });

  const handleClearSearch = () => {
    onSearchChange('');
  };

  const toggleFilter = (category: string, value: string) => {
    const newFilters = {
      ...activeFilters,
      [category]: activeFilters[category as keyof typeof activeFilters].includes(value)
        ? (activeFilters[category as keyof typeof activeFilters] as string[]).filter(item => item !== value)
        : [...(activeFilters[category as keyof typeof activeFilters] as string[]), value]
    };
    setActiveFilters(newFilters);
    
    // Update search store
    refineSearch({
      types: newFilters.type as any[],
      tags: newFilters.tags,
      confidenceRange: newFilters.confidence,
      dateRange: newFilters.dateRange,
    });
  };
  
  const updateConfidenceRange = (range: [number, number]) => {
    const newFilters = { ...activeFilters, confidence: range };
    setActiveFilters(newFilters);
    refineSearch({
      confidenceRange: range,
    });
  };
  
  const updateDateRange = (dateRange: { start: Date; end: Date } | null) => {
    const newFilters = { ...activeFilters, dateRange };
    setActiveFilters(newFilters);
    refineSearch({ dateRange });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    count += activeFilters.type.length;
    count += activeFilters.tags.length;
    if (activeFilters.confidence[0] > 0 || activeFilters.confidence[1] < 100) count++;
    if (activeFilters.dateRange) count++;
    return count;
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

        {/* Controls */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "flex items-center space-x-2 rounded-md px-2 py-1 text-sm transition-colors",
                showFilters ? "bg-accent" : "hover:bg-accent"
              )}
            >
              <Filter className="h-3 w-3" />
              <span>Filters</span>
            </button>
            
            <button
              onClick={toggleSemanticSearch}
              className={clsx(
                "flex items-center space-x-2 rounded-md px-2 py-1 text-sm transition-colors",
                semanticEnabled ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
              title={`Semantic search ${semanticEnabled ? 'enabled' : 'disabled'}`}
            >
              <Brain className="h-3 w-3" />
              <span>AI</span>
            </button>
          </div>
          
          {getActiveFilterCount() > 0 && (
            <span className="text-xs text-muted-foreground">
              {getActiveFilterCount()} active
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Type Filters */}
              <div>
                <h3 className="mb-2 text-sm font-medium">Type</h3>
                <div className="space-y-2">
                  {['claim', 'evidence', 'reasoning', 'project'].map((type) => (
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
                  {['scientific', 'political', 'economic', 'social', 'technical', 'research'].map((tag) => (
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
                <h3 className="mb-2 text-sm font-medium">Confidence Range</h3>
                <div className="space-y-2">
                  <div className="px-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={activeFilters.confidence[1]}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        updateConfidenceRange([activeFilters.confidence[0], value]);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{activeFilters.confidence[0]}%</span>
                    <span>{activeFilters.confidence[1]}%</span>
                  </div>
                </div>
              </div>
              
              {/* Date Range */}
              <div>
                <h3 className="mb-2 text-sm font-medium">Date Range</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateDateRange({ start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() })}
                      className="px-2 py-1 text-xs border border-input rounded hover:bg-accent transition-colors"
                    >
                      Past Week
                    </button>
                    <button
                      onClick={() => updateDateRange({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() })}
                      className="px-2 py-1 text-xs border border-input rounded hover:bg-accent transition-colors"
                    >
                      Past Month
                    </button>
                  </div>
                  
                  {activeFilters.dateRange && (
                    <div className="text-xs text-muted-foreground">
                      {activeFilters.dateRange.start.toLocaleDateString()} - {activeFilters.dateRange.end.toLocaleDateString()}
                      <button
                        onClick={() => updateDateRange(null)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setActiveFilters({ type: [], tags: [], confidence: [0, 100], dateRange: null });
                  refineSearch({
                    types: [],
                    tags: [],
                    confidenceRange: [0, 100],
                    dateRange: null,
                  });
                }}
                className="w-full rounded-md border border-border py-2 text-sm hover:bg-accent transition-colors"
                disabled={getActiveFilterCount() === 0}
              >
                Clear All Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}