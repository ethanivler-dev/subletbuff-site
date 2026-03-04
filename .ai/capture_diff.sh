#!/usr/bin/env bash
set -euo pipefail

mkdir -p .ai

{
  echo "=== META ==="
  echo "Date: $(date)"
  echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
  echo
  echo "=== GIT STATUS ==="
  git status
  echo
  echo "=== STAGED DIFF ==="
  git diff --staged
  echo
  echo "=== UNSTAGED DIFF ==="
  git diff
} > .ai/diff_bundle.txt

echo "Saved diff bundle to .ai/diff_bundle.txt"


