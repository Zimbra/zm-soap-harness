---
description: Strict rules for strengthening assertions in all mocha test files
---

# Strengthen Assertions — Strict Rules

## SOAP API Reference
- **Always deeply go through**: https://files.zimbra.com/docs/soap_api/10.1.0/api-reference/index.html to understand the **exact response structure** for each request type.
- **Before writing assertions**, look up the response XML schema to identify which sub-child elements exist (e.g., `id`, `name`, `lifetime`, `authToken`, `link`, `folder`, `account`, `domain`, `action`, etc.).
- **Start from core elements**: `id`, `name`, then expand to other properties like `lifetime`, `authToken`, `color`, `view`, `f`, `l`, `zid`, `rid`, etc.
- **Use the API docs to determine the correct assertion targets** — never guess. If unsure, check the docs first.

> [!CAUTION]
> When the user says "strengthen assertions", you MUST apply ALL of the following rules to EVERY test in every file in the specified scope. No exceptions.

## Absolute Rule: Every Assertion Must Check a Child Element

> [!CAUTION]
> **ZERO assertions without a child element check.** Every single `assert.exists()`, `assert.isString()`, `assert.equal()`, `assert.include()`, or `assert.match()` MUST target a sub-child element — NEVER just the response object itself. The ONLY exception is `assert.notExists(res.Fault, '...')` as a guard in positive tests.
> - ❌ FORBIDDEN: `assert.exists(res.AuthResponse, '...')`
> - ❌ FORBIDDEN: `assert.exists(res.CreateFolderResponse, '...')`
> - ❌ FORBIDDEN: `assert.exists(res.Fault, '...')`
> - ✅ REQUIRED: `assert.exists(res.AuthResponse.authToken, '...')` — child element
> - ✅ REQUIRED: `assert.isString(res.Fault.Detail.Error.Code, '...')` — child element
> - ✅ ALLOWED: `assert.notExists(res.Fault, '...')` — guard only (not a value assertion)

## No Redundant Parent Assertions (GLOBAL RULE)

> [!CAUTION]
> **If you assert on an internal `.element`, do NOT separately assert on the parent.** The inner assertion implicitly validates the parent exists. This applies EVERYWHERE — Fault, Response objects, any nested property.
> - ❌ BAD: `assert.exists(res.SomeResponse, '...');` then `assert.exists(res.SomeResponse.search[0].id, '...');`
> - ❌ BAD: `assert.exists(res.Fault, '...');` then `assert.exists(res.Fault.Detail.Error, '...');`
> - ✅ GOOD: `assert.exists(res.SomeResponse.search[0].id, '...');` — parent validated implicitly
> - ✅ GOOD: `assert.exists(res.Fault.Detail.Error, '...');` — Fault validated implicitly

## Positive Tests (expecting success)

1. **ALWAYS add `assert.notExists(res.Fault, 'Response should not be a Fault')` BEFORE any response property access.**
2. **ALWAYS extract the response object into a variable and assert on `id`** — never use naked `assert.exists(res.SomeResponse)`.
   - ❌ BAD: `assert.exists(res.CreateFolderResponse)`
   - ❌ BAD: `assert.exists(res.CreateFolderResponse.folder[0])`
   - ✅ GOOD: `const folder = res.CreateFolderResponse.folder[0]; assert.exists(folder.id, 'Folder ID should exist');`
