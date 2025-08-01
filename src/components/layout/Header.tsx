'use client';

import { Search, Settings, User, ArrowRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import { useSearch } from '@/hooks/useSearch';
import { useSearchStore } from '@/store/searchStore';
import { SearchSuggestion } from '@/types/search';

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [showGlobalSuggestions, setShowGlobalSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const router = useRouter();
  const globalSearchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { suggestions } = useSearchStore();
  const { search } = useSearch();
  
  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowGlobalSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">Claim Mapper</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Global Search */}
        <div ref={containerRef} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={globalSearchRef}
            type="text"
            value={globalQuery}
            onChange={(e) => {
              setGlobalQuery(e.target.value);
              setShowGlobalSuggestions(e.target.value.length > 0);
              setSelectedSuggestionIndex(-1);
            }}
            onKeyDown={(e) => {
              switch (e.key) {
                case 'ArrowDown':
                  e.preventDefault();
                  setSelectedSuggestionIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                  );
                  break;
                case 'ArrowUp':
                  e.preventDefault();
                  setSelectedSuggestionIndex(prev => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                  );
                  break;
                case 'Enter':
                  e.preventDefault();
                  if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                    const suggestion = suggestions[selectedSuggestionIndex];
                    router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
                  } else if (globalQuery.trim()) {
                    router.push(`/search?q=${encodeURIComponent(globalQuery)}`);
                  }
                  setShowGlobalSuggestions(false);
                  globalSearchRef.current?.blur();
                  break;
                case 'Escape':
                  setShowGlobalSuggestions(false);
                  globalSearchRef.current?.blur();
                  break;
              }
            }}
            onFocus={() => setShowGlobalSuggestions(globalQuery.length > 0)}
            placeholder="Search claims, evidence..."
            className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          
          {/* Quick Search Button */}
          {globalQuery && (
            <button
              onClick={() => {
                if (globalQuery.trim()) {
                  router.push(`/search?q=${encodeURIComponent(globalQuery)}`);
                  setShowGlobalSuggestions(false);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded transition-colors"
              title="Search"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          )}

          {/* Global Search Suggestions */}
          <AnimatePresence>
            {showGlobalSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
              >
                <div className="p-2">
                  {suggestions.slice(0, 5).map((suggestion, index) => (
                    <div
                      key={suggestion.id}
                      onClick={() => {
                        router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
                        setShowGlobalSuggestions(false);
                        setGlobalQuery('');
                      }}
                      className={clsx(
                        "flex items-center space-x-2 px-2 py-2 rounded cursor-pointer transition-colors",
                        "hover:bg-accent",
                        selectedSuggestionIndex === index && "bg-accent"
                      )}
                    >
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{suggestion.displayText}</div>
                        {suggestion.metadata?.category && (
                          <div className="text-xs text-muted-foreground">
                            {suggestion.metadata.category}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Show all results link */}
                  <div className="border-t border-border mt-2 pt-2">
                    <div
                      onClick={() => {
                        router.push(`/search?q=${encodeURIComponent(globalQuery)}`);
                        setShowGlobalSuggestions(false);
                        setGlobalQuery('');
                      }}
                      className="flex items-center space-x-2 px-2 py-2 rounded cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <div className="text-sm">Search for "<span className="font-medium">{globalQuery}</span>"</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <NotificationCenter />

        {/* Settings */}
        <button className="rounded-md p-2 hover:bg-accent">
          <Settings className="h-4 w-4" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="rounded-md p-2 hover:bg-accent"
          >
            <User className="h-4 w-4" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-background p-2 shadow-lg">
              <div className="space-y-1">
                <button className="w-full rounded-sm p-2 text-left text-sm hover:bg-accent">
                  Profile
                </button>
                <button className="w-full rounded-sm p-2 text-left text-sm hover:bg-accent">
                  Settings
                </button>
                <hr className="my-1 border-border" />
                <button className="w-full rounded-sm p-2 text-left text-sm hover:bg-accent">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}