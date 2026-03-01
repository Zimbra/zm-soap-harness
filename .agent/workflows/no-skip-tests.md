---
description: Rules for writing JavaScript test files - no skipping tests
---

# No-Skip Rule

**Never use `this.skip()`, `it.skip()`, `describe.skip()`, or `xit()` in any test file.**

Tests must either **pass** or **fail** — never be conditionally skipped.

## What to do instead

| Scenario | Wrong | Correct |
|---|---|---|
| Server operation faults | `if (res.Fault) { this.skip(); return; }` | `assert.notExists(res.Fault, 'Request should not fault');` |
| Missing config | `if (!config.X) { this.skip(); }` | `assert.fail('config.X is required for this test');` |
| Response missing | `if (!res.Response) { this.skip(); }` | `assert.exists(res.Response, 'Response should exist');` |

## Why

- Skipped tests hide real failures and create false confidence
- If a test can't run, it should fail loudly so the issue gets fixed
- The test suite count should always reflect pass/fail — no pending/skipped
