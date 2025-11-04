# Issue Labels Mapping - Visual Overview

## Complete Issue Label Matrix

| # | Title | Priority | Area | Type | Component |
|---|-------|----------|------|------|-----------|
| 1 | Complete graph API endpoints | 🔴 Critical | Backend API | Feature | Graph |
| 2 | Complete evidence API endpoints | 🔴 Critical | Backend API | Feature | - |
| 3 | Complete reasoning API endpoints | 🔴 Critical | Backend API + ML | Feature | - |
| 4 | Implement missing store actions | 🟠 High | Frontend | Feature | Search + Graph |
| 5 | Complete collaboration API endpoints | 🟡 Medium | Backend API + WS | Feature | Collaboration |
| 6 | Implement email notifications | 🟠 High | Backend API | Feature | Auth |
| 7 | Replace console.log with logging | 🟡 Medium | Backend API | Refactor | - |
| 8 | Remove hardcoded JWT secret | 🟠 High | Backend API | Security | Auth |
| 9 | Add backend unit tests | 🟡 Medium | Backend API | Testing | - |
| 10 | Create missing UI components | 🟢 Low | Frontend | Feature | Collaboration |
| 11 | Implement graph export | 🟡 Medium | Frontend | Feature | Graph |
| 12 | Implementation Roadmap (META) | 🟠 High | Meta | Meta | - |

## Priority Distribution

```
🔴 CRITICAL (3 issues - 25%)
├── #1: Graph API endpoints
├── #2: Evidence API endpoints
└── #3: Reasoning API endpoints

🟠 HIGH (4 issues - 33%)
├── #4: Store actions
├── #6: Email notifications
├── #8: JWT secret security
└── #12: Roadmap (meta)

🟡 MEDIUM (4 issues - 33%)
├── #5: Collaboration API
├── #7: Structured logging
├── #9: Backend tests
└── #11: Graph export

🟢 LOW (1 issue - 8%)
└── #10: UI components
```

## Area Distribution

```
Backend API (8 issues - 67%)
├── #1, #2, #3, #5, #6, #7, #8, #9

Frontend (3 issues - 25%)
├── #4, #10, #11

ML Service (1 issue - 8%)
└── #3 (shared with Backend)

WebSocket (1 issue - 8%)
└── #5 (shared with Backend)
```

## Type Distribution

```
Feature (9 issues - 75%)
├── #1, #2, #3, #4, #5, #6, #10, #11

Testing (1 issue - 8%)
└── #9

Security (1 issue - 8%)
└── #8

Refactor (1 issue - 8%)
└── #7

Meta (1 issue - 8%)
└── #12
```

## Component Distribution

```
Graph (3 issues)
├── #1, #4, #11

Auth (2 issues)
├── #6, #8

Collaboration (2 issues)
├── #5, #10

Search (1 issue)
└── #4
```

## Implementation Phases (from Issue #12)

### Phase 1: CRITICAL (Week 1) 🚨
**Goal:** Make app functional

- [ ] #1 - Graph API (backend-api, graph) - BLOCKING
- [ ] #2 - Evidence API (backend-api) - BLOCKING
- [ ] #3 - Reasoning API (backend-api, ml-service) - BLOCKING
- [ ] #4 - Store Actions (frontend, search, graph) - HIGH PRIORITY

**Success:** User can create claims, visualize graph, add evidence, search

### Phase 2: HIGH PRIORITY (Week 2) 🔥
**Goal:** Production-ready with security

- [ ] #6 - Email Notifications (backend-api, auth) - HIGH
- [ ] #8 - JWT Security Fix (backend-api, security, auth) - HIGH
- [ ] #5 - Collaboration API (backend-api, websocket, collaboration) - MEDIUM

**Success:** Secure, complete user flows

### Phase 3: CODE QUALITY (Week 3) 🔧
**Goal:** Maintainability and reliability

- [ ] #9 - Backend Unit Tests (backend-api, testing) - MEDIUM
- [ ] #7 - Structured Logging (backend-api, refactor) - MEDIUM

**Success:** >60% test coverage, better debugging

### Phase 4: ENHANCEMENTS (Week 4) ✨
**Goal:** Polish and features

- [ ] #11 - Graph Export (frontend, graph) - MEDIUM
- [ ] #10 - UI Components (frontend, collaboration) - LOW

**Success:** Feature-complete with polished UX

## Label Color Scheme

### Priority Colors
- 🔴 `priority: critical` - #b60205 (Bright Red) - BLOCKING
- 🟠 `priority: high` - #d93f0b (Orange-Red) - Important
- 🟡 `priority: medium` - #fbca04 (Yellow) - Standard
- 🟢 `priority: low` - #0e8a16 (Green) - Nice-to-have

### Area Colors
- 🔵 `area: frontend` - #1d76db (Blue) - Next.js/React
- 🟣 `area: backend-api` - #5319e7 (Purple) - Express.js
- 🌿 `area: ml-service` - #c2e0c6 (Light Green) - Python/FastAPI
- 💧 `area: websocket` - #bfdadc (Light Blue) - Socket.io
- 🌸 `area: database` - #d4c5f9 (Light Purple) - MongoDB/Redis

### Type Colors
- ⭐ `type: feature` - #a2eeef (Cyan) - New features
- 🧪 `type: testing` - #c5def5 (Light Blue) - Tests
- 🔄 `type: refactor` - #fef2c0 (Light Yellow) - Code quality
- 🛡️ `type: security` - #ee0701 (Red) - Security issues
- 📋 `type: meta` - #ededed (Gray) - Planning/organization

### Component Colors
- 📊 `component: graph` - #0366d6 (Dark Blue) - D3.js graph
- 🔍 `component: search` - #5319e7 (Purple) - Search features
- 👥 `component: collaboration` - #f9d0c4 (Peach) - Real-time collab
- 🔐 `component: auth` - #d93f0b (Orange-Red) - Auth/security

## Quick Reference Commands

### View issues by priority
```bash
gh issue list --label "priority: critical"
gh issue list --label "priority: high"
```

### View issues by area
```bash
gh issue list --label "area: frontend"
gh issue list --label "area: backend-api"
```

### View issues by type
```bash
gh issue list --label "type: feature"
gh issue list --label "type: security"
```

### View specific components
```bash
gh issue list --label "component: graph"
gh issue list --label "component: auth"
```

### Combine filters
```bash
# Critical backend features
gh issue list --label "priority: critical" --label "area: backend-api"

# High priority security issues
gh issue list --label "priority: high" --label "type: security"
```

## Statistics

- **Total Issues:** 12
- **Open Issues:** 12 (100%)
- **Critical Path:** 3 issues (25%) - Must complete first
- **Security Issues:** 1 (8%) - High priority
- **Testing Gap:** 1 issue (backend needs tests)
- **Frontend vs Backend:** 3 frontend (25%) vs 8 backend (67%)

## Recommended Work Order

1. **Start:** #1 (Graph API) - Most blocking
2. **Then:** #2 (Evidence API) + #3 (Reasoning API) - Can parallelize
3. **Then:** #4 (Store Actions) - Integrates above APIs
4. **Quick Win:** #8 (JWT Security) - 30 minutes, critical security
5. **Then:** #6 (Email) + #5 (Collaboration)
6. **Parallel:** #9 (Tests) while doing #7 (Logging)
7. **Polish:** #11 (Export) + #10 (UI Components)
8. **Track:** #12 (Roadmap) - Update as you go

---

**Next Step:** Run `./label-issues.sh` to apply all labels!
