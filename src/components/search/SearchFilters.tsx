'use client';

import React, { useState } from 'react';
import { 
  Filter, 
  Calendar, 
  Tag, 
  User, 
  MapPin, 
  TrendingUp,
  X,
  ChevronDown,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { format, subDays, startOfYear } from 'date-fns';
import { SearchFiltersProps, AdvancedSearchFilters, SearchFacets } from '@/types/search';

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

function FilterSection({ title, icon, isExpanded, onToggle, children, count }: FilterSectionProps) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-accent transition-colors"
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SearchFilters({
  filters,
  facets,
  onFiltersChange,
  onReset,
  className
}: SearchFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['types', 'confidence'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const updateFilters = (updates: Partial<AdvancedSearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const hasActiveFilters = () => {
    return (
      filters.types.length > 0 ||
      filters.tags.length > 0 ||
      filters.authors.length > 0 ||
      filters.sources.length > 0 ||
      filters.status.length > 0 ||
      filters.confidenceRange[0] > 0 ||
      filters.confidenceRange[1] < 100 ||
      filters.dateRange !== null ||
      filters.hasEvidence !== null ||
      filters.hasReasoning !== null ||
      filters.location !== null
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    count += filters.types.length;
    count += filters.tags.length;
    count += filters.authors.length;
    count += filters.sources.length;
    count += filters.status.length;
    if (filters.confidenceRange[0] > 0 || filters.confidenceRange[1] < 100) count++;
    if (filters.dateRange) count++;
    if (filters.hasEvidence !== null) count++;
    if (filters.hasReasoning !== null) count++;
    if (filters.location) count++;
    return count;
  };

  const handleDateRangeSelect = (range: 'today' | 'week' | 'month' | 'year' | 'custom') => {
    const now = new Date();
    let dateRange = null;

    switch (range) {
      case 'today':
        dateRange = { start: now, end: now };
        break;
      case 'week':
        dateRange = { start: subDays(now, 7), end: now };
        break;
      case 'month':
        dateRange = { start: subDays(now, 30), end: now };
        break;
      case 'year':
        dateRange = { start: startOfYear(now), end: now };
        break;
      default:
        dateRange = null;
    }

    updateFilters({ dateRange });
  };

  return (
    <div className={clsx("bg-background border border-border rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-sm">Filters</span>
          {hasActiveFilters() && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {getActiveFilterCount()}
            </span>
          )}
        </div>
        {hasActiveFilters() && (
          <button
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Content Types */}
      <FilterSection
        title="Content Type"
        icon={<Sliders className="h-4 w-4" />}
        isExpanded={expandedSections.has('types')}
        onToggle={() => toggleSection('types')}
        count={filters.types.length}
      >
        <div className="space-y-2">
          {facets.types.map((type) => (
            <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.types.includes(type.value as any)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...filters.types, type.value as any]
                    : filters.types.filter(t => t !== type.value);
                  updateFilters({ types: newTypes });
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm capitalize flex-1">{type.value}</span>
              <span className="text-xs text-muted-foreground">{type.count}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Confidence Range */}
      <FilterSection
        title="Confidence"
        icon={<TrendingUp className="h-4 w-4" />}
        isExpanded={expandedSections.has('confidence')}
        onToggle={() => toggleSection('confidence')}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{filters.confidenceRange[0]}%</span>
              <span>{filters.confidenceRange[1]}%</span>
            </div>
            <div className="px-2">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.confidenceRange[1]}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  updateFilters({
                    confidenceRange: [filters.confidenceRange[0], value]
                  });
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          {/* Confidence Histogram */}
          {facets.confidenceRanges.histogram.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-2">Distribution</div>
              <div className="flex items-end space-x-1 h-8">
                {facets.confidenceRanges.histogram.map((bin, index) => (
                  <div
                    key={index}
                    className="bg-muted flex-1 rounded-sm"
                    style={{
                      height: `${(bin.count / Math.max(...facets.confidenceRanges.histogram.map(b => b.count))) * 100}%`
                    }}
                    title={`${bin.value}%: ${bin.count} items`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </FilterSection>

      {/* Date Range */}
      <FilterSection
        title="Date Range"
        icon={<Calendar className="h-4 w-4" />}
        isExpanded={expandedSections.has('date')}
        onToggle={() => toggleSection('date')}
        count={filters.dateRange ? 1 : 0}
      >
        <div className="space-y-3">
          {/* Quick Date Ranges */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'Past Week' },
              { key: 'month', label: 'Past Month' },
              { key: 'year', label: 'This Year' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleDateRangeSelect(key as any)}
                className={clsx(
                  "px-3 py-2 text-xs rounded border transition-colors",
                  "hover:bg-accent hover:border-accent-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Custom Range</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.dateRange?.start ? format(filters.dateRange.start, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const start = e.target.value ? new Date(e.target.value) : undefined;
                  updateFilters({
                    dateRange: start ? { ...filters.dateRange, start } : null
                  });
                }}
                className="px-2 py-1 text-xs border border-input rounded"
                placeholder="Start date"
              />
              <input
                type="date"
                value={filters.dateRange?.end ? format(filters.dateRange.end, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const end = e.target.value ? new Date(e.target.value) : undefined;
                  updateFilters({
                    dateRange: end ? { ...filters.dateRange, end } : null
                  });
                }}
                className="px-2 py-1 text-xs border border-input rounded"
                placeholder="End date"
              />
            </div>
          </div>

          {/* Predefined Date Ranges from Facets */}
          {facets.dateRanges.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium">Popular Ranges</div>
              {facets.dateRanges.slice(0, 3).map((range) => (
                <button
                  key={range.label}
                  onClick={() => updateFilters({
                    dateRange: { start: range.start, end: range.end }
                  })}
                  className={clsx(
                    "flex items-center justify-between w-full px-2 py-1 text-xs rounded",
                    "hover:bg-accent transition-colors",
                    range.selected && "bg-accent"
                  )}
                >
                  <span>{range.label}</span>
                  <span className="text-muted-foreground">{range.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </FilterSection>

      {/* Tags */}
      <FilterSection
        title="Tags"
        icon={<Tag className="h-4 w-4" />}
        isExpanded={expandedSections.has('tags')}
        onToggle={() => toggleSection('tags')}
        count={filters.tags.length}
      >
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {facets.tags.map((tag) => (
            <label key={tag.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.tags.includes(tag.value)}
                onChange={(e) => {
                  const newTags = e.target.checked
                    ? [...filters.tags, tag.value]
                    : filters.tags.filter(t => t !== tag.value);
                  updateFilters({ tags: newTags });
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm flex-1">{tag.value}</span>
              <span className="text-xs text-muted-foreground">{tag.count}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Authors */}
      <FilterSection
        title="Authors"
        icon={<User className="h-4 w-4" />}
        isExpanded={expandedSections.has('authors')}
        onToggle={() => toggleSection('authors')}
        count={filters.authors.length}
      >
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {facets.authors.map((author) => (
            <label key={author.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.authors.includes(author.value)}
                onChange={(e) => {
                  const newAuthors = e.target.checked
                    ? [...filters.authors, author.value]
                    : filters.authors.filter(a => a !== author.value);
                  updateFilters({ authors: newAuthors });
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm flex-1">{author.value}</span>
              <span className="text-xs text-muted-foreground">{author.count}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Sources */}
      <FilterSection
        title="Sources"
        icon={<MapPin className="h-4 w-4" />}
        isExpanded={expandedSections.has('sources')}
        onToggle={() => toggleSection('sources')}
        count={filters.sources.length}
      >
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {facets.sources.map((source) => (
            <label key={source.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.sources.includes(source.value)}
                onChange={(e) => {
                  const newSources = e.target.checked
                    ? [...filters.sources, source.value]
                    : filters.sources.filter(s => s !== source.value);
                  updateFilters({ sources: newSources });
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm flex-1">{source.value}</span>
              <span className="text-xs text-muted-foreground">{source.count}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Evidence & Reasoning Filters */}
      <FilterSection
        title="Content Requirements"
        icon={<Filter className="h-4 w-4" />}
        isExpanded={expandedSections.has('requirements')}
        onToggle={() => toggleSection('requirements')}
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium mb-2">Evidence</div>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasEvidence"
                  checked={filters.hasEvidence === true}
                  onChange={() => updateFilters({ hasEvidence: true })}
                  className="rounded-full"
                />
                <span className="text-sm">Has evidence</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasEvidence"
                  checked={filters.hasEvidence === false}
                  onChange={() => updateFilters({ hasEvidence: false })}
                  className="rounded-full"
                />
                <span className="text-sm">No evidence</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasEvidence"
                  checked={filters.hasEvidence === null}
                  onChange={() => updateFilters({ hasEvidence: null })}
                  className="rounded-full"
                />
                <span className="text-sm">Any</span>
              </label>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-2">Reasoning</div>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasReasoning"
                  checked={filters.hasReasoning === true}
                  onChange={() => updateFilters({ hasReasoning: true })}
                  className="rounded-full"
                />
                <span className="text-sm">Has reasoning</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasReasoning"
                  checked={filters.hasReasoning === false}
                  onChange={() => updateFilters({ hasReasoning: false })}
                  className="rounded-full"
                />
                <span className="text-sm">No reasoning</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="hasReasoning"
                  checked={filters.hasReasoning === null}
                  onChange={() => updateFilters({ hasReasoning: null })}
                  className="rounded-full"
                />
                <span className="text-sm">Any</span>
              </label>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* Location Filter */}
      {facets.locations.length > 0 && (
        <FilterSection
          title="Location"
          icon={<MapPin className="h-4 w-4" />}
          isExpanded={expandedSections.has('location')}
          onToggle={() => toggleSection('location')}
          count={filters.location ? 1 : 0}
        >
          <div className="space-y-2">
            {facets.locations.map((location) => (
              <button
                key={location.region}
                onClick={() => {
                  if (filters.location?.center[0] === location.center[0] && 
                      filters.location?.center[1] === location.center[1]) {
                    updateFilters({ location: null });
                  } else {
                    updateFilters({
                      location: {
                        center: location.center,
                        radius: 50, // default 50km radius
                      }
                    });
                  }
                }}
                className={clsx(
                  "flex items-center justify-between w-full px-2 py-1 text-sm rounded",
                  "hover:bg-accent transition-colors",
                  location.selected && "bg-accent"
                )}
              >
                <span>{location.region}</span>
                <span className="text-xs text-muted-foreground">{location.count}</span>
              </button>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );
}