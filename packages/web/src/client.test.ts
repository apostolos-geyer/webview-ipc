/**
 * Tests for createWebClient
 * @module client.test
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { WebViewRPCError, WebViewRPCTimeoutError, defineContract } from '@webview-rpc/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createWebClient } from './client'

// Mock window.ReactNativeWebView
const mockPostMessage = vi.fn()
let messageListeners: Array<(event: MessageEvent) => void> = []

beforeEach(() => {
  messageListeners = []

  // Setup mock window with proper event handling
  Object.defineProperty(globalThis, 'window', {
    value: {
      ReactNativeWebView: {
        postMessage: mockPostMessage,
      },
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        if (event === 'message') {
          messageListeners.push(handler)
        }
      }),
      removeEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        if (event === 'message') {
          messageListeners = messageListeners.filter((h) => h !== handler)
        }
      }),
      dispatchEvent: vi.fn((event: MessageEvent) => {
        // biome-ignore lint/complexity/noForEach: Test helper code dispatching events
        messageListeners.forEach((handler) => handler(event))
        return true
      }),
    },
    writable: true,
    configurable: true,
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// Helper to create mock schema
const createMockSchema = <TInput, TOutput = TInput>(
  defaultValue?: TOutput
): StandardSchemaV1<TInput, TOutput> => ({
  '~standard': {
    version: 1,
    vendor: 'mock',
    validate: (value: unknown) => ({ value: (defaultValue ?? value) as TOutput }),
  },
})

// Helper to create procedure schema
const createProcedureSchema = <TInput, TOutput>(inputDefault?: TInput, outputDefault?: TOutput) => {
  const inputSchema = createMockSchema<TInput>(inputDefault)
  const outputSchema = createMockSchema<TOutput>(outputDefault)

  return {
    ...inputSchema,
    returns: () => ({
      ...inputSchema,
      _returnSchema: outputSchema,
      returns: () => createProcedureSchema(inputDefault, outputDefault),
    }),
  }
}

describe('createWebClient', () => {
  describe('initialization', () => {
    it('SHOULD create client with minimal options', () => {
      // GIVEN: A valid contract
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // WHEN: Creating client with no options
      const client = createWebClient(contract)

      // THEN: Should return client with expected API
      expect(client).toBeDefined()
      expect(client).toHaveProperty('native')
      expect(client).toHaveProperty('web')
      expect(client).toHaveProperty('isWebView')
      expect(client).toHaveProperty('cleanup')
    })

    it('SHOULD handle window being undefined during initialization', () => {
      // GIVEN: Save original window
      const originalWindow = globalThis.window

      // Temporarily remove window
      // @ts-expect-error - Testing edge case where window is undefined
      // biome-ignore lint/performance/noDelete: Required for testing window undefined scenario
      delete globalThis.window

      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // WHEN: Creating client without window
      // THEN: Should create client successfully
      expect(() => {
        const client = createWebClient(contract)
        expect(client).toBeDefined()
        expect(client.isWebView).toBe(false)
      }).not.toThrow()

      // Restore window
      globalThis.window = originalWindow
    })

    it('SHOULD handle window being undefined during cleanup', () => {
      // GIVEN: Create client with window
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      const client = createWebClient(contract)

      // Save and remove window before cleanup
      const originalWindow = globalThis.window
      // @ts-expect-error - Testing edge case where window is undefined
      // biome-ignore lint/performance/noDelete: Required for testing window undefined scenario
      delete globalThis.window

      // WHEN: Calling cleanup without window
      expect(() => {
        client.cleanup()
      }).not.toThrow()

      // Restore window
      globalThis.window = originalWindow
    })

    it('SHOULD accept all optional configuration', () => {
      // GIVEN: Contract and full options
      const contract = defineContract({
        web: { test: createMockSchema<{ value: string }>() },
      })

      const onError = vi.fn()
      const serializer = vi.fn((data: unknown) => JSON.stringify(data))
      const deserializer = vi.fn((data: string) => JSON.parse(data))

      // WHEN: Creating client with all options
      const client = createWebClient(contract, {
        serializer,
        deserializer,
        timeout: 3000,
        onError,
      })

      // THEN: Should create client successfully
      expect(client).toBeDefined()
    })

    it('SHOULD detect WebView environment when window.ReactNativeWebView exists', () => {
      // GIVEN: window.ReactNativeWebView exists
      const contract = defineContract({
        web: { test: createMockSchema<{ value: string }>() },
      })

      // WHEN: Creating client
      const client = createWebClient(contract)

      // THEN: isWebView should be true
      expect(client.isWebView).toBe(true)
    })

    it('SHOULD detect non-WebView environment when window.ReactNativeWebView missing', () => {
      // GIVEN: No ReactNativeWebView
      // biome-ignore lint/suspicious/noExplicitAny: Test code modifying window global
      ;(globalThis.window as any).ReactNativeWebView = undefined

      const contract = defineContract({
        web: { test: createMockSchema<{ value: string }>() },
      })

      // WHEN: Creating client
      const client = createWebClient(contract)

      // THEN: isWebView should be false
      expect(client.isWebView).toBe(false)
    })

    it('SHOULD have native.call and native.handle methods', () => {
      // GIVEN: Contract with native procedures
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      // WHEN: Creating client
      const client = createWebClient(contract)

      // THEN: Should have native methods
      expect(client.native.call).toBeTypeOf('function')
      expect(client.native.handle).toBeTypeOf('function')
    })

    it('SHOULD have web.emit and web.handle methods', () => {
      // GIVEN: Contract with web events/procedures
      const contract = defineContract({
        web: {
          pathChanged: createMockSchema<{ path: string }>(),
        },
      })

      // WHEN: Creating client
      const client = createWebClient(contract)

      // THEN: Should have web methods
      expect(client.web.emit).toBeTypeOf('function')
      expect(client.web.handle).toBeTypeOf('function')
    })
  })

  describe('native.call (request-response)', () => {
    it('SHOULD send request message with correlation ID', async () => {
      // GIVEN: Client with native procedure
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Calling native procedure
      client.native.call('share', { url: 'https://example.com' }).catch(() => {})

      // THEN: Should post message with correct structure
      expect(mockPostMessage).toHaveBeenCalledWith(expect.stringContaining('"type":"request"'))

      const callArg = mockPostMessage.mock.calls[0][0]
      const message = JSON.parse(callArg)

      expect(message).toMatchObject({
        type: 'request',
        procedure: 'share',
        data: { url: 'https://example.com' },
      })
      expect(message.id).toBeDefined()
      expect(typeof message.id).toBe('string')

      // Cleanup
      client.cleanup()
    })

    it('SHOULD generate unique correlation IDs for concurrent calls', () => {
      // GIVEN: Client with native procedure
      const contract = defineContract({
        native: {
          test: createProcedureSchema<{ value: number }, { result: number }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Making multiple concurrent calls
      client.native.call('test', { value: 1 }).catch(() => {})
      client.native.call('test', { value: 2 }).catch(() => {})
      client.native.call('test', { value: 3 }).catch(() => {})

      // THEN: Should use unique IDs
      const ids = mockPostMessage.mock.calls.map((call) => {
        const message = JSON.parse(call[0])
        return message.id
      })

      expect(new Set(ids).size).toBe(3)

      // Cleanup
      client.cleanup()
    })

    it('SHOULD resolve promise when response received', async () => {
      // GIVEN: Client with native procedure
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Calling procedure
      const promise = client.native.call('share', { url: 'https://example.com' })

      // Get the correlation ID from the posted message
      const callArg = mockPostMessage.mock.calls[0][0]
      const sentMessage = JSON.parse(callArg)

      // Simulate response from native
      const responseMessage = {
        id: sentMessage.id,
        type: 'response',
        data: { success: true },
      }

      // Trigger the message event
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(responseMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Promise should resolve with response data
      await expect(promise).resolves.toEqual({ success: true })
    })

    it('SHOULD reject promise after timeout', async () => {
      // GIVEN: Client with custom timeout
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract, { timeout: 1000 })

      // WHEN: Calling procedure that never responds
      const promise = client.native.call('share', { url: 'https://example.com' })

      // Advance timers past timeout
      vi.advanceTimersByTime(1001)

      // THEN: Should reject with timeout error
      await expect(promise).rejects.toThrow(WebViewRPCTimeoutError)
      await expect(promise).rejects.toThrow('Request timed out after 1000ms')
    })

    it('SHOULD use default timeout of 5000ms', async () => {
      // GIVEN: Client with default timeout
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Calling procedure that never responds
      const promise = client.native.call('share', { url: 'https://example.com' })

      // Advance to just before timeout
      vi.advanceTimersByTime(4999)
      await Promise.resolve() // Let microtasks run

      // THEN: Should not timeout yet
      expect(promise).toBeInstanceOf(Promise)

      // Advance past timeout
      vi.advanceTimersByTime(2)

      // Should timeout now
      await expect(promise).rejects.toThrow(WebViewRPCTimeoutError)
      await expect(promise).rejects.toThrow('Request timed out after 5000ms')
    })

    it('SHOULD reject if error in response', async () => {
      // GIVEN: Client with native procedure
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Calling procedure
      const promise = client.native.call('share', { url: 'https://example.com' })

      // Get correlation ID
      const callArg = mockPostMessage.mock.calls[0][0]
      const sentMessage = JSON.parse(callArg)

      // Simulate error response
      const errorMessage = {
        id: sentMessage.id,
        type: 'response',
        error: {
          message: 'Share failed',
          code: 'SHARE_ERROR',
        },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(errorMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Should reject with WebViewRPCError
      await expect(promise).rejects.toThrow(WebViewRPCError)
      await expect(promise).rejects.toMatchObject({
        message: 'Share failed',
        code: 'SHARE_ERROR',
      })
    })

    it('SHOULD cleanup pending request after resolution', async () => {
      // GIVEN: Client with native procedure
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Making call and resolving it
      const promise = client.native.call('share', { url: 'https://example.com' })

      const callArg = mockPostMessage.mock.calls[0][0]
      const sentMessage = JSON.parse(callArg)

      const responseMessage = {
        id: sentMessage.id,
        type: 'response',
        data: { success: true },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(responseMessage),
      })
      window.dispatchEvent(messageEvent)

      await promise

      // THEN: Sending same response again should not affect anything
      window.dispatchEvent(messageEvent)
      // Should not throw or cause issues
    })

    it('SHOULD cleanup pending request after timeout', async () => {
      // GIVEN: Client with native procedure
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract, { timeout: 1000 })

      // WHEN: Making call that times out
      const promise = client.native.call('share', { url: 'https://example.com' })

      const callArg = mockPostMessage.mock.calls[0][0]
      const sentMessage = JSON.parse(callArg)

      vi.advanceTimersByTime(1001)

      await expect(promise).rejects.toThrow()

      // THEN: Sending response after timeout should not cause issues
      const responseMessage = {
        id: sentMessage.id,
        type: 'response',
        data: { success: true },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(responseMessage),
      })
      window.dispatchEvent(messageEvent)
      // Should not throw or cause issues
    })

    it('SHOULD use custom serializer when provided', async () => {
      // GIVEN: Client with custom serializer
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const customSerializer = vi.fn((data: unknown) => JSON.stringify(data))

      const client = createWebClient(contract, {
        serializer: customSerializer,
      })

      // WHEN: Calling procedure
      client.native.call('share', { url: 'https://example.com' }).catch(() => {})

      // THEN: Should use custom serializer
      expect(customSerializer).toHaveBeenCalled()

      // Cleanup
      client.cleanup()
    })

    it('SHOULD not post message if not in WebView', async () => {
      // GIVEN: No ReactNativeWebView
      // biome-ignore lint/suspicious/noExplicitAny: Test code modifying window global
      ;(globalThis.window as any).ReactNativeWebView = undefined

      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Calling procedure
      const promise = client.native.call('share', { url: 'https://example.com' })

      // THEN: Should reject immediately (or handle gracefully)
      await expect(promise).rejects.toThrow()
      expect(mockPostMessage).not.toHaveBeenCalled()
    })
  })

  describe('web.emit (fire-and-forget)', () => {
    it('SHOULD send event message without correlation ID', () => {
      // GIVEN: Client with web event
      const contract = defineContract({
        web: {
          pathChanged: createMockSchema<{ path: string }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Emitting event
      client.web.emit('pathChanged', { path: '/home' })

      // THEN: Should post message with type=event
      expect(mockPostMessage).toHaveBeenCalledWith(expect.stringContaining('"type":"event"'))

      const callArg = mockPostMessage.mock.calls[0][0]
      const message = JSON.parse(callArg)

      expect(message).toMatchObject({
        type: 'event',
        event: 'pathChanged',
        data: { path: '/home' },
      })
    })

    it('SHOULD not wait for response when emitting', () => {
      // GIVEN: Client with web event
      const contract = defineContract({
        web: {
          pathChanged: createMockSchema<{ path: string }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Emitting event
      const result = client.web.emit('pathChanged', { path: '/home' })

      // THEN: Should return void (not a promise)
      expect(result).toBeUndefined()
    })

    it('SHOULD not emit if not in WebView', () => {
      // GIVEN: No ReactNativeWebView
      // biome-ignore lint/suspicious/noExplicitAny: Test code modifying window global
      ;(globalThis.window as any).ReactNativeWebView = undefined

      const contract = defineContract({
        web: {
          pathChanged: createMockSchema<{ path: string }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Emitting event
      client.web.emit('pathChanged', { path: '/home' })

      // THEN: Should not post message
      expect(mockPostMessage).not.toHaveBeenCalled()
    })
  })

  describe('native.handle (event listeners)', () => {
    it('SHOULD register event handler', () => {
      // GIVEN: Client with native event
      const contract = defineContract({
        native: {
          appStateChange: createMockSchema<{ state: string }>(),
        },
      })

      const client = createWebClient(contract)
      const handler = vi.fn()

      // WHEN: Registering handler
      const unregister = client.native.handle('appStateChange', handler)

      // THEN: Should return unregister function
      expect(unregister).toBeTypeOf('function')
    })

    it('SHOULD invoke handler when event received', () => {
      // GIVEN: Client with registered event handler
      const contract = defineContract({
        native: {
          appStateChange: createMockSchema<{ state: string }>(),
        },
      })

      const client = createWebClient(contract)
      const handler = vi.fn()

      client.native.handle('appStateChange', handler)

      // WHEN: Receiving event from native
      const eventMessage = {
        id: 'event-1',
        type: 'event',
        event: 'appStateChange',
        data: { state: 'active' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(eventMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Handler should be invoked with event data
      expect(handler).toHaveBeenCalledWith({ state: 'active' })
    })

    it('SHOULD support multiple handlers for same event', () => {
      // GIVEN: Client with multiple handlers for same event
      const contract = defineContract({
        native: {
          appStateChange: createMockSchema<{ state: string }>(),
        },
      })

      const client = createWebClient(contract)
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      client.native.handle('appStateChange', handler1)
      client.native.handle('appStateChange', handler2)

      // WHEN: Receiving event
      const eventMessage = {
        id: 'event-1',
        type: 'event',
        event: 'appStateChange',
        data: { state: 'active' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(eventMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Both handlers should be invoked
      expect(handler1).toHaveBeenCalledWith({ state: 'active' })
      expect(handler2).toHaveBeenCalledWith({ state: 'active' })
    })

    it('SHOULD remove handler when unregister called', () => {
      // GIVEN: Client with registered handler
      const contract = defineContract({
        native: {
          appStateChange: createMockSchema<{ state: string }>(),
        },
      })

      const client = createWebClient(contract)
      const handler = vi.fn()

      const unregister = client.native.handle('appStateChange', handler)

      // WHEN: Unregistering handler
      unregister()

      // Receive event
      const eventMessage = {
        id: 'event-1',
        type: 'event',
        event: 'appStateChange',
        data: { state: 'active' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(eventMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Handler should not be invoked
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('web.handle (procedure handlers)', () => {
    it('SHOULD register procedure handler', () => {
      // GIVEN: Client with web procedure
      const contract = defineContract({
        web: {
          navigate: createProcedureSchema<{ path: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)
      const handler = vi.fn(async (_data: { path: string }) => ({ success: true }))

      // WHEN: Registering handler
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion for test handler
      const unregister = client.web.handle('navigate', handler as any)

      // THEN: Should return unregister function
      expect(unregister).toBeTypeOf('function')
    })

    it('SHOULD invoke handler when request received and send response', async () => {
      // GIVEN: Client with registered procedure handler
      const contract = defineContract({
        web: {
          navigate: createProcedureSchema<{ path: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)
      const handler = vi.fn(async (_data: { path: string }) => ({ success: true }))

      // biome-ignore lint/suspicious/noExplicitAny: Type assertion for test handler
      client.web.handle('navigate', handler as any)

      // WHEN: Receiving request from native
      const requestMessage = {
        id: 'req-1',
        type: 'request',
        procedure: 'navigate',
        data: { path: '/home' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(requestMessage),
      })
      window.dispatchEvent(messageEvent)

      // Wait for async handler
      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalledWith({ path: '/home' })
      })

      // THEN: Should send response back
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(expect.stringContaining('"type":"response"'))
      })

      const responseCall = mockPostMessage.mock.calls.find((call) =>
        call[0].includes('"type":"response"')
      )
      expect(responseCall).toBeDefined()

      // biome-ignore lint/style/noNonNullAssertion: Safe after toBeDefined check
      const responseMessage = JSON.parse(responseCall![0])
      expect(responseMessage).toMatchObject({
        id: 'req-1',
        type: 'response',
        data: { success: true },
      })
    })

    it('SHOULD send error response if handler throws', async () => {
      // GIVEN: Client with handler that throws
      const contract = defineContract({
        web: {
          navigate: createProcedureSchema<{ path: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)
      const handler = vi.fn(async (_data: { path: string }): Promise<{ success: boolean }> => {
        throw new Error('Navigation failed')
      })

      // biome-ignore lint/suspicious/noExplicitAny: Type assertion for test handler
      client.web.handle('navigate', handler as any)

      // WHEN: Receiving request
      const requestMessage = {
        id: 'req-1',
        type: 'request',
        procedure: 'navigate',
        data: { path: '/home' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(requestMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Should send error response
      await vi.waitFor(() => {
        const responseCall = mockPostMessage.mock.calls.find((call) =>
          call[0].includes('"type":"response"')
        )
        expect(responseCall).toBeDefined()

        // biome-ignore lint/style/noNonNullAssertion: Safe after toBeDefined check
        const responseMessage = JSON.parse(responseCall![0])
        expect(responseMessage).toMatchObject({
          id: 'req-1',
          type: 'response',
          error: {
            message: 'Navigation failed',
            code: 'HANDLER_ERROR',
          },
        })
      })
    })

    it('SHOULD remove handler when unregister called', () => {
      // GIVEN: Client with registered handler
      const contract = defineContract({
        web: {
          navigate: createProcedureSchema<{ path: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)
      const handler = vi.fn(async (_data: { path: string }) => ({ success: true }))

      // biome-ignore lint/suspicious/noExplicitAny: Type assertion for test handler
      const unregister = client.web.handle('navigate', handler as any)

      // WHEN: Unregistering handler
      unregister()

      // Receive request
      const requestMessage = {
        id: 'req-1',
        type: 'request',
        procedure: 'navigate',
        data: { path: '/home' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(requestMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Handler should not be invoked
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('SHOULD cancel all pending requests', async () => {
      // GIVEN: Client with pending requests
      const contract = defineContract({
        native: {
          share: createProcedureSchema<{ url: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      const promise1 = client.native.call('share', { url: 'https://example.com' })
      const promise2 = client.native.call('share', { url: 'https://example.org' })

      // WHEN: Calling cleanup
      client.cleanup()

      // THEN: All pending requests should be rejected
      await expect(promise1).rejects.toThrow()
      await expect(promise2).rejects.toThrow()
    })

    it('SHOULD remove all event listeners', () => {
      // GIVEN: Client with event listeners
      const contract = defineContract({
        native: {
          appStateChange: createMockSchema<{ state: string }>(),
        },
      })

      const client = createWebClient(contract)
      const handler = vi.fn()

      client.native.handle('appStateChange', handler)

      // WHEN: Calling cleanup
      client.cleanup()

      // Receive event
      const eventMessage = {
        id: 'event-1',
        type: 'event',
        event: 'appStateChange',
        data: { state: 'active' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(eventMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Handler should not be invoked
      expect(handler).not.toHaveBeenCalled()
    })

    it('SHOULD remove window message listener', () => {
      // GIVEN: Client
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      const removeEventListener = vi.spyOn(window, 'removeEventListener')

      const client = createWebClient(contract)

      // WHEN: Calling cleanup
      client.cleanup()

      // THEN: Should remove event listener
      expect(removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })
  })

  describe('error handling', () => {
    it('SHOULD call onError handler for unhandled errors', async () => {
      // GIVEN: Client with onError handler
      const contract = defineContract({
        web: {
          navigate: createProcedureSchema<{ path: string }, { success: boolean }>(),
        },
      })

      const onError = vi.fn()
      const client = createWebClient(contract, { onError })

      // Register handler that throws
      client.web.handle('navigate', async () => {
        throw new Error('Handler error')
      })

      // WHEN: Receiving request that causes handler to throw
      const requestMessage = {
        id: 'req-1',
        type: 'request',
        procedure: 'navigate',
        data: { path: '/home' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(requestMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: onError should be called
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    it('SHOULD handle invalid message format gracefully', () => {
      // GIVEN: Client
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      const onError = vi.fn()
      createWebClient(contract, { onError })

      // WHEN: Receiving invalid message
      const messageEvent = new MessageEvent('message', {
        data: 'invalid json',
      })

      // THEN: Should not throw
      expect(() => {
        window.dispatchEvent(messageEvent)
      }).not.toThrow()

      // And should call onError
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('SHOULD use custom deserializer when provided', () => {
      // GIVEN: Client with custom deserializer
      const contract = defineContract({
        native: {
          appStateChange: createMockSchema<{ state: string }>(),
        },
      })

      const customDeserializer = vi.fn((data: string) => JSON.parse(data))

      const client = createWebClient(contract, {
        deserializer: customDeserializer,
      })

      const handler = vi.fn()
      client.native.handle('appStateChange', handler)

      // WHEN: Receiving message
      const eventMessage = {
        id: 'event-1',
        type: 'event',
        event: 'appStateChange',
        data: { state: 'active' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(eventMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Should use custom deserializer
      expect(customDeserializer).toHaveBeenCalled()
    })

    it('SHOULD call onError when serialization fails in postToNative', () => {
      // GIVEN: Client with custom serializer that throws
      const contract = defineContract({
        web: {
          pathChanged: createMockSchema<{ path: string }>(),
        },
      })

      const onError = vi.fn()
      const badSerializer = vi.fn(() => {
        throw new Error('Serialization failed')
      })

      const client = createWebClient(contract, {
        serializer: badSerializer,
        onError,
      })

      // WHEN: Emitting event with bad serializer
      client.web.emit('pathChanged', { path: '/home' })

      // THEN: onError should be called with serialization error
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Serialization failed')
    })

    it('SHOULD call onError when event handler throws', () => {
      // GIVEN: Client with event handler that throws
      const contract = defineContract({
        native: {
          appStateChange: createMockSchema<{ state: string }>(),
        },
      })

      const onError = vi.fn()
      const client = createWebClient(contract, { onError })

      // Register handler that throws
      const badHandler = vi.fn(() => {
        throw new Error('Event handler error')
      })

      client.native.handle('appStateChange', badHandler)

      // WHEN: Receiving event that causes handler to throw
      const eventMessage = {
        id: 'event-1',
        type: 'event',
        event: 'appStateChange',
        data: { state: 'active' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(eventMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Handler should be called
      expect(badHandler).toHaveBeenCalledWith({ state: 'active' })

      // AND: onError should be called with handler error
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('Event handler error')
    })

    it('SHOULD not post message when not in WebView environment via emit', () => {
      // GIVEN: Setup environment without ReactNativeWebView BEFORE creating client
      // biome-ignore lint/suspicious/noExplicitAny: Test code modifying window global
      const originalReactNativeWebView = (globalThis.window as any).ReactNativeWebView
      // biome-ignore lint/suspicious/noExplicitAny: Test code modifying window global
      // biome-ignore lint/performance/noDelete: Required for testing window global removal
      delete (globalThis.window as any).ReactNativeWebView

      const contract = defineContract({
        web: {
          pathChanged: createMockSchema<{ path: string }>(),
        },
      })

      const client = createWebClient(contract)

      // Clear previous mock calls
      mockPostMessage.mockClear()

      // WHEN: Emitting event
      client.web.emit('pathChanged', { path: '/home' })

      // THEN: Should not attempt to post message
      expect(mockPostMessage).not.toHaveBeenCalled()

      // Restore
      // biome-ignore lint/suspicious/noExplicitAny: Test code restoring window global
      ;(globalThis.window as any).ReactNativeWebView = originalReactNativeWebView
    })

    it('SHOULD not post message when not in WebView environment via handleRequest', async () => {
      // GIVEN: Setup environment without ReactNativeWebView BEFORE creating client
      // biome-ignore lint/suspicious/noExplicitAny: Test code modifying window global
      const originalReactNativeWebView = (globalThis.window as any).ReactNativeWebView
      // biome-ignore lint/suspicious/noExplicitAny: Test code modifying window global
      // biome-ignore lint/performance/noDelete: Required for testing window global removal
      delete (globalThis.window as any).ReactNativeWebView

      const contract = defineContract({
        web: {
          navigate: createProcedureSchema<{ path: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      // Ensure no handlers registered so it tries to send error response
      // Clear previous mock calls
      mockPostMessage.mockClear()

      // WHEN: Receiving request that would normally trigger error response
      const requestMessage = {
        id: 'req-1',
        type: 'request',
        procedure: 'navigate',
        data: { path: '/home' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(requestMessage),
      })
      window.dispatchEvent(messageEvent)

      // Wait for async handling (using Promise.resolve for microtask)
      await Promise.resolve()
      await Promise.resolve()

      // THEN: Should not attempt to post message (postToNative should return early)
      expect(mockPostMessage).not.toHaveBeenCalled()

      // Cleanup
      client.cleanup()

      // Restore
      // biome-ignore lint/suspicious/noExplicitAny: Test code restoring window global
      ;(globalThis.window as any).ReactNativeWebView = originalReactNativeWebView
    })

    it('SHOULD handle response for request when handler sends NO_HANDLER error', async () => {
      // GIVEN: Client with registered event but receives a request
      const contract = defineContract({
        web: {
          navigate: createProcedureSchema<{ path: string }, { success: boolean }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Receiving request for procedure with no handler
      const requestMessage = {
        id: 'req-1',
        type: 'request',
        procedure: 'navigate',
        data: { path: '/home' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(requestMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Should send error response
      await vi.waitFor(() => {
        const responseCall = mockPostMessage.mock.calls.find((call) =>
          call[0].includes('"type":"response"')
        )
        expect(responseCall).toBeDefined()

        // biome-ignore lint/style/noNonNullAssertion: Safe after toBeDefined check
        const responseMessage = JSON.parse(responseCall![0])
        expect(responseMessage).toMatchObject({
          id: 'req-1',
          type: 'response',
          error: {
            message: 'No handler registered for procedure: navigate',
            code: 'NO_HANDLER',
          },
        })
      })

      // Cleanup
      client.cleanup()
    })

    it('SHOULD handle unknown message type gracefully', () => {
      // GIVEN: Client
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      const client = createWebClient(contract)

      // WHEN: Receiving message with unknown type
      const unknownMessage = {
        id: 'unknown-1',
        type: 'unknown-type',
        data: { something: 'random' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(unknownMessage),
      })

      // THEN: Should not throw (gracefully ignores unknown message types)
      expect(() => {
        window.dispatchEvent(messageEvent)
      }).not.toThrow()

      // Cleanup
      client.cleanup()
    })

    it('SHOULD keep event handlers map when unregistering one of multiple handlers', () => {
      // GIVEN: Client with multiple handlers for same event
      const contract = defineContract({
        native: {
          appStateChange: createMockSchema<{ state: string }>(),
        },
      })

      const client = createWebClient(contract)
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const unregister1 = client.native.handle('appStateChange', handler1)
      const unregister2 = client.native.handle('appStateChange', handler2)

      // WHEN: Unregistering only one handler
      unregister1()

      // Send event
      const eventMessage = {
        id: 'event-1',
        type: 'event',
        event: 'appStateChange',
        data: { state: 'active' },
      }

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(eventMessage),
      })
      window.dispatchEvent(messageEvent)

      // THEN: Remaining handler should still be invoked
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledWith({ state: 'active' })

      // Cleanup
      unregister2()
    })
  })
})
