/**
 * Tests for ReasoningLegend component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ReasoningLegend } from '../ReasoningLegend';

describe('ReasoningLegend', () => {
  it('should render the component', () => {
    render(<ReasoningLegend />);
    expect(screen.getByText('Reasoning Legend')).toBeInTheDocument();
  });

  it('should start collapsed by default', () => {
    render(<ReasoningLegend />);
    // Step types should not be visible when collapsed
    expect(screen.queryByText('Step Types')).not.toBeInTheDocument();
  });

  it('should expand when header clicked', () => {
    render(<ReasoningLegend defaultCollapsed={true} />);

    const header = screen.getByText('Reasoning Legend');
    fireEvent.click(header);

    expect(screen.getByText('Step Types')).toBeInTheDocument();
  });

  it('should show step types when expanded and showNodes is true', () => {
    render(<ReasoningLegend defaultCollapsed={false} showNodes={true} />);

    expect(screen.getByText('Premise')).toBeInTheDocument();
    expect(screen.getByText('Inference')).toBeInTheDocument();
    expect(screen.getByText('Conclusion')).toBeInTheDocument();
    expect(screen.getByText('Assumption')).toBeInTheDocument();
    expect(screen.getByText('Observation')).toBeInTheDocument();
  });

  it('should show connection types when expanded and showLinks is true', () => {
    render(<ReasoningLegend defaultCollapsed={false} showLinks={true} />);

    expect(screen.getByText('Connection Types')).toBeInTheDocument();
    expect(screen.getByText('Supports')).toBeInTheDocument();
    expect(screen.getByText('Requires')).toBeInTheDocument();
    expect(screen.getByText('Contradicts')).toBeInTheDocument();
    expect(screen.getByText('Concludes')).toBeInTheDocument();
  });

  it('should not show step types when showNodes is false', () => {
    render(<ReasoningLegend defaultCollapsed={false} showNodes={false} />);

    expect(screen.queryByText('Step Types')).not.toBeInTheDocument();
    expect(screen.queryByText('Premise')).not.toBeInTheDocument();
  });

  it('should not show connection types when showLinks is false', () => {
    render(<ReasoningLegend defaultCollapsed={false} showLinks={false} />);

    expect(screen.queryByText('Connection Types')).not.toBeInTheDocument();
    expect(screen.queryByText('Supports')).not.toBeInTheDocument();
  });

  it('should show descriptions for step types', () => {
    render(<ReasoningLegend defaultCollapsed={false} showNodes={true} />);

    expect(screen.getByText(/Foundation statements/)).toBeInTheDocument();
    expect(screen.getByText(/Logical deductions/)).toBeInTheDocument();
    expect(screen.getByText(/Final statements/)).toBeInTheDocument();
  });

  it('should show descriptions for connection types', () => {
    render(<ReasoningLegend defaultCollapsed={false} showLinks={true} />);

    expect(screen.getByText(/Evidence supports/)).toBeInTheDocument();
    expect(screen.getByText(/Logical flow/)).toBeInTheDocument();
    expect(screen.getByText(/Evidence contradicts/)).toBeInTheDocument();
  });

  it('should toggle between collapsed and expanded state', () => {
    render(<ReasoningLegend defaultCollapsed={true} />);

    // Initially collapsed
    expect(screen.queryByText('Step Types')).not.toBeInTheDocument();

    // Click to expand
    const header = screen.getByText('Reasoning Legend');
    fireEvent.click(header);
    expect(screen.getByText('Step Types')).toBeInTheDocument();

    // Click to collapse again
    fireEvent.click(header);
    expect(screen.queryByText('Step Types')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ReasoningLegend className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
