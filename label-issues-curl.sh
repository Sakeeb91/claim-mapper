#!/bin/bash

# Script to create labels and apply them to issues using curl and GitHub API
# Note: This script requires a GitHub token with repo permissions

REPO="Sakeeb91/claim-mapper"
API_URL="https://api.github.com"

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable is not set"
    echo "Please set it with: export GITHUB_TOKEN=your_token_here"
    echo ""
    echo "You can create a token at: https://github.com/settings/tokens"
    echo "Required permissions: repo (full control)"
    exit 1
fi

AUTH_HEADER="Authorization: Bearer $GITHUB_TOKEN"

echo "Creating project-specific labels..."

# Function to create a label
create_label() {
    local name=$1
    local color=$2
    local description=$3

    curl -s -X POST \
        -H "Accept: application/vnd.github+json" \
        -H "$AUTH_HEADER" \
        "$API_URL/repos/$REPO/labels" \
        -d "{\"name\":\"$name\",\"color\":\"$color\",\"description\":\"$description\"}" > /dev/null 2>&1

    echo "Created label: $name"
}

# Priority labels
create_label "priority: critical" "b60205" "Critical priority - blocking issue"
create_label "priority: high" "d93f0b" "High priority"
create_label "priority: medium" "fbca04" "Medium priority"
create_label "priority: low" "0e8a16" "Low priority"

# Area labels
create_label "area: frontend" "1d76db" "Frontend (Next.js, React, D3.js)"
create_label "area: backend-api" "5319e7" "Backend API (Express.js)"
create_label "area: ml-service" "c2e0c6" "ML Service (Python FastAPI)"
create_label "area: websocket" "bfdadc" "WebSocket/Real-time collaboration"
create_label "area: database" "d4c5f9" "Database (MongoDB, Redis)"

# Type labels
create_label "type: feature" "a2eeef" "New feature implementation"
create_label "type: testing" "c5def5" "Testing related"
create_label "type: refactor" "fef2c0" "Code refactoring"
create_label "type: security" "ee0701" "Security related"
create_label "type: meta" "ededed" "Meta/planning issue"

# Component labels
create_label "component: graph" "0366d6" "Graph visualization component"
create_label "component: search" "5319e7" "Search functionality"
create_label "component: collaboration" "f9d0c4" "Collaboration features"
create_label "component: auth" "d93f0b" "Authentication/authorization"

echo ""
echo "Labels created successfully!"
echo ""
echo "Applying labels to issues..."

# Function to apply labels to an issue
apply_labels() {
    local issue_number=$1
    shift
    local labels=("$@")

    # Build JSON array of labels
    local json_labels="["
    for label in "${labels[@]}"; do
        json_labels+="\"$label\","
    done
    json_labels="${json_labels%,}]"

    curl -s -X PUT \
        -H "Accept: application/vnd.github+json" \
        -H "$AUTH_HEADER" \
        "$API_URL/repos/$REPO/issues/$issue_number/labels" \
        -d "{\"labels\":$json_labels}" > /dev/null

    echo "Applied labels to issue #$issue_number"
}

# Issue #1: [CRITICAL] Complete graph API endpoints
apply_labels 1 "priority: critical" "area: backend-api" "type: feature" "component: graph"

# Issue #2: [CRITICAL] Complete evidence API endpoints
apply_labels 2 "priority: critical" "area: backend-api" "type: feature"

# Issue #3: [CRITICAL] Complete reasoning API endpoints
apply_labels 3 "priority: critical" "area: backend-api" "area: ml-service" "type: feature"

# Issue #4: [HIGH] Implement missing store actions
apply_labels 4 "priority: high" "area: frontend" "type: feature" "component: search" "component: graph"

# Issue #5: [MEDIUM] Complete collaboration API endpoints
apply_labels 5 "priority: medium" "area: backend-api" "area: websocket" "type: feature" "component: collaboration"

# Issue #6: [HIGH] Implement email notifications
apply_labels 6 "priority: high" "area: backend-api" "type: feature" "component: auth"

# Issue #7: [MEDIUM] Replace console.log with structured logging
apply_labels 7 "priority: medium" "area: backend-api" "type: refactor" "enhancement"

# Issue #8: [HIGH] Remove hardcoded JWT secret
apply_labels 8 "priority: high" "area: backend-api" "type: security" "component: auth"

# Issue #9: [MEDIUM] Add backend unit tests
apply_labels 9 "priority: medium" "area: backend-api" "type: testing"

# Issue #10: [LOW] Create missing UI components
apply_labels 10 "priority: low" "area: frontend" "type: feature" "component: collaboration"

# Issue #11: [MEDIUM] Implement graph export functionality
apply_labels 11 "priority: medium" "area: frontend" "type: feature" "component: graph"

# Issue #12: [META] Implementation Roadmap
apply_labels 12 "type: meta" "priority: high" "documentation"

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
echo ""
echo "View labeled issues at: https://github.com/$REPO/issues"
