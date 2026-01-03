/**
 * Tests for ReasoningChainFilter component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ReasoningChainFilter } from '../ReasoningChainFilter';
import { ReasoningChain } from '@/types';

// Mock reasoning chains
const mockChains: ReasoningChain[] = [
  {
    id: 'chain-1',
    claimId: 'claim-1',
    type: 'deductive',
    steps: [
      { id: 's1', text: 'Premise 1', type: 'premise', order: 1, confidence: 0.9 },
      { id: 's2', text: 'Conclusion', type: 'conclusion', order: 2, confidence: 0.8 },
    ],
  } as ReasoningChain,
  {
    id: 'chain-2',
    claimId: 'claim-1',
    type: 'inductive',
    steps: [
      { id: 's3', text: 'Observation', type: 'observation', order: 1, confidence: 0.7 },
      { id: 's4', text: 'Inference', type: 'inference', order: 2, confidence: 0.6 },
      { id: 's5', text: 'Conclusion', type: 'conclusion', order: 3, confidence: 0.5 },
    ],
  } as ReasoningChain,
];

describe('ReasoningChainFilter', () => {
  const defaultProps = {
    chains: mockChains,
    highlightedChainId: null,
    onHighlightChange: jest.fn(),
    showReasoningOverlay: true,
    onToggleOverlay: jest.fn(),
    useHierarchicalLayout: true,
    onToggleLayout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component with chains', () => {
    render(<ReasoningChainFilter {...defaultProps} />);

    expect(screen.getByText('Reasoning Chains')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Chain count badge
  });

  it('should not render when no chains provided', () => {
    const { container } = render(
      <ReasoningChainFilter {...defaultProps} chains={[]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should toggle overlay when overlay button clicked', () => {
    render(<ReasoningChainFilter {...defaultProps} />);

    const overlayButton = screen.getByTitle(/overlay/i);
    fireEvent.click(overlayButton);

    expect(defaultProps.onToggleOverlay).toHaveBeenCalledTimes(1);
  });

  it('should toggle layout when layout button clicked', () => {
    render(<ReasoningChainFilter {...defaultProps} />);

    const layoutButton = screen.getByTitle(/layout/i);
    fireEvent.click(layoutButton);

    expect(defaultProps.onToggleLayout).toHaveBeenCalledTimes(1);
  });

  it('should expand and show chain list when header clicked', () => {
    render(<ReasoningChainFilter {...defaultProps} />);

    // Click header to expand
    const header = screen.getByText('Reasoning Chains');
    fireEvent.click(header);

    // Should show chain types
    expect(screen.getByText('Deductive')).toBeInTheDocument();
    expect(screen.getByText('Inductive')).toBeInTheDocument();
  });

  it('should call onHighlightChange when chain clicked', () => {
    render(<ReasoningChainFilter {...defaultProps} />);

    // Expand first
    const header = screen.getByText('Reasoning Chains');
    fireEvent.click(header);

    // Click first chain
    const deductiveChain = screen.getByText('Deductive');
    fireEvent.click(deductiveChain.closest('div[class*="cursor-pointer"]')!);

    expect(defaultProps.onHighlightChange).toHaveBeenCalledWith('chain-1');
  });

  it('should deselect chain when same chain clicked again', () => {
    render(
      <ReasoningChainFilter
        {...defaultProps}
        highlightedChainId="chain-1"
      />
    );

    // Expand first
    const header = screen.getByText('Reasoning Chains');
    fireEvent.click(header);

    // Click highlighted chain again
    const deductiveChain = screen.getByText('Deductive');
    fireEvent.click(deductiveChain.closest('div[class*="cursor-pointer"]')!);

    expect(defaultProps.onHighlightChange).toHaveBeenCalledWith(null);
  });

  it('should show clear selection button when chain is highlighted', () => {
    render(
      <ReasoningChainFilter
        {...defaultProps}
        highlightedChainId="chain-1"
      />
    );

    expect(screen.getByText('Clear selection')).toBeInTheDocument();
  });

  it('should clear selection when clear button clicked', () => {
    render(
      <ReasoningChainFilter
        {...defaultProps}
        highlightedChainId="chain-1"
      />
    );

    const clearButton = screen.getByText('Clear selection');
    fireEvent.click(clearButton);

    expect(defaultProps.onHighlightChange).toHaveBeenCalledWith(null);
  });

  it('should show step count for each chain', () => {
    render(<ReasoningChainFilter {...defaultProps} />);

    // Expand first
    const header = screen.getByText('Reasoning Chains');
    fireEvent.click(header);

    expect(screen.getByText('2 steps')).toBeInTheDocument();
    expect(screen.getByText('3 steps')).toBeInTheDocument();
  });
});
