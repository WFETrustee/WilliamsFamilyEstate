#!/bin/bash

# File: gitpush.sh
# Purpose: Add, commit, pull, and push with safety and message memory

HISTORY_FILE="$HOME/.gitlastmsg"

# Load previous message or use default
if [ -f "$HISTORY_FILE" ]; then
  LAST_MSG=$(cat "$HISTORY_FILE")
else
  LAST_MSG="Update project files"
fi

# Prompt user
echo "Enter commit message (default: \"$LAST_MSG\"):"
read USER_MSG
if [ -z "$USER_MSG" ]; then
  USER_MSG="$LAST_MSG"
fi
echo "$USER_MSG" > "$HISTORY_FILE"  # Save for next time

# Stage all changes
echo "Running: git add ."
git add .

# Check for changes before committing
if git diff --cached --quiet; then
  echo "🟢 No changes to commit."
else
  echo "Running: git commit -m \"$USER_MSG\""
  git commit -m "$USER_MSG"
fi

# Pull and push regardless (in case changes exist remotely)
echo "Running: git pull"
git pull

# Only push if local branch is ahead
if git status | grep -q "Your branch is ahead"; then
  echo "Running: git push origin master"
  git push origin master
else
  echo "🟢 Nothing new to push."
fi
