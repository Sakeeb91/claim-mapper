/**
 * Tests for CoverageHeatmap Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoverageHeatmap } from '../CoverageHeatmap';
import { PremiseCoverage } from '@/types';

describe('CoverageHeatmap', () => {
  const mockOnPremiseClick = jest.fn();

  const mockCoverage: PremiseCoverage[] = [
    {
      stepNumber: 1,
      premiseText: 'The Earth is round',
      supportCount: 3,
      refuteCount: 0,
      neutralCount: 1,
      hasEvidence: true,
      netSupport: 3,
      totalEvidence: 4,
      averageConfidence: 0.85,
    },
    {
      stepNumber: 2,
      premiseText: 'Climate change is caused by human activity',
      supportCount: 2,
      refuteCount: 2,
      neutralCount: 0,
      hasEvidence: true,
      netSupport: 0,
      totalEvidence: 4,
      averageConfidence: 0.75,
    },
    {
      stepNumber: 3,
      premiseText: 'This premise has no evidence',
      supportCount: 0,
      refuteCount: 0,
      neutralCount: 0,
      hasEvidence: false,
      netSupport: 0,
      totalEvidence: 0,
      averageConfidence: 0,
    },
    {
      stepNumber: 4,
      premiseText: 'This premise is contested',
      supportCount: 1,
      refuteCount: 3,
      neutralCount: 0,
      hasEvidence: true,
      netSupport: -2,
      totalEvidence: 4,
      averageConfidence: 0.70,
    },
  ];

  beforeEach(() => {
    mockOnPremiseClick.mockClear();
  });

  it('renders all premises', () => {
    render(
      <CoverageHeatmap
        coverage={mockCoverage}
        onPremiseClick={mockOnPremiseClick}
      />
    );

    expect(screen.getByText(/The Earth is round/)).toBeInTheDocument();
    expect(screen.getByText(/Climate change/)).toBeInTheDocument();
    expect(screen.getByText(/This premise has no evidence/)).toBeInTheDocument();
    expect(screen.getByText(/This premise is contested/)).toBeInTheDocument();
  });

  it('shows empty state when no coverage data', () => {
    render(
      <CoverageHeatmap
        coverage={[]}
        onPremiseClick={mockOnPremiseClick}
      />
    );

    expect(screen.getByText(/No premises found/)).toBeInTheDocument();
  });

  it('calls onPremiseClick when premise is clicked', () => {
    render(
      <CoverageHeatmap
        coverage={mockCoverage}
        onPremiseClick={mockOnPremiseClick}
      />
    );

    const firstPremise = screen.getByText(/The Earth is round/).closest('[role="button"]');
    fireEvent.click(firstPremise!);

    expect(mockOnPremiseClick).toHaveBeenCalledWith(1);
  });

  it('calls onPremiseClick on keyboard Enter', () => {
    render(
      <CoverageHeatmap
        coverage={mockCoverage}
        onPremiseClick={mockOnPremiseClick}
      />
    );

    const firstPremise = screen.getByText(/The Earth is round/).closest('[role="button"]');
    fireEvent.keyDown(firstPremise!, { key: 'Enter' });

    expect(mockOnPremiseClick).toHaveBeenCalledWith(1);
  });

  it('highlights selected premise', () => {
    render(
      <CoverageHeatmap
        coverage={mockCoverage}
        onPremiseClick={mockOnPremiseClick}
        selectedStepNumber={1}
      />
    );

    const selectedPremise = screen.getByText(/The Earth is round/).closest('[role="button"]');
    expect(selectedPremise).toHaveClass('border-blue-500');
  });

  it('displays evidence counts for premises with evidence', () => {
    render(
      <CoverageHeatmap
        coverage={mockCoverage}
        onPremiseClick={mockOnPremiseClick}
      />
    );

    // Supported premise shows +3/-0
    expect(screen.getByText('+3')).toBeInTheDocument();

    // Contested premise shows +1/-3
    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('displays "No evidence" for premises without evidence', () => {
    render(
      <CoverageHeatmap
        coverage={mockCoverage}
        onPremiseClick={mockOnPremiseClick}
      />
    );

    const noEvidenceTexts = screen.getAllByText('No evidence');
    expect(noEvidenceTexts.length).toBeGreaterThan(0);
  });

  it('renders legend with all status types', () => {
    render(
      <CoverageHeatmap
        coverage={mockCoverage}
        onPremiseClick={mockOnPremiseClick}
      />
    );

    expect(screen.getByText('Supported')).toBeInTheDocument();
    expect(screen.getByText('Contested')).toBeInTheDocument();
    expect(screen.getByText('Mixed')).toBeInTheDocument();
    expect(screen.getByText('No Evidence')).toBeInTheDocument();
  });

  it('shows summary statistics', () => {
    render(
      <CoverageHeatmap
        coverage={mockCoverage}
        onPremiseClick={mockOnPremiseClick}
      />
    );

    expect(screen.getByText(/Total premises: 4/)).toBeInTheDocument();
    expect(screen.getByText(/With evidence: 3/)).toBeInTheDocument();
  });
});
