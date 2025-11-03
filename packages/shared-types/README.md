# @claim-mapper/shared-types

Shared TypeScript type definitions for the Claim Mapper application.

## Installation

This package is part of the Claim Mapper monorepo and is used internally by frontend and backend services.

```bash
npm install @claim-mapper/shared-types
```

## Usage

```typescript
import { Claim, Evidence, GraphNode, ApiResponse } from '@claim-mapper/shared-types';

// Use types in your code
const claim: Claim = {
  id: '123',
  text: 'Example claim',
  type: 'assertion',
  confidence: 0.9,
  // ...
};
```

## Available Types

### Claim Types
- `Claim` - Main claim interface
- `ClaimInput` - Input for creating claims
- `ClaimUpdate` - Input for updating claims
- `ClaimType` - Claim type enum
- `ClaimStatus` - Claim status enum

### Evidence Types
- `Evidence` - Main evidence interface
- `EvidenceInput` - Input for creating evidence
- `EvidenceUpdate` - Input for updating evidence
- `EvidenceType` - Evidence type enum
- `EvidenceStatus` - Evidence status enum

### Graph Types
- `GraphNode` - Graph node interface
- `GraphLink` - Graph link interface
- `GraphData` - Complete graph data
- `GraphLayout` - Graph layout configuration
- `GraphFilter` - Graph filtering options

### API Types
- `ApiResponse<T>` - Standard API response wrapper
- `PaginatedResponse<T>` - Paginated response wrapper
- `ApiError` - Error response format
- `SearchParams` - Search query parameters
- `SearchResult<T>` - Search result format

## Development

Build the package:
```bash
npm run build
```

Watch for changes:
```bash
npm run watch
```

Clean build artifacts:
```bash
npm run clean
```
