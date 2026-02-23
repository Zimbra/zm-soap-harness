# JS Test Formatting Guidelines

## Closing Braces
- No blank line between the last `it()` block's closing `});` and the `describe()` block's closing `});`

**Correct:**
```js
	it('test name', async () => {
		// test body
	});
});
```

**Incorrect:**
```js
	it('test name', async () => {
		// test body
	});

});
```

## Assertion Patterns
- Always check if `Fault` or `Response` exists before accessing nested properties like `.Reason.Text` or `.action.op`
- Use defensive if/else when the server may return either Fault or success

**Correct:**
```js
if (response.Fault) {
	assert.include(response.Fault.Reason.Text, 'error message');
} else {
	assert.exists(response.SomeResponse);
}
```

**Incorrect:**
```js
assert.include(response.Fault.Reason.Text, 'error message');
```

## Test Re-runs
- When fixing failures, only re-run the specific failed tests using `-g` pattern, not the entire suite
```bash
node mocha-run.js tests/folders/ -g "test name pattern"
```