3. **Add type assertions** on IDs: `assert.isString(folder.id, 'Folder ID should be a string')`
4. **Assert on expected values** when known (e.g., `assert.equal(folder.name, folderName)`, `assert.equal(action.op, 'rename')`, `assert.equal(action.id, folderId)`)
5. **Setup steps that create resources** must also validate: capture the response, check `notExists(Fault)`, extract `id`, and `assert.exists(id)`.
6. **NEVER use `assert.exists()` on just the response object** — always assert on a sub-child element (property). The response parent is implicitly validated by asserting on its children.
   - ❌ BAD: `assert.exists(res.CreateMountpointResponse, '...')`
   - ❌ BAD: `assert.exists(res.CreateMountpointResponse.link, '...')`
   - ❌ BAD: `assert.exists(res.GetFreeBusyResponse, '...')`
   - ✅ GOOD: `assert.exists(res.CreateMountpointResponse.link[0].id, 'Link ID should exist')`
   - ✅ GOOD: `assert.exists(res.GetFreeBusyResponse.usr, 'usr element should exist')`
   - ✅ GOOD: `assert.equal(res.CreateMountpointResponse.link[0].name, mountName, 'Name should match')`

## Negative Tests (expecting Fault)

1. **Do NOT redundantly assert on the parent when inner elements are already asserted.** If you assert `res.Fault.Detail.Error` or `res.Fault.Reason.Text`, the parent `res.Fault` is implicitly validated — do NOT add a separate `assert.exists(res.Fault)` line.
   - ❌ BAD (redundant): `assert.exists(res.Fault, '...');` + `assert.exists(res.Fault.Detail.Error, '...');`
   - ✅ GOOD: `assert.exists(res.Fault.Detail.Error, '...');` (parent validated implicitly)
2. **ALWAYS assert on Fault internals**: `assert.exists(res.Fault.Detail.Error, 'Fault Error should exist')`
3. **Assert on error code type**: `assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string')`
4. **Assert on Fault reason text** when the expected error message is known: `assert.include(res.Fault.Reason.Text, 'already exists', 'message')`
5. **NEVER use `if (res.Fault) { ... }` or `if/else` conditionals in assertions** — assert directly. NO EXCEPTIONS. If a folder is deleted, assert the expected Fault. If an operation should succeed, assert success. There is no "dual-outcome" — always pick the correct expected behavior and assert it directly.
6. **NEVER use `||` in assertions** — e.g. `assert.exists(res.SomeResponse || res.Fault)` is FORBIDDEN. This is a dual-outcome hedge. Pick the expected outcome and assert it directly.
   - ❌ BAD: `assert.exists(res.SaveDocumentResponse || res.Fault, '...')`
   - ✅ GOOD: `assert.notExists(res.Fault, '...'); assert.exists(res.SaveDocumentResponse.doc[0].id, '...')`
7. **NEVER use `assert.exists(res.Fault, '...')` alone** — this is a redundant parent assertion. Always assert on an internal element like `assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string')`.
   - ❌ BAD: `assert.exists(authRes.Fault, 'Should return Fault for incorrect password');`
   - ✅ GOOD: `assert.isString(authRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');`

## Strict No If/Else Rule

> [!CAUTION]
> **NEVER use `if/else` logic in test assertions.** Every test must know exactly what the expected outcome is and assert it directly. Do NOT hedge with conditional logic like `if (res.Fault) { ... } else { ... }`. This is a PERMANENT rule with ZERO exceptions.

## FolderActionResponse / ItemActionResponse Pattern

For action responses, ALWAYS assert on BOTH:
- `assert.equal(actionRes.FolderActionResponse.action.op, 'rename', 'Verify op')` — validates the operation
- `assert.equal(actionRes.FolderActionResponse.action.id, folderId, 'Verify id')` — validates the target

## General Rules

- **Never leave `await soap.makeSOAPEnvelopeAccount(...)` without capturing the response** when it creates a resource used later. Always validate the setup step.
- **Remove all `// Verify error` + `// Verify response` double-comment lines** — use a single `// Verify response` comment.
- **Fix incorrect comments** like `// CreateFolderRequest` above a `FolderActionRequest` call — use the correct comment.

## Fix-Tab Script Rule

> [!IMPORTANT]
> **Run `fix-tab` script ONLY AFTER the entire batch of files is completed** — NEVER run it between individual file edits. This avoids introducing formatting regressions mid-batch.
