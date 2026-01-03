## Summary

Add comprehensive tests for backend Mongoose models including schema validation, virtual fields, middleware hooks, and instance methods. Currently these models have **0% direct test coverage** - they are only tested indirectly through route tests.

**Parent Issue:** #22

## Target Files

| Model | File | Test Coverage Target |
|-------|------|---------------------|
| Claim | `backend/api/src/models/Claim.ts` | 80%+ |
| Evidence | `backend/api/src/models/Evidence.ts` | 80%+ |
| Project | `backend/api/src/models/Project.ts` | 80%+ |
| ReasoningChain | `backend/api/src/models/ReasoningChain.ts` | 80%+ |
| Session | `backend/api/src/models/Session.ts` | 70%+ |
| User | `backend/api/src/models/User.ts` | 80%+ |

## Test Cases to Implement

### Claim.test.ts
```typescript
// Schema validation:
- validates required fields (text, type, confidence, project)
- validates text length constraints (10-2000 chars)
- validates confidence range (0-1)
- validates type enum values
- validates status enum values

// Virtual fields:
- computes evidenceCount correctly
- computes supportingEvidenceCount correctly

// Instance methods:
- test addEvidence()
- test removeEvidence()
```

### Evidence.test.ts
```typescript
// Schema validation:
- validates required fields
- validates source schema structure
- validates reliability factors (0-1 range)
- validates relevance scoring

// Instance methods:
- test verify() method
- test dispute() method
- test addAnnotation()

// Relationships:
- validates claimIds references
- tests relationship linking
```

### Project.test.ts
```typescript
// Schema validation:
- validates required fields (name, type, owner)
- validates visibility enum
- validates collaborator schema

// Instance methods:
- test hasPermission() for owner
- test hasPermission() for collaborators
- test addCollaborator()
- test removeCollaborator()

// Static methods:
- test findByUser()
- test findPublic()
- test searchProjects()
```

### ReasoningChain.test.ts
```typescript
// Schema validation:
- validates step structure
- validates type enum
- validates step numbering

// Instance methods:
- test addStep()
- test removeStep()
- test addReview()
- test validate()

// Pre-save middleware:
- verifies step renumbering
- verifies validity calculation
```

## Implementation Checklist

- [ ] Set up MongoDB Memory Server for isolated testing
- [ ] Create test utilities for generating mock data
- [ ] Write `Claim.test.ts` with 15+ test cases
- [ ] Write `Evidence.test.ts` with 15+ test cases
- [ ] Write `Project.test.ts` with 15+ test cases
- [ ] Write `ReasoningChain.test.ts` with 12+ test cases
- [ ] Write `Session.test.ts` with 10+ test cases
- [ ] Write `User.test.ts` with 10+ test cases
- [ ] Ensure all tests pass in CI

## Testing Strategy

- **MongoDB Memory Server**: Use for isolated, fast tests
- **Shared connection**: Reuse connection across test files for speed
- **Factory functions**: Create reusable test data generators
- **Validation testing**: Test both valid and invalid inputs
- **Method isolation**: Test instance methods independently

## Acceptance Criteria

- [ ] All new tests pass in CI
- [ ] Backend models coverage ≥ 80%
- [ ] Tests complete in < 45 seconds
- [ ] No flaky tests
