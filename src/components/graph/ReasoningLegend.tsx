'use client';

/**
 * ReasoningLegend Component
 *
 * Displays a legend explaining the visual encoding of reasoning
 * chain elements in the knowledge graph.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { ReasoningNodeSubtype } from '@/types';
import {
  REASONING_STEP_COLORS,
  REASONING_STEP_BG_COLORS,
  REASONING_STEP_BORDER_COLORS,
  REASONING_LINK_COLORS,
} from '@/constants/graph';
import { cn } from '@/utils';

export interface ReasoningLegendProps {
  /** Whether to show link legend */
  showLinks?: boolean;
  /** Whether to show node legend */
  showNodes?: boolean;
  /** Whether to start collapsed */
  defaultCollapsed?: boolean;
  /** Optional CSS class */
  className?: string;
}

/**
 * Step type information for legend display
 */
const STEP_TYPES: Array<{
  type: ReasoningNodeSubtype;
  label: string;
  description: string;
  shape: 'circle' | 'diamond' | 'hexagon' | 'square' | 'triangle';
}> = [
  {
    type: 'premise',
    label: 'Premise',
    description: 'Foundation statements that form the basis of the argument',
    shape: 'circle',
  },
  {
    type: 'inference',
    label: 'Inference',
    description: 'Logical deductions derived from premises',
    shape: 'diamond',
  },
  {
    type: 'conclusion',
    label: 'Conclusion',
    description: 'Final statements that follow from the reasoning',
    shape: 'hexagon',
  },
  {
    type: 'assumption',
    label: 'Assumption',
    description: 'Unverified statements accepted as true',
    shape: 'square',
  },
  {
    type: 'observation',
    label: 'Observation',
    description: 'Empirical data supporting the argument',
    shape: 'triangle',
  },
];

/**
 * Link type information for legend display
 */
const LINK_TYPES = [
  {
    type: 'supports',
    label: 'Supports',
    description: 'Evidence supports the premise',
    color: REASONING_LINK_COLORS.supports,
    dashed: false,
  },
  {
    type: 'requires',
    label: 'Requires',
    description: 'Logical flow between steps',
    color: REASONING_LINK_COLORS.requires,
    dashed: false,
  },
  {
    type: 'contradicts',
    label: 'Contradicts',
    description: 'Evidence contradicts the premise',
    color: REASONING_LINK_COLORS.contradicts,
    dashed: true,
  },
  {
    type: 'concludes',
    label: 'Concludes',
    description: 'Conclusion supports the claim',
    color: REASONING_LINK_COLORS.concludes,
    dashed: false,
  },
];

/**
 * Renders a mini shape for the legend
 */
function ShapeIcon({ shape, color }: { shape: string; color: string }) {
  const size = 16;

  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 1}
            fill={REASONING_STEP_BG_COLORS.premise}
            stroke={color}
            strokeWidth={2}
          />
        </svg>
      );
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${size / 2},1 ${size - 1},${size / 2} ${size / 2},${size - 1} 1,${size / 2}`}
            fill={REASONING_STEP_BG_COLORS.inference}
            stroke={color}
            strokeWidth={2}
          />
        </svg>
      );
    case 'hexagon':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${size / 4},1 ${(size * 3) / 4},1 ${size - 1},${size / 2} ${(size * 3) / 4},${size - 1} ${size / 4},${size - 1} 1,${size / 2}`}
            fill={REASONING_STEP_BG_COLORS.conclusion}
            stroke={color}
            strokeWidth={2}
          />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect
            x={1}
            y={1}
            width={size - 2}
            height={size - 2}
            fill={REASONING_STEP_BG_COLORS.assumption}
            stroke={color}
            strokeWidth={2}
          />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon
            points={`${size / 2},1 ${size - 1},${size - 1} 1,${size - 1}`}
            fill={REASONING_STEP_BG_COLORS.observation}
            stroke={color}
            strokeWidth={2}
          />
        </svg>
      );
    default:
      return null;
  }
}

export function ReasoningLegend({
  showLinks = true,
  showNodes = true,
  defaultCollapsed = true,
  className,
}: ReasoningLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={cn(
      'bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden',
      className
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Reasoning Legend
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-3 space-y-4">
          {/* Node types */}
          {showNodes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Step Types
              </h4>
              <div className="space-y-1.5">
                {STEP_TYPES.map((step) => (
                  <div
                    key={step.type}
                    className="flex items-start gap-2"
                  >
                    <ShapeIcon
                      shape={step.shape}
                      color={REASONING_STEP_COLORS[step.type]}
                    />
                    <div className="min-w-0">
                      <span
                        className="text-xs font-medium"
                        style={{ color: REASONING_STEP_COLORS[step.type] }}
                      >
                        {step.label}
                      </span>
                      <p className="text-xs text-gray-500 leading-tight">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link types */}
          {showLinks && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Connection Types
              </h4>
              <div className="space-y-1.5">
                {LINK_TYPES.map((link) => (
                  <div
                    key={link.type}
                    className="flex items-start gap-2"
                  >
                    <svg width={24} height={12} viewBox="0 0 24 12">
                      <line
                        x1={0}
                        y1={6}
                        x2={24}
                        y2={6}
                        stroke={link.color}
                        strokeWidth={2}
                        strokeDasharray={link.dashed ? '4,2' : 'none'}
                      />
                      <polygon
                        points="24,6 18,3 18,9"
                        fill={link.color}
                      />
                    </svg>
                    <div className="min-w-0">
                      <span
                        className="text-xs font-medium"
                        style={{ color: link.color }}
                      >
                        {link.label}
                      </span>
                      <p className="text-xs text-gray-500 leading-tight">
                        {link.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReasoningLegend;
