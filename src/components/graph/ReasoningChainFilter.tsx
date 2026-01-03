'use client';

/**
 * ReasoningChainFilter Component
 *
 * Provides UI controls for filtering and highlighting reasoning chains
 * in the knowledge graph visualization.
 */

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Layers, Zap } from 'lucide-react';
import { ReasoningChain } from '@/types';
import {
  REASONING_STEP_COLORS,
  REASONING_STEP_BG_COLORS,
} from '@/constants/graph';
import { cn } from '@/utils';

export interface ReasoningChainFilterProps {
  /** Available reasoning chains to display */
  chains: ReasoningChain[];
  /** Currently highlighted chain ID */
  highlightedChainId: string | null;
  /** Callback when chain highlight changes */
  onHighlightChange: (chainId: string | null) => void;
  /** Whether reasoning overlay is visible */
  showReasoningOverlay: boolean;
  /** Callback to toggle reasoning overlay */
  onToggleOverlay: () => void;
  /** Whether to use hierarchical layout */
  useHierarchicalLayout: boolean;
  /** Callback to toggle hierarchical layout */
  onToggleLayout: () => void;
  /** Optional CSS class */
  className?: string;
}

/**
 * Maps reasoning type to display label and icon color
 */
const REASONING_TYPE_INFO: Record<string, { label: string; color: string }> = {
  deductive: { label: 'Deductive', color: REASONING_STEP_COLORS.conclusion },
  inductive: { label: 'Inductive', color: REASONING_STEP_COLORS.premise },
  abductive: { label: 'Abductive', color: REASONING_STEP_COLORS.inference },
  analogical: { label: 'Analogical', color: REASONING_STEP_COLORS.observation },
  causal: { label: 'Causal', color: REASONING_STEP_COLORS.assumption },
  statistical: { label: 'Statistical', color: '#6366F1' },
};

export function ReasoningChainFilter({
  chains,
  highlightedChainId,
  onHighlightChange,
  showReasoningOverlay,
  onToggleOverlay,
  useHierarchicalLayout,
  onToggleLayout,
  className,
}: ReasoningChainFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChainClick = useCallback((chainId: string) => {
    if (highlightedChainId === chainId) {
      onHighlightChange(null); // Deselect
    } else {
      onHighlightChange(chainId);
    }
  }, [highlightedChainId, onHighlightChange]);

  const getTypeInfo = (type: ReasoningChain['type']) => {
    return REASONING_TYPE_INFO[type] || { label: type, color: '#6B7280' };
  };

  if (chains.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden',
      className
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">
            Reasoning Chains
          </span>
          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
            {chains.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-3">
        {/* Overlay toggle */}
        <button
          onClick={onToggleOverlay}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors',
            showReasoningOverlay
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
          title={showReasoningOverlay ? 'Hide reasoning overlay' : 'Show reasoning overlay'}
        >
          {showReasoningOverlay ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
          Overlay
        </button>

        {/* Layout toggle */}
        <button
          onClick={onToggleLayout}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors',
            useHierarchicalLayout
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
          title={useHierarchicalLayout ? 'Switch to force layout' : 'Switch to hierarchical layout'}
        >
          <Layers className="w-3 h-3" />
          {useHierarchicalLayout ? 'Hierarchical' : 'Force'}
        </button>
      </div>

      {/* Chain list */}
      {isExpanded && (
        <div className="max-h-60 overflow-y-auto">
          {chains.map((chain) => {
            const typeInfo = getTypeInfo(chain.type);
            const isHighlighted = highlightedChainId === chain.id;

            return (
              <div
                key={chain.id}
                onClick={() => handleChainClick(chain.id)}
                className={cn(
                  'px-3 py-2 border-b border-gray-50 cursor-pointer transition-colors',
                  isHighlighted
                    ? 'bg-purple-50 border-l-2 border-l-purple-500'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Type indicator */}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: typeInfo.color }}
                    />
                    <span className={cn(
                      'text-xs font-medium',
                      isHighlighted ? 'text-purple-700' : 'text-gray-600'
                    )}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {chain.steps.length} steps
                  </span>
                </div>

                {/* Step preview */}
                <div className="mt-1 flex items-center gap-1">
                  {chain.steps.slice(0, 4).map((step, idx) => (
                    <div
                      key={`${chain.id}-${idx}`}
                      className="w-4 h-1 rounded-full"
                      style={{
                        backgroundColor: REASONING_STEP_BG_COLORS[step.type as keyof typeof REASONING_STEP_BG_COLORS] || '#E5E7EB',
                        border: `1px solid ${REASONING_STEP_COLORS[step.type as keyof typeof REASONING_STEP_COLORS] || '#9CA3AF'}`,
                      }}
                      title={`Step ${step.order}: ${step.type}`}
                    />
                  ))}
                  {chain.steps.length > 4 && (
                    <span className="text-xs text-gray-400">+{chain.steps.length - 4}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear selection button */}
      {highlightedChainId && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => onHighlightChange(null)}
            className="w-full text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}

export default ReasoningChainFilter;
