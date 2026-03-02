#!/usr/bin/env bash
# check-file-parity.sh — Check 1:1 file parity between XML and JS test files
#
# Usage:
#   bash .agent/scripts/check-file-parity.sh <FolderName>
#
# Example:
#   bash .agent/scripts/check-file-parity.sh Calendar
#   bash .agent/scripts/check-file-parity.sh Mail
#   bash .agent/scripts/check-file-parity.sh Prefs
#
# This script checks whether each XML test file in data/soapvalidator/<Folder>
# has a corresponding JS file in mocha/tests/<folder_lowercase>/.
# JS filenames use kebab-case (CamelCase → hyphen-separated lowercase).

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <FolderName>"
  echo "Example: $0 Calendar"
  exit 1
fi

FOLDER="$1"
FOLDER_LOWER=$(echo "$FOLDER" | tr '[:upper:]' '[:lower:]')

XML_DIR="data/soapvalidator/$FOLDER"
JS_DIR="mocha/tests/$FOLDER_LOWER"

if [ ! -d "$XML_DIR" ]; then
  echo "ERROR: XML directory '$XML_DIR' not found."
  exit 1
fi

# Convert CamelCase to kebab-case, with compound word fixes
to_kebab() {
  echo "$1" | sed -E '
    s/([a-z0-9])([A-Z])/\1-\2/g
    s/([A-Z]+)([A-Z][a-z])/\1-\2/g
  ' | tr '[:upper:]' '[:lower:]' | sed -E '
    s/mini-cal/minical/g
    s/appointmentexception/appointment-exception/g
    s/getfreebusy/get-freebusy/g
    s/itemaction/item-action/g
    s/multinodecal/multi-node-cal/g
    s/nonaccounts/nonaccounts/g
    s/freebusy([0-9])/freebusy-\1/g
  '
}

# Use temp file for summary counts
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

find "$XML_DIR" -name "*.xml" | sort | while read -r xmlf; do
  rel=$(echo "$xmlf" | sed "s|$XML_DIR/||")
  dir=$(dirname "$rel")
  base=$(basename "$rel" .xml)

  # Convert to kebab-case
  jsbase=$(to_kebab "$base")
  jsdir=$(to_kebab "$dir")
  jsfile="$JS_DIR/$jsdir/$jsbase.js"

  xmltests=$(grep -c 'type="smoke"\|type="sanity"\|type="functional"\|type="regression"' "$xmlf" 2>/dev/null || true)

  if [ -f "$jsfile" ]; then
    jstests=$(grep -c '^\s*it(' "$jsfile" 2>/dev/null || true)
    echo "OK   $rel ($xmltests xml) → $jsdir/$jsbase.js ($jstests js)"
    echo "OK" >> "$TMPFILE"
  else
    if [ "$xmltests" -eq 0 ]; then
      echo "SKIP $rel (0 xml tests)"
      echo "SKIP" >> "$TMPFILE"
    else
      echo "MISS $rel ($xmltests xml) → $jsdir/$jsbase.js NOT FOUND"
      echo "MISS" >> "$TMPFILE"
    fi
  fi
done

echo ""
echo "=== Summary ==="
OK_COUNT=$(grep -c "^OK" "$TMPFILE" 2>/dev/null || true)
MISS_COUNT=$(grep -c "^MISS" "$TMPFILE" 2>/dev/null || true)
SKIP_COUNT=$(grep -c "^SKIP" "$TMPFILE" 2>/dev/null || true)
TOTAL=$((OK_COUNT + MISS_COUNT + SKIP_COUNT))

echo "Total XML files: $TOTAL"
echo "OK (matched):    $OK_COUNT"
echo "MISS (missing):  $MISS_COUNT"
echo "SKIP (0 tests):  $SKIP_COUNT"
