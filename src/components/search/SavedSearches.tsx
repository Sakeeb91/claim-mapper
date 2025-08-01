'use client';

import React, { useState } from 'react';
import {
  Save,
  Search,
  Star,
  Clock,
  Trash2,
  Edit3,
  Share2,
  Play,
  MoreHorizontal,
  Globe,
  Lock,
  Eye,
  Users,
  Calendar,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import { SavedSearchesProps, SavedSearch } from '@/types/search';

interface SavedSearchCardProps {
  search: SavedSearch;
  onSelect: (search: SavedSearch) => void;
  onDelete: (searchId: string) => void;
  onUpdate: (search: SavedSearch) => void;
  currentUserId: string;
}

function SavedSearchCard({ search, onSelect, onDelete, onUpdate, currentUserId }: SavedSearchCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(search.name);
  const [editDescription, setEditDescription] = useState(search.description || '');

  const isOwner = search.userId === currentUserId;

  const handleSave = () => {
    onUpdate({
      ...search,
      name: editName,
      description: editDescription,
      updatedAt: new Date(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(search.name);
    setEditDescription(search.description || '');
    setIsEditing(false);
  };

  const getFilterSummary = () => {
    const parts = [];
    
    if (search.query.filters.types.length > 0) {
      parts.push(`${search.query.filters.types.length} type${search.query.filters.types.length > 1 ? 's' : ''}`);
    }
    
    if (search.query.filters.tags.length > 0) {
      parts.push(`${search.query.filters.tags.length} tag${search.query.filters.tags.length > 1 ? 's' : ''}`);
    }
    
    if (search.query.filters.dateRange) {
      parts.push('date range');
    }
    
    if (search.query.filters.confidenceRange[0] > 0 || search.query.filters.confidenceRange[1] < 100) {
      parts.push('confidence filter');
    }
    
    return parts.length > 0 ? parts.join(', ') : 'no filters';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-background border border-border rounded-lg p-4 hover:border-primary transition-colors"
    >
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-input rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2"
            placeholder="Search name"
          />
          
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-input rounded-md focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
            placeholder="Description (optional)"
            rows={2}
          />
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-sm truncate">{search.name}</h3>
                <div className="flex items-center space-x-1">
                  {search.isPublic ? (
                    <Globe className="h-3 w-3 text-muted-foreground" aria-label="Public search" />
                  ) : (
                    <Lock className="h-3 w-3 text-muted-foreground" aria-label="Private search" />
                  )}
                  
                  {search.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {search.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {search.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{search.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {search.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {search.description}
                </p>
              )}
            </div>

            <div className="relative ml-2">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-10"
                  >
                    <div className="p-1">
                      <button
                        onClick={() => {
                          onSelect(search);
                          setShowMenu(false);
                        }}
                        className="flex items-center space-x-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                      >
                        <Play className="h-3 w-3" />
                        <span>Run Search</span>
                      </button>
                      
                      {isOwner && (
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="flex items-center space-x-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          // Handle share logic
                          setShowMenu(false);
                        }}
                        className="flex items-center space-x-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                      >
                        <Share2 className="h-3 w-3" />
                        <span>Share</span>
                      </button>
                      
                      {isOwner && (
                        <>
                          <div className="border-t border-border my-1" />
                          <button
                            onClick={() => {
                              onDelete(search.id);
                              setShowMenu(false);
                            }}
                            className="flex items-center space-x-2 w-full px-2 py-1.5 text-xs rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Search Query Preview */}
          <div className="bg-muted/50 rounded-md p-3 mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <Search className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">Query:</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono bg-background rounded px-2 py-1">
              "{search.query.text}"
            </p>
            
            {/* Filter Summary */}
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Filters:</span> {getFilterSummary()}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <div className="text-xs font-medium">Results</div>
              <div className="text-sm text-muted-foreground">
                {search.resultsCount?.toLocaleString() || '—'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs font-medium">Uses</div>
              <div className="text-sm text-muted-foreground">
                {search.useCount.toLocaleString()}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs font-medium">Last Used</div>
              <div className="text-sm text-muted-foreground">
                {formatDistanceToNow(search.lastUsed, { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>Created {format(search.createdAt, 'MMM d, yyyy')}</span>
            </div>
            
            <button
              onClick={() => onSelect(search)}
              className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-accent transition-colors"
            >
              <Play className="h-3 w-3" />
              <span>Run</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function SavedSearches({
  searches = [],
  onSearchSelect,
  onSearchDelete,
  onSearchUpdate,
  currentUserId,
  className
}: SavedSearchesProps) {
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'lastUsed' | 'useCount'>('lastUsed');
  const [filterBy, setFilterBy] = useState<'all' | 'mine' | 'public'>('all');

  const filteredAndSortedSearches = searches
    .filter(search => {
      switch (filterBy) {
        case 'mine':
          return search.userId === currentUserId;
        case 'public':
          return search.isPublic;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'lastUsed':
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        case 'useCount':
          return b.useCount - a.useCount;
        default:
          return 0;
      }
    });

  if (searches.length === 0) {
    return (
      <div className={clsx("text-center py-12", className)}>
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Save className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No saved searches</h3>
          <p className="text-muted-foreground">
            Save your frequently used searches to access them quickly later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium">
            {filteredAndSortedSearches.length} saved search{filteredAndSortedSearches.length !== 1 ? 'es' : ''}
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-1">
            <span className="text-xs text-muted-foreground">Show:</span>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="text-xs border border-input rounded px-2 py-1 bg-background"
            >
              <option value="all">All</option>
              <option value="mine">My Searches</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-input rounded px-2 py-1 bg-background"
          >
            <option value="lastUsed">Last Used</option>
            <option value="name">Name</option>
            <option value="created">Created</option>
            <option value="useCount">Usage</option>
          </select>
        </div>
      </div>

      {/* Searches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredAndSortedSearches.map((search) => (
            <SavedSearchCard
              key={search.id}
              search={search}
              onSelect={onSearchSelect}
              onDelete={onSearchDelete}
              onUpdate={onSearchUpdate}
              currentUserId={currentUserId}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredAndSortedSearches.length === 0 && searches.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No searches match the current filter.
          </p>
        </div>
      )}
    </div>
  );
}