#!/usr/bin/env bash
#
# bootstrap.sh — create the GitHub repo and push it, in one run.
#
# Uses the GitHub CLI (gh), which authenticates through its own secure
# credential store. No personal access token is typed, pasted, or written into
# a git remote URL — so this sidesteps the "token embedded in remote" problem
# entirely. (If you have an old exposed token lying around, regenerate it at
# github.com/settings/tokens; you do not need it for this.)
#
set -euo pipefail

REPO_NAME="human-centric-ai-core"
VISIBILITY="public"   # change to "private" if you prefer
DESCRIPTION="An open-source foundation for autonomous AI systems that keep the human in the loop, by design."

cd "$(dirname "$0")"

# 1. Tooling checks
command -v git >/dev/null || { echo "git is not installed."; exit 1; }
if ! command -v gh >/dev/null; then
  echo "GitHub CLI (gh) is not installed."
  echo "On your MacBook M1, run:  brew install gh"
  exit 1
fi

# 2. Make sure gh is authenticated (interactive only the first time ever)
if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in to GitHub — launching a one-time login..."
  gh auth login
fi

OWNER="$(gh api user --jq .login)"

# 3. Initialize git locally, authored by YOUR configured git identity
if [ ! -d .git ]; then
  git init -q
  git branch -M main
fi
git add .
git commit -q -m "Initial commit: human-centric-ai-core" || echo "(nothing new to commit)"

# 4. Create the remote repo AND push, in one shot
if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "Repo $OWNER/$REPO_NAME already exists — pushing to it."
  git remote add origin "https://github.com/$OWNER/$REPO_NAME.git" 2>/dev/null || true
  git push -u origin main
else
  gh repo create "$REPO_NAME" \
    --"$VISIBILITY" \
    --source=. \
    --remote=origin \
    --description "$DESCRIPTION" \
    --push
fi

echo ""
echo "Done. Live at:  https://github.com/$OWNER/$REPO_NAME"
