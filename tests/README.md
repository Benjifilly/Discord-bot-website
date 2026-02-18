# Dashboard Tests

This directory contains tests for `js/dashboard.js`.

The project does not use a package manager like npm, so tests are run using a standalone Node.js script that mocks the browser environment.

## Running Tests

To run the tests, execute the following command from the root of the project:

```bash
node tests/test_dashboard.js
```

## Test Coverage

The tests cover the `checkDifference` function, which is responsible for detecting changes in settings.
Scenarios covered include:
- String and Boolean value changes.
- Array changes (length, content, order).
- Handling of `undefined` and `null` original values (normalization).
- Edge cases like mixing types.
