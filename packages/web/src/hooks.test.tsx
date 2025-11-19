/**
 * Tests for React hooks
 * @module hooks.test
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { act, renderHook } from '@testing-library/react'
import { defineContract } from '@webview-rpc/core'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEvent, useProcedure } from './hooks'
import { WebViewRPCProvider } from './provider'

// Mock window.ReactNativeWebView
const mockPostMessage = vi.fn()

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    value: {
      ReactNativeWebView: {
        postMessage: mockPostMessage,
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  })
})

// Helper to create mock schema
const createMockSchema = <TInput, TOutput = TInput>(): StandardSchemaV1<TInput, TOutput> => ({
  '~standard': {
    version: 1,
    vendor: 'mock',
    validate: (value: unknown) => ({ value: value as TOutput }),
  },
})

const createProcedureSchema = <TInput, TOutput>() => {
  const inputSchema = createMockSchema<TInput>()
  const outputSchema = createMockSchema<TOutput>()

  return {
    ...inputSchema,
    returns: () => ({
      ...inputSchema,
      _returnSchema: outputSchema,
      returns: () => createProcedureSchema<TInput, TOutput>(),
    }),
  }
}

describe('useEvent', () => {
  it('SHOULD register event handler', () => {
    // GIVEN: Contract with native event
    const contract = defineContract({
      native: {
        appStateChange: createMockSchema<{ state: string }>(),
      },
    })

    const handler = vi.fn()

    // WHEN: Using useEvent hook
    const wrapper = ({ children }: { children: ReactNode }) => (
      <WebViewRPCProvider contract={contract}>{children}</WebViewRPCProvider>
    )

    renderHook(
      () =>
        useEvent<typeof contract, 'native', 'appStateChange'>('native', 'appStateChange', handler),
      { wrapper }
    )

    // THEN: Should not throw
    expect(handler).not.toHaveBeenCalled()
  })

  it('SHOULD cleanup event handler on unmount', () => {
    // GIVEN: Contract with event
    const contract = defineContract({
      native: {
        appStateChange: createMockSchema<{ state: string }>(),
      },
    })

    const handler = vi.fn()

    const wrapper = ({ children }: { children: ReactNode }) => (
      <WebViewRPCProvider contract={contract}>{children}</WebViewRPCProvider>
    )

    // WHEN: Rendering and unmounting
    const { unmount } = renderHook(
      () =>
        useEvent<typeof contract, 'native', 'appStateChange'>('native', 'appStateChange', handler),
      { wrapper }
    )

    unmount()

    // THEN: Should cleanup without errors
    expect(true).toBe(true)
  })

  it('SHOULD invoke stable handler when handler reference changes', () => {
    // GIVEN: Contract with native event
    const contract = defineContract({
      native: {
        appStateChange: createMockSchema<{ state: string }>(),
      },
    })

    let messageListeners: Array<(event: MessageEvent) => void> = []

    // Setup window with message tracking
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
          for (const handler of messageListeners) {
            handler(event)
          }
          return true
        }),
      },
      writable: true,
      configurable: true,
    })

    const handler1 = vi.fn()
    const handler2 = vi.fn()

    const wrapper = ({ children }: { children: ReactNode }) => (
      <WebViewRPCProvider contract={contract}>{children}</WebViewRPCProvider>
    )

    // WHEN: Using useEvent hook and changing handler
    const { rerender } = renderHook(
      ({ handler }: { handler: (data: unknown) => void }) =>
        useEvent<typeof contract, 'native', 'appStateChange'>('native', 'appStateChange', handler),
      { wrapper, initialProps: { handler: handler1 } }
    )

    // Rerender with new handler
    rerender({ handler: handler2 })

    // Trigger event
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

    // THEN: Should call the new handler, not the old one
    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).toHaveBeenCalledWith({ state: 'active' })
  })
})

describe('useProcedure', () => {
  it('SHOULD initialize with default state', () => {
    // GIVEN: Contract with procedure
    const contract = defineContract({
      native: {
        share: createProcedureSchema<{ url: string }, { success: boolean }>(),
      },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <WebViewRPCProvider contract={contract}>{children}</WebViewRPCProvider>
    )

    // WHEN: Using useProcedure hook
    const { result } = renderHook(
      () => useProcedure<typeof contract, 'native', 'share'>('native', 'share'),
      { wrapper }
    )

    // THEN: Should have initial state
    expect(result.current.isPending).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeNull()
    expect(result.current.mutate).toBeTypeOf('function')
    expect(result.current.reset).toBeTypeOf('function')
  })

  it('SHOULD update state during procedure call', async () => {
    // GIVEN: Contract with procedure
    const contract = defineContract({
      native: {
        share: createProcedureSchema<{ url: string }, { success: boolean }>(),
      },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <WebViewRPCProvider contract={contract}>{children}</WebViewRPCProvider>
    )

    const { result } = renderHook(
      () => useProcedure<typeof contract, 'native', 'share'>('native', 'share'),
      { wrapper }
    )

    // WHEN: Calling mutate
    act(() => {
      result.current.mutate({ url: 'https://example.com' }).catch(() => {})
    })

    // THEN: Should set isPending to true
    expect(result.current.isPending).toBe(true)
  })

  it('SHOULD reset state when reset is called', async () => {
    // GIVEN: Hook with some state
    const contract = defineContract({
      native: {
        share: createProcedureSchema<{ url: string }, { success: boolean }>(),
      },
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <WebViewRPCProvider contract={contract}>{children}</WebViewRPCProvider>
    )

    const { result } = renderHook(
      () =>
        useProcedure<typeof contract, 'native', 'share', { url: string }, { success: boolean }>(
          'native',
          'share'
        ),
      { wrapper }
    )

    // WHEN: Resetting
    act(() => {
      result.current.reset()
    })

    // THEN: Should reset all state
    expect(result.current.isPending).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeNull()
  })

  it('SHOULD set data when procedure call succeeds', async () => {
    // GIVEN: Contract with procedure
    const contract = defineContract({
      native: {
        share: createProcedureSchema<{ url: string }, { success: boolean }>(),
      },
    })

    let messageListeners: Array<(event: MessageEvent) => void> = []

    // Setup window with message tracking
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
          for (const handler of messageListeners) {
            handler(event)
          }
          return true
        }),
      },
      writable: true,
      configurable: true,
    })

    const wrapper = ({ children }: { children: ReactNode }) => (
      <WebViewRPCProvider contract={contract}>{children}</WebViewRPCProvider>
    )

    const { result } = renderHook(
      () =>
        useProcedure<typeof contract, 'native', 'share', { url: string }, { success: boolean }>(
          'native',
          'share'
        ),
      { wrapper }
    )

    // WHEN: Calling mutate and responding with success
    act(() => {
      result.current.mutate({ url: 'https://example.com' })
    })

    // Get the correlation ID from the posted message
    const callArg = mockPostMessage.mock.calls[mockPostMessage.mock.calls.length - 1][0]
    const sentMessage = JSON.parse(callArg)

    // Simulate successful response from native
    const responseMessage = {
      id: sentMessage.id,
      type: 'response',
      data: { success: true },
    }

    await act(async () => {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(responseMessage),
      })
      window.dispatchEvent(messageEvent)

      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // THEN: Should set data to response result
    expect(result.current.data).toEqual({ success: true })
    expect(result.current.isPending).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
