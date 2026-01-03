'use client';

/**
 * ReasoningStepTooltip Component
 *
 * Displays detailed information about a reasoning step when
 * hovering over a reasoning node in the graph.
 */

import { GraphNode, ReasoningNodeSubtype } from '@/types';
import {
  REASONING_STEP_COLORS,
  REASONING_STEP_BG_COLORS,
} from '@/constants/graph';
import { cn } from '@/utils';

export interface ReasoningStepTooltipProps {
  /** The node being hovered */
  node: GraphNode | null;
  /** Position of the tooltip */
  position: { x: number; y: number } | null;
  /** Whether the tooltip is visible */
  visible: boolean;
  /** Optional CSS class */
  className?: string;
}

/**
 * Maps step type to display label
 */
const STEP_TYPE_LABELS: Record<ReasoningNodeSubtype, string> = {
  premise: 'Premise',
  inference: 'Inference',
  conclusion: 'Conclusion',
  assumption: 'Assumption',
  observation: 'Observation',
};

/**
 * Gets confidence level label
 */
function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.8) return { label: 'High', color: 'text-green-600' };
  if (confidence >= 0.6) return { label: 'Medium', color: 'text-yellow-600' };
  if (confidence >= 0.4) return { label: 'Low', color: 'text-orange-600' };
  return { label: 'Very Low', color: 'text-red-600' };
}

export function ReasoningStepTooltip({
  node,
  position,
  visible,
  className,
}: ReasoningStepTooltipProps) {
  if (!visible || !node || !position || node.type !== 'reasoning') {
    return null;
  }

  const subtype = (node.subtype || 'inference') as ReasoningNodeSubtype;
  const stepLabel = STEP_TYPE_LABELS[subtype] || 'Step';
  const confidence = node.confidence ?? 0;
  const confidenceInfo = getConfidenceLabel(confidence);
  const stepNumber = node.stepNumber;

  const bgColor = REASONING_STEP_BG_COLORS[subtype] || REASONING_STEP_BG_COLORS.inference;
  const textColor = REASONING_STEP_COLORS[subtype] || REASONING_STEP_COLORS.inference;

  return (
    <div
      className={cn(
        'absolute z-50 pointer-events-none',
        'w-64 p-3 rounded-lg shadow-lg border',
        'transition-all duration-150 ease-out',
        'transform -translate-x-1/2 -translate-y-full -mt-2',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: bgColor,
        borderColor: textColor,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {stepNumber !== undefined && (
            <span
              className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: textColor }}
            >
              {stepNumber}
            </span>
          )}
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: textColor }}
          >
            {stepLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn('text-xs font-medium', confidenceInfo.color)}>
            {confidenceInfo.label}
          </span>
          <span className="text-xs text-gray-500">
            ({Math.round(confidence * 100)}%)
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-700 leading-relaxed">
        {node.label}
      </p>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center justify-between text-xs text-gray-500">
        <span>Chain: {node.chainId?.slice(-6) || 'Unknown'}</span>
        <span>Level {node.level ?? '?'}</span>
      </div>

      {/* Arrow pointer */}
      <div
        className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: `8px solid ${textColor}`,
        }}
      />
    </div>
  );
}

export default ReasoningStepTooltip;
