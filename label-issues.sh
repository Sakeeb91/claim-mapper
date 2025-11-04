#!/bin/bash

# Script to create labels and apply them to issues in the claim-mapper repository

REPO="Sakeeb91/claim-mapper"

echo "Creating project-specific labels..."

# Priority labels
gh label create "priority: critical" --color "b60205" --description "Critical priority - blocking issue" --repo $REPO --force 2>/dev/null || true
gh label create "priority: high" --color "d93f0b" --description "High priority" --repo $REPO --force 2>/dev/null || true
gh label create "priority: medium" --color "fbca04" --description "Medium priority" --repo $REPO --force 2>/dev/null || true
gh label create "priority: low" --color "0e8a16" --description "Low priority" --repo $REPO --force 2>/dev/null || true

# Area labels
gh label create "area: frontend" --color "1d76db" --description "Frontend (Next.js, React, D3.js)" --repo $REPO --force 2>/dev/null || true
gh label create "area: backend-api" --color "5319e7" --description "Backend API (Express.js)" --repo $REPO --force 2>/dev/null || true
gh label create "area: ml-service" --color "c2e0c6" --description "ML Service (Python FastAPI)" --repo $REPO --force 2>/dev/null || true
gh label create "area: websocket" --color "bfdadc" --description "WebSocket/Real-time collaboration" --repo $REPO --force 2>/dev/null || true
gh label create "area: database" --color "d4c5f9" --description "Database (MongoDB, Redis)" --repo $REPO --force 2>/dev/null || true

# Type labels
gh label create "type: feature" --color "a2eeef" --description "New feature implementation" --repo $REPO --force 2>/dev/null || true
gh label create "type: testing" --color "c5def5" --description "Testing related" --repo $REPO --force 2>/dev/null || true
gh label create "type: refactor" --color "fef2c0" --description "Code refactoring" --repo $REPO --force 2>/dev/null || true
gh label create "type: security" --color "ee0701" --description "Security related" --repo $REPO --force 2>/dev/null || true
gh label create "type: meta" --color "ededed" --description "Meta/planning issue" --repo $REPO --force 2>/dev/null || true

# Component labels
gh label create "component: graph" --color "0366d6" --description "Graph visualization component" --repo $REPO --force 2>/dev/null || true
gh label create "component: search" --color "5319e7" --description "Search functionality" --repo $REPO --force 2>/dev/null || true
gh label create "component: collaboration" --color "f9d0c4" --description "Collaboration features" --repo $REPO --force 2>/dev/null || true
gh label create "component: auth" --color "d93f0b" --description "Authentication/authorization" --repo $REPO --force 2>/dev/null || true

echo "Labels created successfully!"
echo ""
echo "Applying labels to issues..."

# Issue #1: [CRITICAL] Complete graph API endpoints
gh issue edit 1 --add-label "priority: critical,area: backend-api,type: feature,component: graph" --repo $REPO

# Issue #2: [CRITICAL] Complete evidence API endpoints
gh issue edit 2 --add-label "priority: critical,area: backend-api,type: feature" --repo $REPO

# Issue #3: [CRITICAL] Complete reasoning API endpoints
gh issue edit 3 --add-label "priority: critical,area: backend-api,area: ml-service,type: feature" --repo $REPO

# Issue #4: [HIGH] Implement missing store actions
gh issue edit 4 --add-label "priority: high,area: frontend,type: feature,component: search,component: graph" --repo $REPO

# Issue #5: [MEDIUM] Complete collaboration API endpoints
gh issue edit 5 --add-label "priority: medium,area: backend-api,area: websocket,type: feature,component: collaboration" --repo $REPO

# Issue #6: [HIGH] Implement email notifications
gh issue edit 6 --add-label "priority: high,area: backend-api,type: feature,component: auth" --repo $REPO

# Issue #7: [MEDIUM] Replace console.log with structured logging
gh issue edit 7 --add-label "priority: medium,area: backend-api,type: refactor,enhancement" --repo $REPO

# Issue #8: [HIGH] Remove hardcoded JWT secret
gh issue edit 8 --add-label "priority: high,area: backend-api,type: security,component: auth" --repo $REPO

# Issue #9: [MEDIUM] Add backend unit tests
gh issue edit 9 --add-label "priority: medium,area: backend-api,type: testing" --repo $REPO

# Issue #10: [LOW] Create missing UI components
gh issue edit 10 --add-label "priority: low,area: frontend,type: feature,component: collaboration" --repo $REPO

# Issue #11: [MEDIUM] Implement graph export functionality
gh issue edit 11 --add-label "priority: medium,area: frontend,type: feature,component: graph" --repo $REPO

# Issue #12: [META] Implementation Roadmap
gh issue edit 12 --add-label "type: meta,priority: high,documentation" --repo $REPO

echo ""
echo "All issues have been labeled successfully!"
echo ""
echo "Summary:"
echo "- Created 17 new labels (priority, area, type, component)"
echo "- Applied labels to 12 issues"
echo ""
echo "Label breakdown:"
echo "  Priority: critical (3), high (3), medium (4), low (1), meta (1)"
echo "  Area: frontend (3), backend-api (8), ml-service (1), websocket (1)"
echo "  Type: feature (9), testing (1), refactor (1), security (1), meta (1)"
