'use client';

import React, { useState, useMemo } from 'react';
import { 
  Grid, 
  List, 
  Network, 
  ArrowUpDown, 
  Calendar, 
  TrendingUp, 
  Star,
  ExternalLink,
  Eye,
  MessageCircle,
  Share2,
  BookOpen,
  FileText,
  Lightbulb,
  Folder,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import { SearchResultsProps, SearchResult } from '@/types/search';
import { SearchUtils } from '@/services/searchApi';

interface SearchResultCardProps {
  result: SearchResult;
  query: string;
  viewMode: 'list' | 'grid' | 'graph';
  onResultClick: (result: SearchResult) => void;
  className?: string;
}

function SearchResultCard({ result, query, viewMode, onResultClick, className }: SearchResultCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'claim':
        return <FileText className="h-4 w-4" />;
      case 'evidence':
        return <BookOpen className="h-4 w-4" />;
      case 'reasoning':
        return <Lightbulb className="h-4 w-4" />;
      case 'project':
        return <Folder className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'claim':
        return 'text-blue-600 bg-blue-50';
      case 'evidence':
        return 'text-green-600 bg-green-50';
      case 'reasoning':
        return 'text-purple-600 bg-purple-50';
      case 'project':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-400';
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return null;
    if (confidence >= 80) return <CheckCircle2 className="h-3 w-3" />;
    if (confidence >= 60) return <AlertCircle className="h-3 w-3" />;
    return <XCircle className="h-3 w-3" />;
  };

  const highlightedTitle = useMemo(() => {
    return SearchUtils.highlightText(result.title, query);
  }, [result.title, query]);

  const highlightedSnippet = useMemo(() => {
    return SearchUtils.highlightText(result.snippet, query);
  }, [result.snippet, query]);

  if (viewMode === 'grid') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -2 }}
        className={clsx(
          "bg-background border border-border rounded-lg p-4 cursor-pointer",
          "hover:border-primary hover:shadow-md transition-all duration-200",
          className
        )}
        onClick={() => onResultClick(result)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className={clsx(
            "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
            getTypeColor(result.type)
          )}>
            {getTypeIcon(result.type)}
            <span className="capitalize">{result.type}</span>
          </div>
          
          {result.metadata.confidence && (
            <div className={clsx(
              "flex items-center space-x-1 text-xs",
              getConfidenceColor(result.metadata.confidence)
            )}>
              {getConfidenceIcon(result.metadata.confidence)}
              <span>{result.metadata.confidence}%</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 
          className="font-medium text-sm mb-2 line-clamp-2"
          dangerouslySetInnerHTML={{ __html: highlightedTitle }}
        />

        {/* Snippet */}
        <p 
          className="text-xs text-muted-foreground line-clamp-3 mb-3"
          dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
        />

        {/* Tags */}
        {result.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {result.metadata.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
              >
                {tag}
              </span>
            ))}
            {result.metadata.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                +{result.metadata.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            {result.metadata.author && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{result.metadata.author}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(result.metadata.createdAt, { addSuffix: true })}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>{Math.round(result.relevanceScore * 100)}%</span>
            </div>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-1"
              >
                <ExternalLink className="h-3 w-3" />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={clsx(
        "bg-background border border-border rounded-lg p-4 cursor-pointer",
        "hover:border-primary hover:shadow-sm transition-all duration-200",
        className
      )}
      onClick={() => onResultClick(result)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start space-x-4">
        {/* Type Badge */}
        <div className={clsx(
          "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
          getTypeColor(result.type)
        )}>
          {getTypeIcon(result.type)}
          <span className="capitalize">{result.type}</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <h3 
              className="font-medium text-sm flex-1 pr-4"
              dangerouslySetInnerHTML={{ __html: highlightedTitle }}
            />
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              {result.metadata.confidence && (
                <div className={clsx(
                  "flex items-center space-x-1 text-xs",
                  getConfidenceColor(result.metadata.confidence)
                )}>
                  {getConfidenceIcon(result.metadata.confidence)}
                  <span>{result.metadata.confidence}%</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>{Math.round(result.relevanceScore * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Snippet */}
          <p 
            className="text-sm text-muted-foreground line-clamp-2 mb-3"
            dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
          />

          {/* Highlights */}
          {result.highlights.length > 0 && (
            <div className="mb-3">
              {result.highlights.slice(0, 2).map((highlight, index) => (
                <div key={index} className="text-xs text-muted-foreground mb-1">
                  <span className="font-medium capitalize">{highlight.field}: </span>
                  <span dangerouslySetInnerHTML={{ 
                    __html: highlight.fragments.join(' ... ') 
                  }} />
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {result.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {result.metadata.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
                >
                  {tag}
                </span>
              ))}
              {result.metadata.tags.length > 5 && (
                <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                  +{result.metadata.tags.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              {result.metadata.author && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{result.metadata.author}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(result.metadata.createdAt, { addSuffix: true })}</span>
              </div>
              
              {result.metadata.source && (
                <div className="flex items-center space-x-1">
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate max-w-32">{result.metadata.source}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">{result.metadata.projectName}</span>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center space-x-1"
                >
                  <button className="p-1 hover:bg-accent rounded">
                    <Share2 className="h-3 w-3" />
                  </button>
                  <button className="p-1 hover:bg-accent rounded">
                    <Star className="h-3 w-3" />
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function SearchResults({
  results,
  query: searchQuery,
  totalCount,
  loading,
  onResultClick,
  onPageChange,
  onSortChange,
  viewMode,
  onViewModeChange,
  className
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState<string>(searchQuery.sortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchQuery.sortOrder);

  const handleSortChange = (newSortBy: string) => {
    const newOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(newSortBy);
    setSortOrder(newOrder);
    onSortChange(newSortBy, newOrder);
  };

  const sortedResults = useMemo(() => {
    return SearchUtils.sortResults(results, sortBy as any, sortOrder);
  }, [results, sortBy, sortOrder]);

  if (loading && results.length === 0) {
    return (
      <div className={clsx("space-y-4", className)}>
        {/* Loading Skeletons */}
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-background border border-border rounded-lg p-4">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-6 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-full" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                <div className="flex space-x-2">
                  <div className="h-5 bg-muted rounded animate-pulse w-16" />
                  <div className="h-5 bg-muted rounded animate-pulse w-20" />
                  <div className="h-5 bg-muted rounded animate-pulse w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && results.length === 0) {
    return (
      <div className={clsx("text-center py-12", className)}>
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground mb-4">
            We couldn't find any results for "{searchQuery.text}". Try adjusting your search terms or filters.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Suggestions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your spelling</li>
              <li>Try more general keywords</li>
              <li>Remove some filters</li>
              <li>Use semantic search for related concepts</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {totalCount.toLocaleString()} results
            {searchQuery.text && (
              <span> for "<span className="font-medium">{searchQuery.text}</span>"</span>
            )}
          </div>
          
          {loading && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>Searching...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort Options */}
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <button
              onClick={() => handleSortChange('relevance')}
              className={clsx(
                "flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors",
                sortBy === 'relevance' 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              )}
            >
              <TrendingUp className="h-3 w-3" />
              <span>Relevance</span>
              {sortBy === 'relevance' && (
                <ArrowUpDown className={clsx(
                  "h-3 w-3 transition-transform",
                  sortOrder === 'asc' && "rotate-180"
                )} />
              )}
            </button>
            
            <button
              onClick={() => handleSortChange('date')}
              className={clsx(
                "flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors",
                sortBy === 'date' 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>Date</span>
              {sortBy === 'date' && (
                <ArrowUpDown className={clsx(
                  "h-3 w-3 transition-transform",
                  sortOrder === 'asc' && "rotate-180"
                )} />
              )}
            </button>
            
            <button
              onClick={() => handleSortChange('confidence')}
              className={clsx(
                "flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors",
                sortBy === 'confidence' 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Confidence</span>
              {sortBy === 'confidence' && (
                <ArrowUpDown className={clsx(
                  "h-3 w-3 transition-transform",
                  sortOrder === 'asc' && "rotate-180"
                )} />
              )}
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-md">
            <button
              onClick={() => onViewModeChange('list')}
              className={clsx(
                "p-1.5 transition-colors",
                viewMode === 'list' ? "bg-accent" : "hover:bg-accent"
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={clsx(
                "p-1.5 transition-colors",
                viewMode === 'grid' ? "bg-accent" : "hover:bg-accent"
              )}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('graph')}
              className={clsx(
                "p-1.5 transition-colors",
                viewMode === 'graph' ? "bg-accent" : "hover:bg-accent"
              )}
              title="Graph view"
            >
              <Network className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="popLayout">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedResults.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                query={searchQuery.text}
                viewMode={viewMode}
                onResultClick={onResultClick}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedResults.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                query={searchQuery.text}
                viewMode={viewMode}
                onResultClick={onResultClick}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Load More / Pagination */}
      {searchQuery.page < Math.ceil(totalCount / searchQuery.limit) && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => onPageChange(searchQuery.page + 1)}
            disabled={loading}
            className={clsx(
              "px-6 py-2 text-sm font-medium rounded-md border transition-colors",
              "hover:bg-accent hover:border-accent-foreground",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Loading...' : 'Load More Results'}
          </button>
        </div>
      )}
    </div>
  );
}