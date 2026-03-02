#!/usr/bin/env bash
# Rename all calendar folders and files to strict kebab-case
set -euo pipefail

BASE="mocha/tests/calendar"

echo "=== Phase 1: Folder Renames ==="
mv "$BASE/lmtp/outlook/imap/outlook2007" "$BASE/lmtp/outlook/imap/outlook-2007" 2>/dev/null && echo "  outlook2007 → outlook-2007" || echo "  SKIP outlook2007"

echo ""
echo "=== Phase 2: Bug File Renames (add hyphen) ==="

# appointments/recurrence/
for f in "$BASE"/appointments/recurrence/bug[0-9]*.js; do
  if [ -f "$f" ]; then
    dir=$(dirname "$f")
    base=$(basename "$f")
    newbase=$(echo "$base" | sed 's/^bug\([0-9]\)/bug-\1/')
    if [ "$base" != "$newbase" ]; then
      mv "$f" "$dir/$newbase"
      echo "  appointments/recurrence/$base → $newbase"
    fi
  fi
done

# bugs/
for f in "$BASE"/bugs/bug[0-9]*.js; do
  if [ -f "$f" ]; then
    dir=$(dirname "$f")
    base=$(basename "$f")
    newbase=$(echo "$base" | sed 's/^bug\([0-9]\)/bug-\1/')
    if [ "$base" != "$newbase" ]; then
      mv "$f" "$dir/$newbase"
      echo "  bugs/$base → $newbase"
    fi
  fi
done

# privacy/
for f in "$BASE"/privacy/bug[0-9]*.js; do
  if [ -f "$f" ]; then
    dir=$(dirname "$f")
    base=$(basename "$f")
    newbase=$(echo "$base" | sed 's/^bug\([0-9]\)/bug-\1/')
    if [ "$base" != "$newbase" ]; then
      mv "$f" "$dir/$newbase"
      echo "  privacy/$base → $newbase"
    fi
  fi
done

# sharing/outlook-permissions/
for f in "$BASE"/sharing/outlook-permissions/bug[0-9]*.js; do
  if [ -f "$f" ]; then
    dir=$(dirname "$f")
    base=$(basename "$f")
    newbase=$(echo "$base" | sed 's/^bug\([0-9]\)/bug-\1/')
    if [ "$base" != "$newbase" ]; then
      mv "$f" "$dir/$newbase"
      echo "  sharing/outlook-permissions/$base → $newbase"
    fi
  fi
done

echo ""
echo "=== DONE ==="
echo "Total files after rename:"
find "$BASE" -type f -name "*.js" | wc -l
