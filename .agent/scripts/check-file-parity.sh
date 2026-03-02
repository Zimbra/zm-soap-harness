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
# It prints OK for matches and MISS for missing JS files, along with test counts.

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

OK_COUNT=0
MISS_COUNT=0
SKIP_COUNT=0

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
    echo "OK   $rel ($xmltests xml) → $jsdir/$jsbase.js ($jstests js)"
  else
    if [ "$xmltests" -eq 0 ]; then
      echo "SKIP $rel (0 xml tests)"
    else
      echo "MISS $rel ($xmltests xml) → $jsdir/$jsbase.js NOT FOUND"
    fi
  fi
done

echo ""
echo "=== Summary ==="
# Re-count for summary since pipe creates subshell
OK=$(find "$XML_DIR" -name "*.xml" -exec sh -c '
  FOLDER_LOWER="'"$FOLDER_LOWER"'"; JS_DIR="'"$JS_DIR"'"; XML_DIR="'"$XML_DIR"'"
  rel=$(echo "$1" | sed "s|$XML_DIR/||")
  dir=$(dirname "$rel")
  base=$(basename "$rel" .xml)
  jsbase=$(echo "$base" | tr "[:upper:]" "[:lower:]")
  jsdir=$(echo "$dir" | tr "[:upper:]" "[:lower:]")
  jsfile="$JS_DIR/$jsdir/$jsbase.js"
  [ -f "$jsfile" ] && echo "ok"
' _ {} \; | wc -l)

TOTAL=$(find "$XML_DIR" -name "*.xml" | wc -l)

SKIP=$(find "$XML_DIR" -name "*.xml" -exec sh -c '
  xmltests=$(grep -c "type=\"smoke\"\|type=\"sanity\"\|type=\"functional\"\|type=\"regression\"" "$1" 2>/dev/null || true)
  jsbase=$(basename "$1" .xml | tr "[:upper:]" "[:lower:]")
  jsdir=$(dirname "$1" | sed "s|'"$XML_DIR"'/||" | tr "[:upper:]" "[:lower:]")
  jsfile="'"$JS_DIR"'/$jsdir/$jsbase.js"
  [ ! -f "$jsfile" ] && [ "$xmltests" -eq 0 ] && echo "skip"
' _ {} \; | wc -l)

MISS=$((TOTAL - OK - SKIP))

echo "Total XML files: $TOTAL"
echo "OK (matched):    $OK"
echo "MISS (missing):  $MISS"
echo "SKIP (0 tests):  $SKIP"
