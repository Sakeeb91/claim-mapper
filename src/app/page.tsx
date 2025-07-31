'use client';

import { GraphVisualization } from '@/components/graph/GraphVisualization';
import { ClaimPanel } from '@/components/claims/ClaimPanel';
import { SearchPanel } from '@/components/search/SearchPanel';
import { useState } from 'react';

export default function HomePage() {
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-full">
      {/* Left Panel - Search and Claims */}
      <div className="w-80 border-r border-border bg-muted/50">
        <div className="flex h-full flex-col">
          <SearchPanel 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <ClaimPanel 
            selectedClaim={selectedClaim}
            onClaimSelect={setSelectedClaim}
          />
        </div>
      </div>

      {/* Main Content - Graph Visualization */}
      <div className="flex-1">
        <GraphVisualization 
          selectedClaim={selectedClaim}
          searchQuery={searchQuery}
          onNodeSelect={setSelectedClaim}
        />
      </div>
    </div>
  );
}