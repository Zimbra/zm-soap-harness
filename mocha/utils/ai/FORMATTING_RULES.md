# Zimbra SOAP Harness Formatting Rules

This project enforces strict, universal code formatting rules. These rules are non-negotiable and intentionally automated to permanently maintain 1:1 mapping parity with XML and identical structural spacing across all JavaScript test files.

## Master Formatting Execution
To enforce all rules instantly, run:
```bash
npm run format
```

Running this command sequentially executes 10 distinct rule verification scripts found in the `mocha/utils/ai/` directory.

## The 10 Strict Commandments

1. **`apply-strict-formatting.cjs`**
   - Forces exclusively **Tab** (`\t`) indentation across all files (replacing any 4-space inputs).
   - Injects the mandatory `// Applicable zimbra versions` conditional return block before the first `it(...)` definition.
   - Clears out any legacy or rogue `this.timeout(...);` assertions.
   - Enforces precisely 1 empty line before `// Tests`.

2. **`format-xml-in-js.cjs`**
   - Automatically re-tabs multi-line XML template literals.
   - Ensures deep indentation perfectly aligns with the parent `const`/`let` assignment.

3. **`separate-requests.cjs`**
   - Universally enforces a mandatory blank line `\n` specifically between sequential `await soap.makeSOAPEnvelopeAccount(...)` execution calls.

4. **`fix-describe-titles.cjs`**
   - Synchronizes `describe('...', function() {` header titles identically with the disk folder hierarchy nesting logic (e.g. `Admin > Accounts > Account Create`).

5. **`format-asserts.cjs`**
   - Implements a strict 90-character horizontal limit on all `assert.*` blocks.
   - If an assert line exceeds 90 calculated characters, it mathematically calculates the base indentation and wraps the internal assert message cleanly to the next line offset by `+1` tab.

6. **`format-xml-attributes.cjs`**
   - Enforces contiguous, single-line spacing for internal XML attributes.
   - Any XML tag bearing multiple attributes (e.g. `op="grant" id="${rootId}"`) will have all its attributes dynamically collapsed and grouped onto the exact same horizontal line as the tag name to preserve vertical compactness.

7. **`format-singleline-xml.cjs`**
   - Calculates the character width of single-line XML template assignments (`const req = \`<Request/>\`;`).
   - If width is `<= 90 characters`, it is forcefully collapsed to a single line. Otherwise, it wraps.

8. **`format-describe-start.cjs`**
   - Forcefully eliminates all empty whitespace lines immediately following any `describe('...', function () {` statement globally.

9. **`format-describe-end.cjs`**
   - Forcefully eliminates all trailing empty whitespace lines immediately proceeding any closing `});` boundary globally.

10. **`format-block-spacing.cjs`**
    - Enforces exactly one blank line after a closing `});` or `}` block and any subsequent block of code, eliminating multiple consecutive empty lines to keep inter-block vertical spacing strictly 1-to-1.

## Enforcement
These scripts are hooked directly into `npm run format` via `utils/ai/format-master.cjs`. These rules are permanent.
