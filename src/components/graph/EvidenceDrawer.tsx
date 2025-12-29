'use client';

import React, { useEffect, useCallback } from 'react';
import { LinkedEvidence, EvidenceDrawerProps } from '@/types';

/**
 * Evidence Drawer Component
 *
 * Slide-out drawer displaying linked evidence for a selected premise.
 * Groups evidence by relationship type (supporting, refuting, neutral).
 */
export function EvidenceDrawer({
  isOpen,
  onClose,
  premiseText,
  stepNumber,
  evidence,
  isLoading = false,
}: EvidenceDrawerProps) {
  // Close on escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Group evidence by relationship
  const supporting = evidence.filter(
    (e) => e.relationship === 'supports' || e.relationship === 'partial_support'
  );
  const refuting = evidence.filter(
    (e) => e.relationship === 'refutes' || e.relationship === 'partial_refute'
  );
  const neutral = evidence.filter((e) => e.relationship === 'neutral');

  const getRelationshipLabel = (relationship: LinkedEvidence['relationship']) => {
    const labels: Record<LinkedEvidence['relationship'], string> = {
      supports: 'Supports',
      partial_support: 'Partially Supports',
      refutes: 'Refutes',
      partial_refute: 'Partially Refutes',
      neutral: 'Neutral',
    };
    return labels[relationship];
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 id="drawer-title" className="text-lg font-semibold text-gray-900">
              Linked Evidence
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Close drawer"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="mt-2">
            <span className="text-xs font-medium text-gray-500">
              Premise {stepNumber}
            </span>
            <p className="text-sm text-gray-600 mt-1 italic line-clamp-3">
              &ldquo;{premiseText}&rdquo;
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {/* Supporting Evidence */}
              {supporting.length > 0 && (
                <div className="p-4 border-b">
                  <h4 className="text-green-600 font-medium mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Supporting Evidence ({supporting.length})
                  </h4>
                  <div className="space-y-3">
                    {supporting.map((e) => (
                      <EvidenceCard key={e.evidenceId} evidence={e} />
                    ))}
                  </div>
                </div>
              )}

              {/* Refuting Evidence */}
              {refuting.length > 0 && (
                <div className="p-4 border-b">
                  <h4 className="text-red-600 font-medium mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Refuting Evidence ({refuting.length})
                  </h4>
                  <div className="space-y-3">
                    {refuting.map((e) => (
                      <EvidenceCard key={e.evidenceId} evidence={e} />
                    ))}
                  </div>
                </div>
              )}

              {/* Neutral Evidence */}
              {neutral.length > 0 && (
                <div className="p-4 border-b">
                  <h4 className="text-gray-600 font-medium mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Related Evidence ({neutral.length})
                  </h4>
                  <div className="space-y-3">
                    {neutral.map((e) => (
                      <EvidenceCard key={e.evidenceId} evidence={e} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {evidence.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>No linked evidence found for this premise.</p>
                  <p className="text-sm mt-2">
                    Add evidence to your project to enable automatic linking.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex-shrink-0">
          <div className="text-xs text-gray-500 flex justify-between">
            <span>{evidence.length} evidence items</span>
            <span>
              {supporting.length} supporting • {refuting.length} refuting
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Individual evidence card component
 */
function EvidenceCard({ evidence }: { evidence: LinkedEvidence }) {
  const getRelationshipBadge = (relationship: LinkedEvidence['relationship']) => {
    const colors: Record<LinkedEvidence['relationship'], string> = {
      supports: 'bg-green-100 text-green-700',
      partial_support: 'bg-green-50 text-green-600',
      refutes: 'bg-red-100 text-red-700',
      partial_refute: 'bg-red-50 text-red-600',
      neutral: 'bg-gray-100 text-gray-600',
    };
    return colors[relationship];
  };

  const labels: Record<LinkedEvidence['relationship'], string> = {
    supports: 'Supports',
    partial_support: 'Partial',
    refutes: 'Refutes',
    partial_refute: 'Partial',
    neutral: 'Neutral',
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-sm text-gray-700 leading-relaxed">
        {evidence.evidenceText}
      </p>
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded ${getRelationshipBadge(
              evidence.relationship
            )}`}
          >
            {labels[evidence.relationship]}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(evidence.confidence * 100)}% confidence
          </span>
        </div>
        {evidence.sourceUrl && (
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            Source
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

export default EvidenceDrawer;
