/**
 * Tests for EvidenceDrawer Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EvidenceDrawer } from '../EvidenceDrawer';
import { LinkedEvidence } from '@/types';

describe('EvidenceDrawer', () => {
  const mockOnClose = jest.fn();

  const mockEvidence: LinkedEvidence[] = [
    {
      evidenceId: '1',
      evidenceText: 'Supporting evidence text 1',
      relationship: 'supports',
      confidence: 0.9,
      sourceUrl: 'https://example.com/1',
    },
    {
      evidenceId: '2',
      evidenceText: 'Partially supporting evidence',
      relationship: 'partial_support',
      confidence: 0.7,
    },
    {
      evidenceId: '3',
      evidenceText: 'Refuting evidence text',
      relationship: 'refutes',
      confidence: 0.85,
      sourceUrl: 'https://example.com/3',
    },
    {
      evidenceId: '4',
      evidenceText: 'Neutral evidence text',
      relationship: 'neutral',
      confidence: 0.6,
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    premiseText: 'Test premise',
    stepNumber: 1,
    evidence: mockEvidence,
  };

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <EvidenceDrawer {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders drawer when isOpen is true', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    expect(screen.getByText('Linked Evidence')).toBeInTheDocument();
    expect(screen.getByText(/Test premise/)).toBeInTheDocument();
  });

  it('displays premise text and step number', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    expect(screen.getByText('Premise 1')).toBeInTheDocument();
    expect(screen.getByText(/Test premise/)).toBeInTheDocument();
  });

  it('groups evidence by relationship type', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    expect(screen.getByText(/Supporting Evidence \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Refuting Evidence \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Related Evidence \(1\)/)).toBeInTheDocument();
  });

  it('displays evidence text', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    expect(screen.getByText('Supporting evidence text 1')).toBeInTheDocument();
    expect(screen.getByText('Refuting evidence text')).toBeInTheDocument();
    expect(screen.getByText('Neutral evidence text')).toBeInTheDocument();
  });

  it('displays confidence percentages', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    expect(screen.getByText('90% confidence')).toBeInTheDocument();
    expect(screen.getByText('85% confidence')).toBeInTheDocument();
  });

  it('displays source links when available', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    const sourceLinks = screen.getAllByText('Source');
    expect(sourceLinks.length).toBe(2); // Only 2 evidence items have sourceUrl
  });

  it('calls onClose when close button is clicked', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close drawer');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    // Find backdrop by its class
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/20');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<EvidenceDrawer {...defaultProps} isLoading={true} />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows empty state when no evidence', () => {
    render(<EvidenceDrawer {...defaultProps} evidence={[]} />);

    expect(screen.getByText(/No linked evidence found/)).toBeInTheDocument();
  });

  it('displays footer with evidence counts', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    expect(screen.getByText(/4 evidence items/)).toBeInTheDocument();
    expect(screen.getByText(/2 supporting/)).toBeInTheDocument();
    expect(screen.getByText(/1 refuting/)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<EvidenceDrawer {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'drawer-title');
  });
});
