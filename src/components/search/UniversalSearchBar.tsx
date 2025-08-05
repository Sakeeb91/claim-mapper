'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Settings, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  X,
  ArrowRight,
  Command,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { UniversalSearchBarProps, SearchSuggestion } from '@/types/search';
import { useSearchStore } from '@/store/searchStore';
import { useSearch, useSearchHistory } from '@/hooks/useSearch';

export function UniversalSearchBar({
  query,
  onQueryChange,
  onSearch,
  suggestions = [],
  loading = false,
  placeholder = "Search claims, evidence, reasoning chains...",
  showFilters = true,
  showSemanticToggle = true,
  className
}: UniversalSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { semanticEnabled, toggleSemanticSearch } = useSearchStore();
  const { history } = useSearchHistory();

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onQueryChange(value);
    setSelectedSuggestionIndex(-1);
    setShowSuggestions(value.length > 0);
  }, [onQueryChange]);

  // Handle search submission
  const handleSearch = useCallback((searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      onSearch({
        text: finalQuery,
        filters: useSearchStore.getState().query.filters,
        sortBy: 'relevance',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
      });
      setShowSuggestions(false);
      setIsExpanded(false);
    }
  }, [query, onSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalSuggestions = suggestions.length + history.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < totalSuggestions - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : totalSuggestions - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const allSuggestions = [...suggestions, ...history.map(h => ({ text: h, type: 'recent' as const }))];
          const selectedSuggestion = allSuggestions[selectedSuggestionIndex];
          if (selectedSuggestion) {
            handleSearch(typeof selectedSuggestion === 'string' ? selectedSuggestion : selectedSuggestion.text);
          }
        } else {
          handleSearch();
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setIsExpanded(false);
        inputRef.current?.blur();
        break;
        
      case 'Tab':
        if (e.shiftKey) {
          setShowAdvancedSearch(!showAdvancedSearch);
          e.preventDefault();
        }
        break;
    }
  }, [suggestions, history, selectedSuggestionIndex, handleSearch, showAdvancedSearch]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion | string) => {
    const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
    onQueryChange(text);
    handleSearch(text);
  }, [onQueryChange, handleSearch]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionRefs.current[selectedSuggestionIndex]) {
      suggestionRefs.current[selectedSuggestionIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedSuggestionIndex]);

  const allSuggestions = [...suggestions, ...history.slice(0, 3).map(h => ({ 
    id: `history-${h}`,
    type: 'recent' as const, 
    text: h, 
    displayText: h,
    relevance: 0 
  }))];

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <div className={clsx(
        "relative flex items-center rounded-lg border transition-all duration-200",
        isExpanded ? "border-primary shadow-lg" : "border-input",
        "bg-background"
      )}>
        {/* Search Icon */}
        <div className="flex items-center pl-3">
          <Search className={clsx(
            "h-4 w-4 transition-colors",
            loading ? "animate-pulse text-primary" : "text-muted-foreground"
          )} />
        </div>

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsExpanded(true);
            setShowSuggestions(query.length > 0 || history.length > 0);
          }}
          placeholder={placeholder}
          className={clsx(
            "flex-1 border-none bg-transparent px-3 py-2.5 text-sm",
            "placeholder:text-muted-foreground focus:outline-none",
            isExpanded ? "pr-2" : "pr-3"
          )}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Controls */}
        {isExpanded && (
          <div className="flex items-center space-x-1 pr-3">
            {/* Clear Button */}
            {query && (
              <button
                onClick={() => {
                  onQueryChange('');
                  inputRef.current?.focus();
                }}
                className="rounded p-1 hover:bg-accent"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {/* Semantic Search Toggle */}
            {showSemanticToggle && (
              <button
                onClick={toggleSemanticSearch}
                className={clsx(
                  "rounded p-1 transition-colors",
                  semanticEnabled 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent"
                )}
                title={`Semantic search ${semanticEnabled ? 'enabled' : 'disabled'}`}
              >
                <Brain className="h-3 w-3" />
              </button>
            )}

            {/* Advanced Search Toggle */}
            {showFilters && (
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={clsx(
                  "rounded p-1 transition-colors",
                  showAdvancedSearch 
                    ? "bg-accent" 
                    : "hover:bg-accent"
                )}
                title="Advanced search options"
              >
                <Settings className="h-3 w-3" />
              </button>
            )}

            {/* Search Button */}
            <button
              onClick={() => handleSearch()}
              disabled={!query.trim()}
              className={clsx(
                "rounded p-1 transition-colors",
                query.trim() 
                  ? "text-primary hover:bg-accent" 
                  : "text-muted-foreground cursor-not-allowed"
              )}
              title="Search"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (isExpanded && (allSuggestions.length > 0 || query.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={clsx(
              "absolute top-full left-0 right-0 z-50 mt-1",
              "bg-background border border-border rounded-lg shadow-lg",
              "max-h-80 overflow-y-auto"
            )}
          >
            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    ref={(el) => {
                      if (suggestionRefs.current) {
                        suggestionRefs.current[index] = el;
                      }
                    }}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={clsx(
                      "flex items-center space-x-2 px-2 py-2 rounded cursor-pointer",
                      "hover:bg-accent transition-colors",
                      selectedSuggestionIndex === index && "bg-accent"
                    )}
                  >
                    <div className="flex-shrink-0">
                      {suggestion.type === 'recent' && <Clock className="h-3 w-3 text-muted-foreground" />}
                      {suggestion.type === 'popular' && <TrendingUp className="h-3 w-3 text-muted-foreground" />}
                      {suggestion.type === 'autocomplete' && <Search className="h-3 w-3 text-muted-foreground" />}
                      {suggestion.type === 'entity' && <Sparkles className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{suggestion.displayText}</div>
                      {suggestion.metadata?.category && (
                        <div className="text-xs text-muted-foreground">
                          {suggestion.metadata.category}
                          {suggestion.metadata.count && ` • ${suggestion.metadata.count} results`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {history.length > 0 && (
              <div className="border-t border-border p-2">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Recent
                </div>
                {history.slice(0, 3).map((item, index) => {
                  const suggestionIndex = suggestions.length + index;
                  return (
                    <div
                      key={`recent-${index}`}
                      ref={(el) => {
                        if (suggestionRefs.current) {
                          suggestionRefs.current[suggestionIndex] = el;
                        }
                      }}
                      onClick={() => handleSuggestionSelect(item)}
                      className={clsx(
                        "flex items-center space-x-2 px-2 py-2 rounded cursor-pointer",
                        "hover:bg-accent transition-colors",
                        selectedSuggestionIndex === suggestionIndex && "bg-accent"
                      )}
                    >
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <div className="text-sm truncate">{item}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Actions */}
            {query && (
              <div className="border-t border-border p-2">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Quick Actions
                </div>
                <div
                  onClick={() => handleSearch()}
                  className="flex items-center space-x-2 px-2 py-2 rounded cursor-pointer hover:bg-accent transition-colors"
                >
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <div className="text-sm">Search for "<span className="font-medium">{query}</span>"</div>
                </div>
                {semanticEnabled && (
                  <div
                    onClick={() => {
                      // Trigger semantic search
                      handleSearch();
                    }}
                    className="flex items-center space-x-2 px-2 py-2 rounded cursor-pointer hover:bg-accent transition-colors"
                  >
                    <Brain className="h-3 w-3 text-muted-foreground" />
                    <div className="text-sm">Semantic search for "<span className="font-medium">{query}</span>"</div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {allSuggestions.length === 0 && query.length > 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No suggestions found. Press Enter to search.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Search Panel */}
      <AnimatePresence>
        {showAdvancedSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={clsx(
              "absolute top-full left-0 right-0 z-40 mt-1",
              "bg-background border border-border rounded-lg shadow-lg p-4"
            )}
          >
            <div className="text-sm font-medium mb-3">Advanced Search Options</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Content Type
                </label>
                <div className="space-y-1">
                  {['claim', 'evidence', 'reasoning', 'project'].map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        // Handle checkbox logic here
                      />
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Confidence Range
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="w-full"
                  // Handle range input
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Hint */}
      {isExpanded && (
        <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
          <span className="inline-flex items-center space-x-1">
            <Command className="h-3 w-3" />
            <span>↑↓ navigate</span>
            <span className="mx-2">•</span>
            <span>↵ search</span>
            <span className="mx-2">•</span>
            <span>⇧⇥ filters</span>
          </span>
        </div>
      )}
    </div>
  );
}