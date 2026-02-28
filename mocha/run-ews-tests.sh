#!/bin/bash
cd /c/git/zm-soap-harness/mocha

OUTFILE="ews-test-results.txt"
> "$OUTFILE"

passed=0
failed=0
failed_list=""

for f in $(find tests/ews -name '*.js' | sort); do
    output=$(node mocha-run.js "$f" 2>&1)
    exit_code=$?
    
    summary=$(echo "$output" | grep "Total = " | head -1)
    
    if [ $exit_code -eq 0 ]; then
        passed=$((passed + 1))
        echo "PASS | $f | $summary" >> "$OUTFILE"
    else
        failed=$((failed + 1))
        echo "FAIL | $f | $summary" >> "$OUTFILE"
        # Capture error details
        echo "$output" | grep -E "AssertionError|TypeError|Error|failing|Cannot find|not found" | head -5 >> "$OUTFILE"
        echo "---" >> "$OUTFILE"
        failed_list="$failed_list $f"
    fi
done

echo "" >> "$OUTFILE"
echo "==========================================" >> "$OUTFILE"
echo "SUMMARY: Passed=$passed Failed=$failed" >> "$OUTFILE"
if [ -n "$failed_list" ]; then
    echo "Failed files:$failed_list" >> "$OUTFILE"
fi
echo "==========================================" >> "$OUTFILE"
echo "DONE"
