# Issue Labeling Guide for Claim Mapper

This document provides a comprehensive labeling strategy for all issues in the claim-mapper repository.

## Label Categories

### Priority Labels
- **priority: critical** - Blocking issues that prevent core functionality
- **priority: high** - Important issues that should be addressed soon
- **priority: medium** - Standard priority issues
- **priority: low** - Nice-to-have features or minor improvements

### Area Labels
- **area: frontend** - Frontend code (Next.js, React, D3.js)
- **area: backend-api** - Backend API (Express.js, MongoDB, Redis)
- **area: ml-service** - ML Service (Python, FastAPI, NLP)
- **area: websocket** - WebSocket/Real-time collaboration
- **area: database** - Database-related (MongoDB, Redis)

### Type Labels
- **type: feature** - New feature implementation
- **type: testing** - Testing-related issues
- **type: refactor** - Code refactoring
- **type: security** - Security-related issues
- **type: meta** - Meta/planning issues
- **bug** (existing) - Something isn't working
- **enhancement** (existing) - Improvements to existing features
- **documentation** (existing) - Documentation updates

### Component Labels
- **component: graph** - Graph visualization
- **component: search** - Search functionality
- **component: collaboration** - Collaboration features
- **component: auth** - Authentication/authorization

## Issue Label Mapping

### Issue #1: [CRITICAL] Complete graph API endpoints
**Labels:** `priority: critical`, `area: backend-api`, `type: feature`, `component: graph`

**Rationale:** This is a critical blocking issue for the graph visualization. It's a backend API feature that directly impacts the graph component.

### Issue #2: [CRITICAL] Complete evidence API endpoints
**Labels:** `priority: critical`, `area: backend-api`, `type: feature`

**Rationale:** Critical blocking issue for evidence management. Backend API feature.

### Issue #3: [CRITICAL] Complete reasoning API endpoints
**Labels:** `priority: critical`, `area: backend-api`, `area: ml-service`, `type: feature`

**Rationale:** Critical issue that bridges backend API with ML service for advanced reasoning features.

### Issue #4: [HIGH] Implement missing store actions
**Labels:** `priority: high`, `area: frontend`, `type: feature`, `component: search`, `component: graph`

**Rationale:** High priority frontend feature affecting both search and graph functionality.

### Issue #5: [MEDIUM] Complete collaboration API endpoints
**Labels:** `priority: medium`, `area: backend-api`, `area: websocket`, `type: feature`, `component: collaboration`

**Rationale:** Medium priority feature for collaboration, involves both backend API and WebSocket.

### Issue #6: [HIGH] Implement email notifications
**Labels:** `priority: high`, `area: backend-api`, `type: feature`, `component: auth`

**Rationale:** High priority backend feature for user notifications and authentication flows.

### Issue #7: [MEDIUM] Replace console.log with structured logging
**Labels:** `priority: medium`, `area: backend-api`, `type: refactor`, `enhancement`

**Rationale:** Medium priority code quality improvement. Refactoring task.

### Issue #8: [HIGH] Remove hardcoded JWT secret
**Labels:** `priority: high`, `area: backend-api`, `type: security`, `component: auth`

**Rationale:** High priority security issue. Must be fixed before production deployment.

### Issue #9: [MEDIUM] Add backend unit tests
**Labels:** `priority: medium`, `area: backend-api`, `type: testing`

**Rationale:** Medium priority testing issue to improve code quality and reliability.

### Issue #10: [LOW] Create missing UI components
**Labels:** `priority: low`, `area: frontend`, `type: feature`, `component: collaboration`

**Rationale:** Low priority frontend feature for completing UI component library.

### Issue #11: [MEDIUM] Implement graph export functionality
**Labels:** `priority: medium`, `area: frontend`, `type: feature`, `component: graph`

**Rationale:** Medium priority frontend feature for graph export capabilities.

### Issue #12: [META] Implementation Roadmap
**Labels:** `type: meta`, `priority: high`, `documentation`

**Rationale:** High priority meta issue that tracks overall project progress and planning.

## How to Apply Labels

### Option 1: Using the provided script (requires GitHub CLI)

```bash
chmod +x label-issues.sh
./label-issues.sh
```

### Option 2: Using curl script (requires GITHUB_TOKEN)

```bash
# 1. Create a GitHub personal access token at:
#    https://github.com/settings/tokens
#    Required permission: repo (full control)

# 2. Export the token
export GITHUB_TOKEN=your_token_here

# 3. Run the script
chmod +x label-issues-curl.sh
./label-issues-curl.sh
```

### Option 3: Manual application via GitHub web interface

