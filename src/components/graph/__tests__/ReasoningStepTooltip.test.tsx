/**
 * Tests for ReasoningStepTooltip component
 */

import { render, screen } from '@testing-library/react';
import { ReasoningStepTooltip } from '../ReasoningStepTooltip';
import { GraphNode } from '@/types';

// Mock reasoning node
const createMockNode = (overrides: Partial<GraphNode> = {}): GraphNode => ({
  id: 'node-1',
  type: 'reasoning',
  label: 'This is a test premise statement',
  size: 15,
  color: '#000',
  data: {} as any,
  subtype: 'premise',
  level: 0,
  stepNumber: 1,
  chainId: 'chain-123',
  confidence: 0.85,
  ...overrides,
});

describe('ReasoningStepTooltip', () => {
  const defaultPosition = { x: 100, y: 100 };

  it('should not render when not visible', () => {
    const { container } = render(
      <ReasoningStepTooltip
        node={createMockNode()}
        position={defaultPosition}
        visible={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when node is null', () => {
    const { container } = render(
      <ReasoningStepTooltip
        node={null}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when position is null', () => {
    const { container } = render(
      <ReasoningStepTooltip
        node={createMockNode()}
        position={null}
        visible={true}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render for non-reasoning nodes', () => {
    const { container } = render(
      <ReasoningStepTooltip
        node={createMockNode({ type: 'claim' })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render tooltip for reasoning node', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode()}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('Premise')).toBeInTheDocument();
  });

  it('should show step number badge', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ stepNumber: 3 })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show node label', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ label: 'Test label content' })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('Test label content')).toBeInTheDocument();
  });

  it('should show confidence percentage', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ confidence: 0.85 })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('(85%)')).toBeInTheDocument();
  });

  it('should show High confidence for high values', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ confidence: 0.9 })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should show Medium confidence for medium values', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ confidence: 0.65 })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should show Low confidence for low values', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ confidence: 0.45 })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('should show Very Low confidence for very low values', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ confidence: 0.2 })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('Very Low')).toBeInTheDocument();
  });

  it('should display different step types correctly', () => {
    const { rerender } = render(
      <ReasoningStepTooltip
        node={createMockNode({ subtype: 'inference' })}
        position={defaultPosition}
        visible={true}
      />
    );
    expect(screen.getByText('Inference')).toBeInTheDocument();

    rerender(
      <ReasoningStepTooltip
        node={createMockNode({ subtype: 'conclusion' })}
        position={defaultPosition}
        visible={true}
      />
    );
    expect(screen.getByText('Conclusion')).toBeInTheDocument();
  });

  it('should show chain ID in footer', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ chainId: 'chain-abc123' })}
        position={defaultPosition}
        visible={true}
      />
    );

    // Should show last 6 characters
    expect(screen.getByText(/c123/)).toBeInTheDocument();
  });

  it('should show level in footer', () => {
    render(
      <ReasoningStepTooltip
        node={createMockNode({ level: 2 })}
        position={defaultPosition}
        visible={true}
      />
    );

    expect(screen.getByText('Level 2')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ReasoningStepTooltip
        node={createMockNode()}
        position={defaultPosition}
        visible={true}
        className="custom-tooltip"
      />
    );

    expect(container.firstChild).toHaveClass('custom-tooltip');
  });
});
