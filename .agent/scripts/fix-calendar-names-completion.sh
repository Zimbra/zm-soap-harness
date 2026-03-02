#!/usr/bin/env bash
# fix-calendar-names-completion.sh
# Completes the folder renames that failed in the Node.js script due to EPERM.
# Run from the repo root: bash .agent/scripts/fix-calendar-names-completion.sh

set -euo pipefail

BASE="mocha/tests/calendar"

echo "=== Completing Calendar folder renames ==="

# 1. Fix freebusy: Move free-busy subdirs back into freebusy, then rename freebusy properly
if [ -d "$BASE/free-busy" ]; then
  echo ""
  echo "--- Fixing freebusy (free-busy → freebusy merge) ---"
  # Move bugs/ and folders/ from free-busy back into freebusy
  if [ -d "$BASE/free-busy/bugs" ]; then
    echo "  Moving free-busy/bugs/ → freebusy/bugs/"
    mv "$BASE/free-busy/bugs/"* "$BASE/freebusy/bugs/" 2>/dev/null || true
    rmdir "$BASE/free-busy/bugs" 2>/dev/null || true
  fi
  if [ -d "$BASE/free-busy/folders" ]; then
    echo "  Moving free-busy/folders/ → freebusy/folders/"
    mv "$BASE/free-busy/folders/"* "$BASE/freebusy/folders/" 2>/dev/null || true
    rmdir "$BASE/free-busy/folders" 2>/dev/null || true
  fi
  rmdir "$BASE/free-busy" 2>/dev/null && echo "  Removed empty free-busy/" || true
fi

# 2. Fix meetingrequest: move remaining contents to meeting-request
if [ -d "$BASE/meetingrequest" ]; then
  echo ""
  echo "--- Fixing meetingrequest → meeting-request ---"

  # Move meetingrequest/replies/ contents to meeting-request/replies/
  if [ -d "$BASE/meetingrequest/replies" ]; then
    mkdir -p "$BASE/meeting-request/replies"
    echo "  Moving meetingrequest/replies/*.js → meeting-request/replies/"
    for f in "$BASE/meetingrequest/replies/"*.js; do
      [ -f "$f" ] && mv "$f" "$BASE/meeting-request/replies/" && echo "    Moved $(basename "$f")"
    done
    # Check if replies subdir is now empty
    rmdir "$BASE/meetingrequest/replies" 2>/dev/null && echo "  Removed empty meetingrequest/replies/" || true
  fi

  # Move meetingrequest/setappointmentrequest/ → meeting-request/set-appointment-request/
  if [ -d "$BASE/meetingrequest/setappointmentrequest" ]; then
    mkdir -p "$BASE/meeting-request/set-appointment-request"
    echo "  Moving meetingrequest/setappointmentrequest/*.js → meeting-request/set-appointment-request/"
    for f in "$BASE/meetingrequest/setappointmentrequest/"*.js; do
      [ -f "$f" ] && mv "$f" "$BASE/meeting-request/set-appointment-request/" && echo "    Moved $(basename "$f")"
    done
    rmdir "$BASE/meetingrequest/setappointmentrequest" 2>/dev/null && echo "  Removed empty meetingrequest/setappointmentrequest/" || true
  fi

  # Move any remaining root-level .js files from meetingrequest/
  for f in "$BASE/meetingrequest/"*.js; do
    [ -f "$f" ] && mv "$f" "$BASE/meeting-request/" && echo "  Moved $(basename "$f") to meeting-request/"
  done

  # Clean up meetingrequest if empty
  find "$BASE/meetingrequest" -type d -empty -delete 2>/dev/null || true
  [ ! -d "$BASE/meetingrequest" ] && echo "  Removed empty meetingrequest/" || echo "  WARNING: meetingrequest/ not empty"
fi

# 3. Rename sharing/outlookpermissions → sharing/outlook-permissions
if [ -d "$BASE/sharing/outlookpermissions" ]; then
  echo ""
  echo "--- Renaming sharing/outlookpermissions → sharing/outlook-permissions ---"
  mv "$BASE/sharing/outlookpermissions" "$BASE/sharing/outlook-permissions"
  echo "  Done"
fi

# 4. Verify final directory structure
echo ""
echo "=== Final directory structure ==="
find "$BASE" -type d | sort

echo ""
echo "=== Done ==="
