'use client';

import React from 'react';
import { PremiseCoverage, CoverageHeatmapProps } from '@/types';

/**
 * Coverage Heatmap Component
 *
 * Displays a visual overview of evidence coverage for reasoning chain premises.
 * Each premise is color-coded based on its support status:
 * - Green: Supported (more supporting than refuting evidence)
 * - Red: Contested (more refuting than supporting evidence)
 * - Yellow: Mixed (equal supporting and refuting)
 * - Gray: No evidence linked
 */
export function CoverageHeatmap({
  coverage,
  onPremiseClick,
  selectedStepNumber,
  className = '',
}: CoverageHeatmapProps) {
  const getStatusColor = (item: PremiseCoverage): string => {
    if (!item.hasEvidence) return 'bg-gray-400';
    if (item.netSupport > 0) return 'bg-green-500';
    if (item.netSupport < 0) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusLabel = (item: PremiseCoverage): string => {
    if (!item.hasEvidence) return 'No Evidence';
    if (item.netSupport > 0) return 'Supported';
    if (item.netSupport < 0) return 'Contested';
    return 'Mixed';
  };

  const getStatusBorderColor = (item: PremiseCoverage): string => {
    if (!item.hasEvidence) return 'border-gray-300';
    if (item.netSupport > 0) return 'border-green-300';
    if (item.netSupport < 0) return 'border-red-300';
    return 'border-yellow-300';
  };

  if (coverage.length === 0) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow-sm border ${className}`}>
        <h3 className="text-lg font-semibold mb-3 text-gray-900">
          Evidence Coverage
        </h3>
        <p className="text-gray-500 text-sm">
          No premises found in this reasoning chain.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-lg shadow-sm border ${className}`}>
      <h3 className="text-lg font-semibold mb-3 text-gray-900">
        Evidence Coverage
      </h3>

      <div className="space-y-2">
        {coverage.map((item) => (
          <div
            key={item.stepNumber}
            onClick={() => onPremiseClick(item.stepNumber)}
            className={`
              flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
              hover:bg-gray-50 border
              ${
                selectedStepNumber === item.stepNumber
                  ? `border-blue-500 bg-blue-50`
                  : `border-transparent hover:${getStatusBorderColor(item)}`
              }
            `}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onPremiseClick(item.stepNumber);
              }
            }}
            aria-label={`Premise ${item.stepNumber}: ${getStatusLabel(item)}`}
          >
            {/* Status indicator dot */}
            <div
              className={`w-4 h-4 rounded-full flex-shrink-0 ${getStatusColor(item)}`}
              title={getStatusLabel(item)}
            />

            {/* Premise text preview */}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-700 line-clamp-1">
                <span className="font-medium text-gray-500 mr-1">
                  P{item.stepNumber}:
                </span>
                {item.premiseText}
              </span>
            </div>

            {/* Evidence counts */}
            <div className="flex items-center gap-2 text-xs flex-shrink-0">
              {item.hasEvidence ? (
                <>
                  <span className="text-green-600 font-medium">
                    +{item.supportCount}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="text-red-600 font-medium">
                    -{item.refuteCount}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">No evidence</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Supported</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Contested</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Mixed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span>No Evidence</span>
        </div>
      </div>

      {/* Summary stats */}
      {coverage.length > 0 && (
        <div className="mt-3 pt-3 border-t text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Total premises: {coverage.length}</span>
            <span>
              With evidence: {coverage.filter((c) => c.hasEvidence).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoverageHeatmap;
