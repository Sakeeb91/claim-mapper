'use client';

import { ClaimPanelProps, Claim } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Plus, Filter, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

export function ClaimPanel({ selectedClaim, onClaimSelect }: ClaimPanelProps) {
  const { claims, loading, addClaim } = useAppStore();
  const [isAddingClaim, setIsAddingClaim] = useState(false);
  const [newClaimText, setNewClaimText] = useState('');
  const [newClaimType, setNewClaimType] = useState<'hypothesis' | 'assertion' | 'question'>('assertion');

  const handleAddClaim = () => {
    if (newClaimText.trim()) {
      const newClaim: Claim = {
        id: `claim_${Date.now()}`,
        text: newClaimText,
        type: newClaimType,
        confidence: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        evidence: [],
        reasoning: []
      };
      addClaim(newClaim);
      setNewClaimText('');
      setIsAddingClaim(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">Claims</h2>
        <div className="flex items-center space-x-2">
          <button className="rounded-md p-1 hover:bg-accent">
            <Filter className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setIsAddingClaim(true)}
            className="rounded-md p-1 hover:bg-accent"
            title="Add new claim"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Add Claim Form */}
      {isAddingClaim && (
        <div className="border-b border-border bg-accent/50 p-4">
          <div className="space-y-3">
            <textarea
              value={newClaimText}
              onChange={(e) => setNewClaimText(e.target.value)}
              placeholder="Enter your claim..."
              className="w-full rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <select
                value={newClaimType}
                onChange={(e) => setNewClaimType(e.target.value as any)}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="assertion">Assertion</option>
                <option value="hypothesis">Hypothesis</option>
                <option value="question">Question</option>
              </select>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setIsAddingClaim(false);
                    setNewClaimText('');
                  }}
                  className="rounded-md px-3 py-1 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClaim}
                  disabled={!newClaimText.trim()}
                  className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claims List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-sm text-muted-foreground">Loading claims...</div>
          </div>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-2 text-sm text-muted-foreground">No claims found</div>
            <button 
              onClick={() => setIsAddingClaim(true)}
              className="flex items-center space-x-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Add Claim</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {claims.map((claim) => (
              <div
                key={claim.id}
                onClick={() => onClaimSelect(claim.id)}
                className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-accent ${
                  selectedClaim === claim.id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                    claim.type === 'hypothesis' ? 'bg-blue-100 text-blue-800' :
                    claim.type === 'assertion' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {claim.type}
                  </span>
                  <button className="rounded-md p-1 hover:bg-accent">
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </div>
                
                <p className="mb-2 text-sm line-clamp-3">{claim.text}</p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Confidence: {Math.round(claim.confidence * 100)}%</span>
                  <span>{claim.evidence.length} evidence</span>
                </div>
                
                {claim.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {claim.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {claim.tags.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{claim.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}