1. Go to https://github.com/Sakeeb91/claim-mapper/issues
2. Click on each issue
3. On the right sidebar, click the gear icon next to "Labels"
4. Select the appropriate labels from the list

### Option 4: Using GitHub CLI manually

```bash
# Create labels (run once)
gh label create "priority: critical" --color "b60205" --description "Critical priority - blocking issue"
gh label create "priority: high" --color "d93f0b" --description "High priority"
gh label create "priority: medium" --color "fbca04" --description "Medium priority"
gh label create "priority: low" --color "0e8a16" --description "Low priority"
gh label create "area: frontend" --color "1d76db" --description "Frontend (Next.js, React, D3.js)"
gh label create "area: backend-api" --color "5319e7" --description "Backend API (Express.js)"
gh label create "area: ml-service" --color "c2e0c6" --description "ML Service (Python FastAPI)"
gh label create "area: websocket" --color "bfdadc" --description "WebSocket/Real-time collaboration"
gh label create "area: database" --color "d4c5f9" --description "Database (MongoDB, Redis)"
gh label create "type: feature" --color "a2eeef" --description "New feature implementation"
gh label create "type: testing" --color "c5def5" --description "Testing related"
gh label create "type: refactor" --color "fef2c0" --description "Code refactoring"
gh label create "type: security" --color "ee0701" --description "Security related"
gh label create "type: meta" --color "ededed" --description "Meta/planning issue"
gh label create "component: graph" --color "0366d6" --description "Graph visualization component"
gh label create "component: search" --color "5319e7" --description "Search functionality"
gh label create "component: collaboration" --color "f9d0c4" --description "Collaboration features"
gh label create "component: auth" --color "d93f0b" --description "Authentication/authorization"

# Apply labels to issues
gh issue edit 1 --add-label "priority: critical,area: backend-api,type: feature,component: graph"
gh issue edit 2 --add-label "priority: critical,area: backend-api,type: feature"
gh issue edit 3 --add-label "priority: critical,area: backend-api,area: ml-service,type: feature"
gh issue edit 4 --add-label "priority: high,area: frontend,type: feature,component: search,component: graph"
gh issue edit 5 --add-label "priority: medium,area: backend-api,area: websocket,type: feature,component: collaboration"
gh issue edit 6 --add-label "priority: high,area: backend-api,type: feature,component: auth"
gh issue edit 7 --add-label "priority: medium,area: backend-api,type: refactor,enhancement"
gh issue edit 8 --add-label "priority: high,area: backend-api,type: security,component: auth"
gh issue edit 9 --add-label "priority: medium,area: backend-api,type: testing"
gh issue edit 10 --add-label "priority: low,area: frontend,type: feature,component: collaboration"
gh issue edit 11 --add-label "priority: medium,area: frontend,type: feature,component: graph"
gh issue edit 12 --add-label "type: meta,priority: high,documentation"
```

## Label Statistics

**Total Issues:** 12
**Total Labels Created:** 17 new labels (plus 9 existing default labels)

### By Priority:
- Critical: 3 issues (#1, #2, #3)
- High: 4 issues (#4, #6, #8, #12)
- Medium: 4 issues (#5, #7, #9, #11)
- Low: 1 issue (#10)

### By Area:
- frontend: 3 issues (#4, #10, #11)
- backend-api: 8 issues (#1, #2, #3, #5, #6, #7, #8, #9)
- ml-service: 1 issue (#3)
- websocket: 1 issue (#5)

### By Type:
- feature: 9 issues (#1, #2, #3, #4, #5, #6, #10, #11)
- testing: 1 issue (#9)
- refactor: 1 issue (#7)
- security: 1 issue (#8)
- meta: 1 issue (#12)

### By Component:
- graph: 3 issues (#1, #4, #11)
- search: 1 issue (#4)
- collaboration: 2 issues (#5, #10)
- auth: 2 issues (#6, #8)

## Benefits of This Labeling Strategy

1. **Clear Prioritization**: Team can focus on critical issues first
2. **Area Separation**: Easy to filter by frontend, backend, ML service
3. **Type Clarity**: Distinguish features from bugs, refactors, and security issues
4. **Component Tracking**: Track work across major system components
5. **Milestone Planning**: Group issues by priority for sprint planning
6. **Contributor Guidance**: New contributors can find issues by area/complexity

## Maintenance

- Review labels monthly to ensure they're still relevant
- Add new labels as project evolves (e.g., `component: export`, `area: ci-cd`)
- Archive unused labels
- Keep label descriptions updated
- Use consistent naming conventions (e.g., `category: value`)

## References

- Project documentation: [CLAUDE.md](/CLAUDE.md)
- GitHub Issues: https://github.com/Sakeeb91/claim-mapper/issues
- GitHub Labels Documentation: https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels
