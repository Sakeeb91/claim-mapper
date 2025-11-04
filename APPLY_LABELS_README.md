# Quick Start: Applying Labels to Issues

## What's Been Done

I've analyzed all 12 issues in your repository and created a comprehensive labeling strategy with:

- **17 new label categories** organized by priority, area, type, and component
- **Complete mapping** of labels to all 12 issues
- **Automated scripts** for easy application
- **Detailed documentation** in LABELING_GUIDE.md

## Label Summary

### Issues by Priority:
- **Critical (3)**: #1 (Graph API), #2 (Evidence API), #3 (Reasoning API)
- **High (4)**: #4 (Store actions), #6 (Email), #8 (JWT Security), #12 (Roadmap)
- **Medium (4)**: #5 (Collaboration), #7 (Logging), #9 (Tests), #11 (Export)
- **Low (1)**: #10 (UI Components)

### Issues by Area:
- **Frontend (3)**: #4, #10, #11
- **Backend API (8)**: #1, #2, #3, #5, #6, #7, #8, #9
- **ML Service (1)**: #3
- **WebSocket (1)**: #5

## How to Apply Labels (Choose One Method)

### Method 1: GitHub CLI (Fastest - Recommended)

```bash
# Make sure you're authenticated with gh
gh auth status

# If not authenticated, login first
gh auth login

# Run the script
chmod +x label-issues.sh
./label-issues.sh
```

This will:
1. Create all 17 new labels
2. Apply appropriate labels to all 12 issues
3. Complete in ~30 seconds

### Method 2: cURL with Personal Access Token

```bash
# 1. Create a token at: https://github.com/settings/tokens
#    Required scope: repo (full control)

# 2. Export the token
export GITHUB_TOKEN=ghp_your_token_here

# 3. Run the script
chmod +x label-issues-curl.sh
./label-issues-curl.sh
```

### Method 3: Manual via Web Interface

If you prefer manual control:

1. Go to: https://github.com/Sakeeb91/claim-mapper/labels
2. Create the labels listed in LABELING_GUIDE.md (see "Option 4" section)
3. Go to each issue and apply labels from the sidebar

## Verification

After applying labels, verify by running:

```bash
# View all labels
gh label list --repo Sakeeb91/claim-mapper

# View labels on a specific issue
gh issue view 1 --repo Sakeeb91/claim-mapper

# Or visit the issues page
open https://github.com/Sakeeb91/claim-mapper/issues
```

## What's Next

After labeling:

1. **Filter issues by priority**: Start with `priority: critical` issues
2. **Assign to milestones**: Group by sprint/release
3. **Track progress**: Use project boards filtered by labels
4. **Plan work**: Follow the roadmap in issue #12

## Files Created

- `LABELING_GUIDE.md` - Comprehensive documentation
- `label-issues.sh` - GitHub CLI automation script
- `label-issues-curl.sh` - cURL API automation script
- `APPLY_LABELS_README.md` - This quick start guide

## Support

If you encounter issues:

1. Check authentication: `gh auth status`
2. Verify repo access: `gh repo view Sakeeb91/claim-mapper`
3. Review the detailed guide: `cat LABELING_GUIDE.md`
4. Check GitHub API rate limits: `gh api rate_limit`

## Label Color Reference

- **Red** (#b60205): Critical priority, security
- **Orange** (#d93f0b): High priority, auth
- **Yellow** (#fbca04): Medium priority, refactoring
- **Green** (#0e8a16): Low priority
- **Blue** (#1d76db, #5319e7): Frontend, backend areas
- **Light Blue** (#c2e0c6, #bfdadc): ML service, WebSocket
- **Purple** (#d4c5f9): Database

---

**Ready to apply?** Run: `./label-issues.sh`
