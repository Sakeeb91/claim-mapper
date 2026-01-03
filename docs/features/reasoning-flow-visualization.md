# Reasoning Chain Flow Visualization

This document describes the reasoning chain flow visualization feature that displays logical reasoning paths as connected flows in the knowledge graph.

## Overview

Reasoning chains represent the logical flow from premises through inferences to conclusions. The visualization system shows these chains as connected paths overlaid on the knowledge graph, with:

- **Custom node shapes** for different step types
- **Animated flow paths** showing logical progression
- **Hierarchical layout** positioning premises at top, conclusions at bottom
- **Interactive highlighting** for chain focus

## Components

### ReasoningPathOverlay

Renders reasoning chain paths as SVG overlays on the graph:

```tsx
import { ReasoningPathOverlay } from '@/components/graph';

<ReasoningPathOverlay
  svgRef={svgRef}
  reasoningLinks={reasoningLinks}
  highlightedChainId={selectedChainId}
  animate={true}
/>
```

### ReasoningNodeRenderer

Provides custom SVG shapes for reasoning nodes:

- **Circle** - Premises (foundation of argument)
- **Diamond** - Inferences (logical deductions)
- **Hexagon** - Conclusions (final assertions)
- **Square** - Assumptions (unverified statements)
- **Triangle** - Observations (empirical data)

### ReasoningChainFilter

UI component for controlling chain visibility:

```tsx
import { ReasoningChainFilter } from '@/components/graph';

<ReasoningChainFilter
  chains={reasoningChains}
  highlightedChainId={highlightedId}
  onHighlightChange={setHighlightedId}
  showReasoningOverlay={showOverlay}
  onToggleOverlay={toggleOverlay}
  useHierarchicalLayout={useHierarchical}
  onToggleLayout={toggleLayout}
/>
```

### ReasoningStepTooltip

Shows detailed information on node hover:

- Step type and number
- Confidence level with color coding
- Step text content
- Chain ID and level information

### ReasoningLegend

Visual reference for reasoning elements:

- Step type shapes and colors
- Connection type indicators
- Collapsible panel

## Data Transformation

Use `reasoningChainToGraph` to transform reasoning chain data:

```tsx
import { reasoningChainToGraph } from '@/lib/graph';

const graphData = reasoningChainToGraph(chain, claimId, {
  layout: 'hierarchical',
  includeEvidenceLinks: true,
  includeConclusionToClaimLink: true,
});
```

## Layout Options

### Hierarchical Layout

Positions reasoning nodes in a top-to-bottom hierarchy:

- Level 0 (top): Premises, assumptions, observations
- Level 1 (middle): Inferences
- Level 2 (bottom): Conclusions

```tsx
import { applyHierarchicalLayout } from '@/lib/graph';

applyHierarchicalLayout(nodes, links, {
  width: 800,
  height: 600,
  marginX: 50,
  marginY: 50,
  fixPositions: true,
});
```

### Force-Directed Layout

Standard D3 force layout with reasoning nodes integrated.

## State Management

Use the `useReasoningChainState` hook:

```tsx
import { useReasoningChainState } from '@/hooks';

const {
  state,
  setHighlightedChain,
  toggleOverlay,
  toggleLayout,
  handleNodeHover,
  handleNodeHoverEnd,
  reasoningLinks,
  reasoningNodes,
} = useReasoningChainState(chains, { claimId });
```

## Color Palette

| Step Type   | Primary Color | Background   |
|-------------|---------------|--------------|
| Premise     | #3B82F6 (Blue)   | #EFF6FF   |
| Inference   | #A855F7 (Purple) | #F3E8FF   |
| Conclusion  | #22C55E (Green)  | #DCFCE7   |
| Assumption  | #F59E0B (Amber)  | #FEF3C7   |
| Observation | #06B6D4 (Cyan)   | #CFFAFE   |

## Animation

Paths include CSS animations for visual flow:

- **Marching ants** effect on paths
- **Pulse** animation on highlighted paths
- **Glow** effect on evidence links
- **Fade** transitions for entry/exit

## Integration Example

```tsx
import {
  KnowledgeGraph,
  ReasoningPathOverlay,
  ReasoningChainFilter,
  ReasoningStepTooltip,
  ReasoningLegend,
} from '@/components/graph';
import { useReasoningChainState } from '@/hooks';

function GraphWithReasoning({ chains, claimId }) {
  const {
    state,
    setHighlightedChain,
    toggleOverlay,
    toggleLayout,
    handleNodeHover,
    handleNodeHoverEnd,
    reasoningLinks,
  } = useReasoningChainState(chains, { claimId });

  return (
    <div className="relative">
      <KnowledgeGraph {...graphProps}>
        {state.showOverlay && (
          <ReasoningPathOverlay
            svgRef={svgRef}
            reasoningLinks={reasoningLinks}
            highlightedChainId={state.highlightedChainId}
          />
        )}
      </KnowledgeGraph>

      <ReasoningChainFilter
        chains={chains}
        highlightedChainId={state.highlightedChainId}
        onHighlightChange={setHighlightedChain}
        showReasoningOverlay={state.showOverlay}
        onToggleOverlay={toggleOverlay}
        useHierarchicalLayout={state.useHierarchicalLayout}
        onToggleLayout={toggleLayout}
      />

      <ReasoningStepTooltip
        node={state.hoveredNode}
        position={state.hoverPosition}
        visible={state.showTooltip}
      />

      <ReasoningLegend />
    </div>
  );
}
```
