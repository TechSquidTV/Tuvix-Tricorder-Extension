# Testing Documentation

This directory contains the test setup and configuration for the Tuvix Tricorder Extension.

## Test Framework

- **Vitest**: Fast, modern test runner with excellent TypeScript support
- **jsdom**: Simulates browser environment for testing DOM-related code
- **Test Coverage**: v8 for code coverage analysis

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with interactive UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

## Test Structure

Tests are colocated with their source files using the `.test.ts` suffix:

```
src/
├── cache.ts
├── cache.test.ts          # Tests for cache module
├── config.ts
├── config.test.ts         # Tests for config module
└── utils/
    ├── feedGrouping.ts
    ├── feedGrouping.test.ts    # Tests for feed grouping
    ├── urlValidation.ts
    └── urlValidation.test.ts   # Tests for URL validation
```

## Test Setup

The `setup.ts` file in this directory provides:

- Mock implementation of `webextension-polyfill` browser APIs
- Mock storage.local API with in-memory storage
- Automatic cleanup between tests (via `beforeEach`)

### Browser Storage Mock

The test setup includes a fully functional mock of `browser.storage.local`:

```typescript
// Automatically available in all tests
import browser from 'webextension-polyfill';

// Works just like the real API
await browser.storage.local.set({ key: 'value' });
const result = await browser.storage.local.get('key');
```

## Test Coverage

Current test coverage includes:

### Cache Module (`src/cache.test.ts`)
- ✅ URL normalization (query params, fragments)
- ✅ Cache storage and retrieval
- ✅ TTL-based expiration
- ✅ Cache clearing (all entries, single entry)
- ✅ Cache statistics
- ✅ Expired entry cleanup

### Config Module (`src/config.test.ts`)
- ✅ Default configuration
- ✅ Config storage and retrieval
- ✅ Partial updates
- ✅ Subscribe action types
- ✅ Cache TTL conversion (days to milliseconds)
- ✅ Config persistence

### Feed Grouping (`src/utils/feedGrouping.test.ts`)
- ✅ URL normalization (extensions, paths, query params)
- ✅ Grouping RSS and Atom feeds together
- ✅ Handling format variations
- ✅ Preserving feed metadata
- ✅ Case-insensitive type matching

### URL Validation (`src/utils/urlValidation.test.ts`)
- ✅ Valid URL acceptance (HTTP, HTTPS, ports, paths)
- ✅ URL normalization (trailing slashes, query params)
- ✅ Invalid URL rejection (missing protocol, malformed)
- ✅ Edge cases (fragments, auth, encoded chars)
- ✅ Common user input scenarios

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myModule', () => {
  describe('myFunction', () => {
    it('should do something', () => {
      const result = myFunction('input');
      expect(result).toBe('expected');
    });
  });
});
```

### Testing with Browser Storage

```typescript
import { describe, it, expect } from 'vitest';
import browser from 'webextension-polyfill';

describe('storage functionality', () => {
  it('should store and retrieve data', async () => {
    await browser.storage.local.set({ key: 'value' });
    const result = await browser.storage.local.get('key');
    expect(result.key).toBe('value');
  });
});
```

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  const result = await functionThatMayFail();
  expect(result).toBeNull(); // or check error state
});
```

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
   - Good: `'should remove trailing slashes from URLs'`
   - Bad: `'test URL normalization'`

2. **Arrange-Act-Assert**: Structure tests with clear sections
   ```typescript
   it('should do something', () => {
     // Arrange: Set up test data
     const input = 'test';

     // Act: Execute the function
     const result = myFunction(input);

     // Assert: Check the result
     expect(result).toBe('expected');
   });
   ```

3. **Test Independence**: Each test should be independent and not rely on other tests

4. **Mock External Dependencies**: Use the provided browser API mocks instead of real browser APIs

5. **Edge Cases**: Test edge cases and error conditions, not just happy paths

6. **Keep Tests Simple**: Tests should be easy to read and understand

## CI Integration

Tests are included in the `check` script, which runs:

```bash
pnpm check  # format:check + lint + type-check + test
```

This ensures all tests pass before commits or releases.

## Coverage Goals

Target coverage for critical modules:
- Cache module: 90%+
- Config module: 90%+
- URL validation: 90%+
- Feed grouping: 90%+

Run `pnpm test:coverage` to see current coverage metrics.

## Troubleshooting

### Tests failing with browser API errors

Make sure you're importing from the mock:
```typescript
import browser from 'webextension-polyfill';
```

The mock is automatically configured in `setup.ts`.

### Storage not persisting between test calls

The mock storage is cleared between tests. If you need persistence within a test, make multiple calls in the same test.

### TypeScript errors in tests

Ensure your test files have the `.test.ts` extension and are importing types correctly.
