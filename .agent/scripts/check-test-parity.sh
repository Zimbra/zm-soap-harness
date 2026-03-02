#!/usr/bin/env bash
# check-test-parity.sh — Check test count parity between XML and JS test files
#
# Usage:
#   bash .agent/scripts/check-test-parity.sh <FolderName>
#
# Example:
#   bash .agent/scripts/check-test-parity.sh Calendar
#   bash .agent/scripts/check-test-parity.sh Mail
#   bash .agent/scripts/check-test-parity.sh Prefs
#
# This script compares the number of tests in each XML file against its
# corresponding JS file. Shows ✓ for matching counts, ≠ for mismatches,
# MISS for missing JS files, and SKIP for XML files with 0 tests.

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

MATCH=0
MISMATCH=0
MISS=0
SKIP=0
TOTAL_XML_TESTS=0
TOTAL_JS_TESTS=0

# Use temp files to accumulate counts (pipe creates subshell)
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

find "$XML_DIR" -name "*.xml" | sort | while read -r xmlf; do
  rel=$(echo "$xmlf" | sed "s|$XML_DIR/||")
  dir=$(dirname "$rel")
  base=$(basename "$rel" .xml)
  jsbase=$(echo "$base" | tr '[:upper:]' '[:lower:]')
  jsdir=$(echo "$dir" | tr '[:upper:]' '[:lower:]')
  jsfile="$JS_DIR/$jsdir/$jsbase.js"

  xmltests=$(grep -c 'type="smoke"\|type="sanity"\|type="functional"\|type="regression"' "$xmlf" 2>/dev/null || true)

  if [ -f "$jsfile" ]; then
    jstests=$(grep -c '^\s*it(' "$jsfile" 2>/dev/null || true)
    if [ "$xmltests" -eq "$jstests" ]; then
      echo "✓ $rel ($xmltests xml → $jstests js)"
      echo "MATCH $xmltests $jstests" >> "$TMPFILE"
    else
      echo "≠ $rel ($xmltests xml → $jstests js)"
      echo "MISMATCH $xmltests $jstests" >> "$TMPFILE"
    fi
  else
    if [ "$xmltests" -eq 0 ]; then
      echo "SKIP $rel (0 xml tests)"
      echo "SKIP 0 0" >> "$TMPFILE"
    else
      echo "MISS $rel ($xmltests xml)"
      echo "MISS $xmltests 0" >> "$TMPFILE"
    fi
  fi
done

echo ""
echo "=== Summary ==="
MATCH_COUNT=$(grep -c "^MATCH" "$TMPFILE" 2>/dev/null || true)
MISMATCH_COUNT=$(grep -c "^MISMATCH" "$TMPFILE" 2>/dev/null || true)
MISS_COUNT=$(grep -c "^MISS" "$TMPFILE" 2>/dev/null || true)
SKIP_COUNT=$(grep -c "^SKIP" "$TMPFILE" 2>/dev/null || true)
TOTAL_FILES=$((MATCH_COUNT + MISMATCH_COUNT + MISS_COUNT + SKIP_COUNT))

TOTAL_XML=$(awk '{sum += $2} END {print sum+0}' "$TMPFILE")
TOTAL_JS=$(awk '/^MATCH|^MISMATCH/ {sum += $3} END {print sum+0}' "$TMPFILE")

echo "Total XML files:     $TOTAL_FILES"
echo "✓ Matching counts:   $MATCH_COUNT"
echo "≠ Mismatched counts: $MISMATCH_COUNT"
echo "MISS (no JS file):   $MISS_COUNT"
echo "SKIP (0 xml tests):  $SKIP_COUNT"
echo ""
echo "Total XML tests:     $TOTAL_XML"
echo "Total JS tests:      $TOTAL_JS"
echo "Gap:                 $((TOTAL_XML - TOTAL_JS))"
