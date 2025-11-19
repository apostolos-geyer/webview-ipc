/**
 * Tests for React hooks
 */

import type { Contract } from '@webview-rpc/core'
import { renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import type { WebView } from 'react-native-webview'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNativeClient } from './client'
import { useEvent, useNativeClient } from './hooks'

describe('useNativeClient', () => {
	let mockWebViewRef: RefObject<WebView>
	let mockWebView: Partial<WebView>
	let mockContract: Contract

	beforeEach(() => {
		// Create mock WebView
		mockWebView = {
			postMessage: vi.fn(),
		}

		mockWebViewRef = {
			current: mockWebView as WebView,
		}

		mockContract = {
			web: {
				navigate: {
					'~standard': { version: 1 },
					returns: vi.fn(),
					_returnSchema: {
						'~standard': { version: 1 },
					},
				},
			},
			native: {},
		}
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('initialization', () => {
		it('should create client on mount', () => {
			// GIVEN: Hook with webViewRef and contract
			const { result } = renderHook(() =>
				useNativeClient({
					webViewRef: mockWebViewRef,
					contract: mockContract,
				})
			)

			// THEN: Should return client with expected API
			expect(result.current).toBeDefined()
			expect(result.current.web).toBeDefined()
			expect(result.current.native).toBeDefined()
			expect(result.current.cleanup).toBeDefined()
		})

		it('should create client with all options', () => {
			// GIVEN: Hook with all options
			const onError = vi.fn()
			const { result } = renderHook(() =>
				useNativeClient({
					webViewRef: mockWebViewRef,
					contract: mockContract,
					timeout: 10000,
					serializer: JSON.stringify,
					deserializer: JSON.parse,
					onError,
				})
			)

			// THEN: Should return client
			expect(result.current).toBeDefined()
		})
	})

	describe('memoization', () => {
		it('should memoize client instance between renders with same options object', () => {
			// GIVEN: Hook renders with same options
			const options = {
				webViewRef: mockWebViewRef,
				contract: mockContract,
			}

			const { result, rerender } = renderHook(() => useNativeClient(options))
			const firstClient = result.current

			// WHEN: Re-render
			rerender()

			// THEN: Should return same client instance
			expect(result.current).toBe(firstClient)
		})

		it('should recreate client when options object changes', () => {
			// GIVEN: Hook with initial options
			const { result, rerender } = renderHook(
				({ opts }) => useNativeClient(opts),
				{
					initialProps: {
						opts: {
							webViewRef: mockWebViewRef,
							contract: mockContract,
						},
					},
				}
			)
			const firstClient = result.current

			// WHEN: Re-render with different options object
			rerender({
				opts: {
					webViewRef: mockWebViewRef,
					contract: mockContract,
					timeout: 10000,
				},
			})

			// THEN: Should create new client
			expect(result.current).not.toBe(firstClient)
		})
	})

	describe('cleanup', () => {
		it('should cleanup on unmount', () => {
			// GIVEN: Mounted hook
			const { result, unmount } = renderHook(() =>
				useNativeClient({
					webViewRef: mockWebViewRef,
					contract: mockContract,
				})
			)

			const cleanupSpy = vi.spyOn(result.current, 'cleanup')

			// WHEN: Unmount
			unmount()

			// THEN: Should call cleanup
			expect(cleanupSpy).toHaveBeenCalled()
		})

		it('should cleanup pending requests on unmount', async () => {
			// GIVEN: Client with pending request
			const { result, unmount } = renderHook(() =>
				useNativeClient({
					webViewRef: mockWebViewRef,
					contract: mockContract,
				})
			)

			const promise = result.current.web.call('navigate', {})

			// WHEN: Unmount before request completes
			unmount()

			// THEN: Pending request should be rejected
			await expect(promise).rejects.toThrow('Client cleanup called')
		})
	})
})

describe('useEvent', () => {
	let mockWebViewRef: RefObject<WebView>
	let mockWebView: Partial<WebView>
	let mockContract: Contract

	beforeEach(() => {
		mockWebView = {
			postMessage: vi.fn(),
		}

		mockWebViewRef = {
			current: mockWebView as WebView,
		}

		mockContract = {
			web: {
				pathChanged: {
					'~standard': { version: 1 },
				},
			},
			native: {
				appStateChange: {
					'~standard': { version: 1 },
				},
			},
		}
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('event registration', () => {
		it('should register and call handler when event is received', () => {
			// GIVEN: Client and event handler
			const client = createNativeClient({
				webViewRef: mockWebViewRef,
				contract: mockContract,
			})

			const handler = vi.fn()

			// WHEN: useEvent hook registers handler
			renderHook(() => useEvent(client, 'web', 'pathChanged', handler))

			// Simulate incoming event
			const event = {
				nativeEvent: {
					data: JSON.stringify({
						type: 'event',
						event: 'pathChanged',
						data: { path: '/test' },
						id: 'test-id',
						timestamp: Date.now(),
					}),
				},
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test needs to access internal handleMessage method
		;(client as any).handleMessage(event)

			// THEN: Handler should be called
			expect(handler).toHaveBeenCalledWith({ path: '/test' })
		})

		it('should register handler for native side events', () => {
			// GIVEN: Client and native event handler
			const client = createNativeClient({
				webViewRef: mockWebViewRef,
				contract: mockContract,
			})

			const handler = vi.fn()

			// WHEN: useEvent hook registers native handler
			renderHook(() => useEvent(client, 'native', 'appStateChange', handler))

			// Simulate incoming event
			const event = {
				nativeEvent: {
					data: JSON.stringify({
						type: 'event',
						event: 'appStateChange',
						data: { state: 'active' },
						id: 'test-id',
						timestamp: Date.now(),
					}),
				},
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test needs to access internal handleMessage method
		;(client as any).handleMessage(event)

			// THEN: Handler should be called
			expect(handler).toHaveBeenCalledWith({ state: 'active' })
		})
	})

	describe('cleanup', () => {
		it('should unregister handler on unmount', () => {
			// GIVEN: Client with registered handler
			const client = createNativeClient({
				webViewRef: mockWebViewRef,
				contract: mockContract,
			})

			const handler = vi.fn()

			// WHEN: Hook is mounted then unmounted
			const { unmount } = renderHook(() =>
				useEvent(client, 'web', 'pathChanged', handler)
			)
			unmount()

			// Simulate event after unmount
			const event = {
				nativeEvent: {
					data: JSON.stringify({
						type: 'event',
						event: 'pathChanged',
						data: { path: '/test' },
						id: 'test-id',
						timestamp: Date.now(),
					}),
				},
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test needs to access internal handleMessage method
		;(client as any).handleMessage(event)

			// THEN: Handler should NOT be called
			expect(handler).not.toHaveBeenCalled()
		})
	})

	describe('handler updates', () => {
		it('should use latest handler when handler changes', () => {
			// GIVEN: Client with initial handler
			const client = createNativeClient({
				webViewRef: mockWebViewRef,
				contract: mockContract,
			})

			const handler1 = vi.fn()

			// WHEN: Hook renders with first handler
			const { rerender } = renderHook(
				({ h }) => useEvent(client, 'web', 'pathChanged', h),
				{
					initialProps: { h: handler1 },
				}
			)

			// Simulate event
			let event = {
				nativeEvent: {
					data: JSON.stringify({
						type: 'event',
						event: 'pathChanged',
						data: { path: '/first' },
						id: 'test-id-1',
						timestamp: Date.now(),
					}),
				},
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test needs to access internal handleMessage method
		;(client as any).handleMessage(event)

			expect(handler1).toHaveBeenCalledWith({ path: '/first' })

			// WHEN: Handler changes
			const handler2 = vi.fn()
			rerender({ h: handler2 })

			// Simulate another event
			event = {
				nativeEvent: {
					data: JSON.stringify({
						type: 'event',
						event: 'pathChanged',
						data: { path: '/second' },
						id: 'test-id-2',
						timestamp: Date.now(),
					}),
				},
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test needs to access internal handleMessage method
		;(client as any).handleMessage(event)

			// THEN: New handler should be called
			expect(handler2).toHaveBeenCalledWith({ path: '/second' })
			expect(handler1).toHaveBeenCalledTimes(1)
		})
	})

	describe('multiple handlers', () => {
		it('should allow multiple handlers for same event', () => {
			// GIVEN: Client with multiple handlers for same event
			const client = createNativeClient({
				webViewRef: mockWebViewRef,
				contract: mockContract,
			})

			const handler1 = vi.fn()
			const handler2 = vi.fn()

			// WHEN: Register two handlers
			renderHook(() => useEvent(client, 'web', 'pathChanged', handler1))
			renderHook(() => useEvent(client, 'web', 'pathChanged', handler2))

			// Simulate event
			const event = {
				nativeEvent: {
					data: JSON.stringify({
						type: 'event',
						event: 'pathChanged',
						data: { path: '/test' },
						id: 'test-id',
						timestamp: Date.now(),
					}),
				},
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test needs to access internal handleMessage method
		;(client as any).handleMessage(event)

			// THEN: Both handlers should be called
			expect(handler1).toHaveBeenCalledWith({ path: '/test' })
			expect(handler2).toHaveBeenCalledWith({ path: '/test' })
		})
	})

	describe('dependency changes', () => {
		it('should re-register when dependencies change', () => {
			// GIVEN: Client with handler
			const client = createNativeClient({
				webViewRef: mockWebViewRef,
				contract: mockContract,
			})

			const handler = vi.fn()

			// WHEN: Event name changes
			const { rerender } = renderHook(
				// biome-ignore lint/suspicious/noExplicitAny: Test needs to dynamically change event name
			({ eventName }) => useEvent(client, 'web', eventName as any, handler),
				{
					initialProps: { eventName: 'pathChanged' },
				}
			)

			// Trigger first event
			let event = {
				nativeEvent: {
					data: JSON.stringify({
						type: 'event',
						event: 'pathChanged',
						data: { path: '/first' },
						id: 'test-id-1',
						timestamp: Date.now(),
					}),
				},
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test needs to access internal handleMessage method
		;(client as any).handleMessage(event)

			expect(handler).toHaveBeenCalledWith({ path: '/first' })
			handler.mockClear()

			// Change event name - this tests the dependency array works
			rerender({ eventName: 'pathChanged' })

			// Old event should still work because we didn't actually change the name
			event = {
				nativeEvent: {
					data: JSON.stringify({
						type: 'event',
						event: 'pathChanged',
						data: { path: '/second' },
						id: 'test-id-2',
						timestamp: Date.now(),
					}),
				},
			}
			// biome-ignore lint/suspicious/noExplicitAny: Test needs to access internal handleMessage method
		;(client as any).handleMessage(event)

			expect(handler).toHaveBeenCalledWith({ path: '/second' })
		})
	})
})
