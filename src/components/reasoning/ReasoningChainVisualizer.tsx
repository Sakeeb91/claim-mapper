'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, Target, Lightbulb, ArrowDown } from 'lucide-react';
import { ReasoningChainVisualizerProps, ReasoningStep } from '@/types';
import { cn } from '@/utils';

const STEP_TYPE_ICONS = {
  premise: Brain,
  inference: Lightbulb,
  conclusion: Target
};

const STEP_TYPE_COLORS = {
  premise: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-600'
  },
  inference: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    icon: 'text-purple-600'
  },
  conclusion: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: 'text-green-600'
  }
};

export function ReasoningChainVisualizer({
  reasoning,
  onStepSelect,
  interactive = true,
  compact = false
}: ReasoningChainVisualizerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const sortedSteps = reasoning.steps.sort((a, b) => a.order - b.order);

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleStepClick = (step: ReasoningStep) => {
    if (interactive) {
      setSelectedStepId(step.id);
      onStepSelect?.(step.id);
    }
  };

  const renderStep = (step: ReasoningStep, index: number) => {
    const isExpanded = expandedSteps.has(step.id);
    const isSelected = selectedStepId === step.id;
    const colors = STEP_TYPE_COLORS[step.type];
    const IconComponent = STEP_TYPE_ICONS[step.type];

    return (
      <div key={step.id} className="relative">
        {/* Connection line to previous step */}
        {index > 0 && !compact && (
          <div className="absolute -top-4 left-8 w-0.5 h-4 bg-gray-300"></div>
        )}

        <div
          className={cn(
            "relative rounded-lg border transition-all duration-200",
            colors.bg,
            colors.border,
            isSelected && interactive ? "ring-2 ring-blue-500 ring-opacity-50" : "",
            interactive ? "cursor-pointer hover:shadow-md" : "",
            compact ? "p-3" : "p-4"
          )}
          onClick={() => handleStepClick(step)}
        >
          {/* Step header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Step number and icon */}
              <div className={cn(
                "flex items-center justify-center rounded-full",
                compact ? "w-6 h-6" : "w-8 h-8",
                colors.bg,
                "border-2",
                colors.border
              )}>
                <IconComponent className={cn(
                  colors.icon,
                  compact ? "w-3 h-3" : "w-4 h-4"
                )} />
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    colors.text
                  )}>
                    {step.type}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    step.confidence > 0.7 ? "bg-green-100 text-green-800" :
                    step.confidence > 0.4 ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  )}>
                    {Math.round(step.confidence * 100)}%
                  </span>
                </div>

                {/* Step text preview */}
                <p className={cn(
                  "text-gray-700 mt-1",
                  compact ? "text-sm" : "text-base",
                  !isExpanded && step.text.length > 100 ? "line-clamp-2" : ""
                )}>
                  {!isExpanded && step.text.length > 100
                    ? `${step.text.substring(0, 100)}...`
                    : step.text
                  }
                </p>
              </div>
            </div>

            {/* Expand/collapse button */}
            {step.text.length > 100 && !compact && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStepExpansion(step.id);
                }}
                className={cn(
                  "p-1 rounded hover:bg-white/50 transition-colors",
                  colors.text
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Confidence bar */}
          {!compact && (
            <div className="mt-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Confidence:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      step.confidence > 0.7 ? "bg-green-500" :
                      step.confidence > 0.4 ? "bg-yellow-500" : "bg-red-500"
                    )}
                    style={{ width: `${step.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 font-medium">
                  {Math.round(step.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Arrow to next step */}
        {index < sortedSteps.length - 1 && (
          <div className="flex justify-center py-2">
            <ArrowDown className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
    );
  };

  const getReasoningTypeInfo = () => {
    switch (reasoning.type) {
      case 'deductive':
        return {
          label: 'Deductive Reasoning',
          description: 'Logical progression from premises to conclusion',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'inductive':
        return {
          label: 'Inductive Reasoning',
          description: 'Generalization from specific observations',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        };
      case 'abductive':
        return {
          label: 'Abductive Reasoning',
          description: 'Best explanation for observed evidence',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      default:
        return {
          label: 'Reasoning Chain',
          description: 'Logical reasoning process',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const reasoningInfo = getReasoningTypeInfo();

  return (
    <div className={cn(
      "space-y-4",
      compact ? "max-w-md" : "max-w-2xl"
    )}>
      {/* Header */}
      {!compact && (
        <div className={cn(
          "p-4 rounded-lg border",
          reasoningInfo.bgColor,
          "border-gray-200"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={cn(
                "font-semibold",
                reasoningInfo.color,
                compact ? "text-base" : "text-lg"
              )}>
                {reasoningInfo.label}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {reasoningInfo.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {sortedSteps.length}
              </div>
              <div className="text-xs text-gray-500">
                {sortedSteps.length === 1 ? 'step' : 'steps'}
              </div>
            </div>
          </div>

          {/* Overall confidence */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Overall Confidence:</span>
              <span className="font-medium">
                {Math.round((sortedSteps.reduce((sum, step) => sum + step.confidence, 0) / sortedSteps.length) * 100)}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                style={{
                  width: `${(sortedSteps.reduce((sum, step) => sum + step.confidence, 0) / sortedSteps.length) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className={cn(
        "space-y-3",
        compact ? "space-y-2" : "space-y-4"
      )}>
        {sortedSteps.map((step, index) => renderStep(step, index))}
      </div>

      {/* Summary for compact view */}
      {compact && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className={reasoningInfo.color}>
              {reasoningInfo.label}
            </div>
            <div className="text-gray-600">
              Avg. confidence: {Math.round((sortedSteps.reduce((sum, step) => sum + step.confidence, 0) / sortedSteps.length) * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Interactive feedback */}
      {interactive && selectedStepId && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Step selected. You can now analyze or edit this reasoning step.
          </p>
        </div>
      )}
    </div>
  );
}