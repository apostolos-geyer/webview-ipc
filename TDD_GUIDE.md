# Test-Driven Development Guide

This project uses **strict TDD** to eliminate ambiguity and ensure predictable implementation.

## Process

### 1. Define API Shape (Stubs)

Create function/class signatures that throw `NotImplementedError`:

```typescript
export function createNativeClient(): never {
  throw new NotImplementedError('createNativeClient')
}
```

### 2. Write Comprehensive Tests

Tests must include:
- **What it does** - Behavior description
- **Input validation** - Valid/invalid inputs
- **Output format** - Exact shape and types
- **Error cases** - All failure modes
- **Edge cases** - Boundary conditions
- **Type safety** - TypeScript inference

**Example test structure:**

```typescript
describe('createNativeClient', () => {
  describe('initialization', () => {
    it('should accept a contract and options object with handlers', () => {
      // GIVEN: A valid contract and handlers
      const contract = defineContract({ ... })
      const options = { handlers: { ... } }

      // WHEN: Creating the client
      const bridge = createNativeClient(contract, options)

      // THEN: Should return bridge object with expected methods
      expect(bridge).toHaveProperty('call')
      expect(bridge).toHaveProperty('emit')
      expect(bridge).toHaveProperty('useEvent')
      expect(bridge).toHaveProperty('handler')
    })

    it('should validate that all required procedures have handlers', () => {
      // GIVEN: Contract with procedures but missing handlers
      const contract = defineContract({
        native: {
          share: z.object({ url: z.string() }).returns(z.object({ success: z.boolean() }))
        }
      })

      // WHEN: Creating client without providing share handler
      const createWithoutHandler = () =>
        createNativeClient(contract, { handlers: {} })

      // THEN: Should throw validation error
      expect(createWithoutHandler).toThrow('Missing handler for procedure: share')
    })

    it('should allow missing handlers for events (not procedures)', () => {
      // GIVEN: Contract with event (no .returns())
      const contract = defineContract({
        native: {
          appStateChange: z.object({ state: z.string() })
        }
      })

      // WHEN: Creating client without handler for event
      // THEN: Should not throw (events are optional)
      expect(() =>
        createNativeClient(contract, { handlers: {} })
      ).not.toThrow()
    })
  })

  describe('call method', () => {
    it('should generate unique correlation IDs for concurrent calls', () => {
      // GIVEN: Multiple concurrent calls
      const ids: string[] = []

      // WHEN: Making 100 concurrent calls
      Promise.all(
        Array.from({ length: 100 }, () =>
          bridge.call('someProc', {}).catch(() => ids.push(/* capture ID */))
        )
      )

      // THEN: All IDs should be unique
      expect(new Set(ids).size).toBe(100)
    })

    it('should serialize message with correct structure', () => {
      // GIVEN: A call to a procedure
      const mockSerialize = vi.fn()
      const bridge = createNativeClient(contract, {
        handlers: {},
        serialize: mockSerialize
      })

      // WHEN: Calling a procedure
      bridge.call('navigate', { path: '/home' })

      // THEN: Should serialize with exact message structure
      expect(mockSerialize).toHaveBeenCalledWith({
        id: expect.any(String),
        type: 'request',
        procedure: 'navigate',
        data: { path: '/home' },
        timestamp: expect.any(Number)
      })
    })

    it('should return promise that resolves when response received', async () => {
      // GIVEN: A bridge and a mock response
      const promise = bridge.call('navigate', { path: '/home' })

      // WHEN: Response is received via handler
      simulateResponse({ id: '...', type: 'response', data: { success: true } })

      // THEN: Promise should resolve with response data
      await expect(promise).resolves.toEqual({ success: true })
    })

    it('should reject promise after timeout (default 5000ms)', async () => {
      // GIVEN: A call that never receives response
      const promise = bridge.call('navigate', { path: '/home' })

      // WHEN: Waiting longer than timeout
      vi.advanceTimersByTime(5001)

      // THEN: Should reject with timeout error
      await expect(promise).rejects.toThrow(WebViewRPCTimeoutError)
      await expect(promise).rejects.toThrow('Request timed out after 5000ms')
    })

    it('should use custom timeout when provided', async () => {
      // GIVEN: Bridge with custom timeout
      const bridge = createNativeClient(contract, {
        handlers: {},
        timeout: 1000
      })

      // WHEN: Call times out
      const promise = bridge.call('navigate', {})
      vi.advanceTimersByTime(1001)

      // THEN: Should timeout after custom duration
      await expect(promise).rejects.toThrow('Request timed out after 1000ms')
    })

    it('should clean up pending request after successful resolution', async () => {
      // GIVEN: A call that will resolve
      const promise = bridge.call('navigate', {})

      // WHEN: Response received
      simulateResponse({ type: 'response', data: {} })
      await promise

      // THEN: Should remove from pending requests map
      expect(bridge._getPendingCount()).toBe(0) // Internal test helper
    })

    it('should clean up pending request after timeout', async () => {
      // GIVEN: A call that will timeout
      bridge.call('navigate', {})

      // WHEN: Timeout occurs
      vi.advanceTimersByTime(5001)

      // THEN: Should remove from pending requests map
      await vi.waitFor(() => expect(bridge._getPendingCount()).toBe(0))
    })

    it('should reject if error in response', async () => {
      // GIVEN: A call
      const promise = bridge.call('navigate', {})

      // WHEN: Error response received
      simulateResponse({
        type: 'response',
        error: { message: 'Navigation failed', code: 'NAV_ERROR' }
      })

      // THEN: Should reject with WebViewRPCError
      await expect(promise).rejects.toThrow(WebViewRPCError)
      await expect(promise).rejects.toMatchObject({
        message: 'Navigation failed',
        code: 'NAV_ERROR'
      })
    })
  })

  // ... more describe blocks
})
```

### 3. Run Tests

Tests should fail with `NotImplementedError`:

```bash
pnpm test:watch

# Expected output:
# FAIL packages/core/src/contract.test.ts
#   NotImplementedError: defineContract
```

### 4. Implement

Write actual code to make tests pass:

```typescript
export function defineContract<T>(schema: T): Contract<T> {
  // Real implementation
  return {
    _schema: schema,
    _type: 'contract' as const
  }
}
```

### 5. Verify

Tests should now pass:

```bash
# Expected output:
# PASS packages/core/src/contract.test.ts
#   ✓ defineContract
```

### 6. Refactor

Improve code while keeping tests green.

## Test Structure

```
describe('ModuleName', () => {
  describe('specific feature', () => {
    describe('sub-feature or method', () => {
      it('should [expected behavior] when [conditions]', () => {
        // GIVEN: Setup and preconditions
        // WHEN: Action being tested
        // THEN: Expected outcome
      })
    })
  })
})
```

## Benefits

1. **Eliminates Ambiguity** - Tests define exact behavior
2. **Catches Regressions** - Changes break tests immediately
3. **Living Documentation** - Tests show how to use API
4. **Design Feedback** - Hard to test = bad API design
5. **Confidence** - Green tests = working code

## Running Tests

```bash
# All tests
pnpm test

# Watch mode (for TDD)
pnpm test:watch

# With UI
pnpm test:ui

# With coverage
pnpm test:coverage
```

## Coverage Goals

- **Unit tests:** 90%+ coverage
- **Critical paths:** 100% (correlation, errors, timeouts)
- **Happy path:** 100%
- **Error paths:** 100%

## Next Steps

1. Read existing tests to understand patterns
2. Write tests for new feature before implementing
3. Run tests to see them fail
4. Implement until tests pass
5. Refactor with confidence
