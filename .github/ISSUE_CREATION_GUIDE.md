# GitHub Issue Creation Guide

This guide ensures consistent, well-formatted GitHub issues with proper code block rendering.

---

## Quick Start

```bash
# 1. Write issue body to a file (use Claude's Write tool or editor)
# 2. Create issue using --body-file
gh issue create --title "[PRIORITY] Issue Title" --body-file .github/temp-issue-body.md
```

---

## Prompt Template

Use this prompt when asking Claude to create a GitHub issue:

```
Create a detailed GitHub issue for: [DESCRIBE THE TASK]

BEFORE WRITING:
1. Search the codebase for files related to [topic] using glob patterns
2. Search for relevant functions/classes/keywords using grep
3. Read the actual source files to understand current implementation
4. Note specific file paths and line numbers
```

---

## Issue Structure

### 1. SUMMARY
- 1-2 sentence problem statement
- Why this matters (user impact, technical debt, security, etc.)

### 2. SYSTEM CONTEXT
- ASCII directory tree showing affected areas
- How this component fits in the overall architecture
- Dependencies and relationships

### 3. CURRENT STATE (with code)
- Show actual code snippets from the codebase
- Include file path and line numbers: `path/to/file.ext:XX-YY`
- Explain what's happening and why it's problematic

### 4. PROPOSED SOLUTION
- High-level approach description
- Code snippets showing the fix/implementation
- Ready-to-use templates where applicable

### 5. IMPLEMENTATION CHECKLIST
- Broken into phases if complex
- Checkbox format for tracking
- Include testing and documentation steps

### 6. FILES TO MODIFY TABLE

| File | Lines | Action | Description |
|------|-------|--------|-------------|
| `path/to/file.ts` | 10-25 | Modify | Description of change |
| `path/to/new.ts` | NEW | Create | Description of new file |

### 7. RISK ASSESSMENT (if applicable)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Risk description | 🔴🟡🟢 | How to mitigate |

### 8. RELATED CONTEXT
- Links to related issues/PRs
- External documentation
- Design decisions and rationale

---

## Format Rules

- Use `📄 **File:** \`path\`` for code block headers
- Use tables for structured data (files, risks, comparisons)
- Use 🔴🟡🟢 for priority/severity indicators
- Use checkboxes `[ ]` for actionable items
- Include copy-paste ready scripts/commands
- Reference specific line numbers for navigation

---

## ⚠️ CRITICAL: Avoiding Code Block Formatting Issues

### The Problem

Using heredocs with `gh issue create --body` causes backticks to be escaped:

```bash
# ❌ DON'T DO THIS - breaks code blocks
gh issue create --title "Title" --body "$(cat <<'EOF'
```python
def example():
    pass
```
EOF
)"
```

This escapes backticks as `\`\`\`` which renders as plain text instead of code blocks.

### The Solution

**Always write to a file first, then use `--body-file`:**

```bash
# ✅ DO THIS - preserves formatting
gh issue create --title "Title" --body-file .github/temp-issue-body.md
```

---

## Complete Workflow

### Step 1: Write Issue Body to File

Use Claude's Write tool or your editor to create a markdown file:

```bash
# File: .github/temp-issue-body.md
```

Example content:

```markdown
## 🔥 Priority: HIGH | Type: Enhancement

### 1. SUMMARY

Description of the issue...

### 2. CURRENT STATE

📄 **File:** `src/example.ts:10-20`
```typescript
// Your code here
function example() {
  return true;
}
```

### 3. PROPOSED SOLUTION

📄 **File:** `src/example.ts` (ENHANCED)
```typescript
// Fixed code here
function example(): boolean {
  return true;
}
```
```

### Step 2: Create the Issue

```bash
cd /path/to/repo

# Create new issue
gh issue create \
  --title "[HIGH] Implement Feature X" \
  --body-file .github/temp-issue-body.md

# Or edit existing issue
gh issue edit 123 --body-file .github/temp-issue-body.md
```

### Step 3: Verify Formatting

```bash
# Open in browser to verify
gh issue view [ISSUE_NUMBER] --web

# Or check raw body
gh issue view [ISSUE_NUMBER] --json body
```

### Step 4: Clean Up (Optional)

```bash
# Remove temp file after creating issue
rm .github/temp-issue-body.md
```

---

## Code Block Examples

### Python

```python
async def example_function(param: str) -> dict:
    """Docstring here"""
    result = await some_async_call(param)
    return {"status": "success", "data": result}
```

### TypeScript

```typescript
interface ExampleInterface {
  id: string;
  name: string;
  options?: {
    enabled: boolean;
    threshold: number;
  };
}

export async function exampleFunction(input: ExampleInterface): Promise<void> {
  console.log(input.name);
}
```

### Directory Tree

```
📂 project-root/
├── 📂 src/
│   ├── 📂 components/
│   │   ├── Button.tsx
│   │   └── Modal.tsx
│   ├── 📂 services/
│   │   └── api.ts
│   └── index.ts
├── 📂 tests/
│   └── example.test.ts
└── package.json
```

### Bash/Shell

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Build project
npm run build
```

---

## Issue Templates Directory

Store reusable templates in `.github/issue-templates/`:

```
.github/
├── ISSUE_CREATION_GUIDE.md     ← This file
├── issue-templates/
│   ├── feature.md
│   ├── bug.md
│   ├── enhancement.md
│   └── refactor.md
└── temp-issue-body.md          ← Temporary file for issue creation
```

---

## Priority Labels

| Priority | Label | Use When |
|----------|-------|----------|
| 🔥 CRITICAL | `[CRITICAL]` | Blocking issues, security vulnerabilities |
| 🔴 HIGH | `[HIGH]` | Important features, significant bugs |
| 🟡 MEDIUM | `[MEDIUM]` | Standard enhancements, minor bugs |
| 🟢 LOW | `[LOW]` | Nice-to-haves, cosmetic issues |

---

## Checklist Before Submitting

- [ ] Issue body written to `.md` file (not heredoc)
- [ ] Code blocks use proper language identifiers
- [ ] File paths include line numbers where relevant
- [ ] Implementation checklist is actionable
- [ ] Risk assessment included for complex changes
- [ ] Related issues/PRs linked
- [ ] Priority level clearly indicated in title

---

## Troubleshooting

### Code Blocks Showing as Plain Text

**Symptom:** Code blocks display with visible backticks like `\`\`\`python`

**Cause:** Issue was created using heredoc which escaped backticks

**Fix:**
```bash
# Re-create the issue body file with proper formatting
# Then update the issue:
gh issue edit [ISSUE_NUMBER] --body-file .github/temp-issue-body.md
```

### Tables Not Rendering

**Symptom:** Tables show as plain text with pipe characters

**Cause:** Missing header separator row or inconsistent column counts

**Fix:** Ensure tables have:
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
```

### Checkboxes Not Working

**Symptom:** `[ ]` shows as text instead of interactive checkbox

**Cause:** Missing space after the hyphen or inside brackets

**Fix:** Use exactly `- [ ]` or `- [x]` with proper spacing
