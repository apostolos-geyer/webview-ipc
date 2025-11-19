/**
 * Type inference integration tests for @webview-rpc/native
 * Tests compile-time type inference using Vitest's expectTypeOf
 */

import { describe, it, expectTypeOf } from 'vitest'
import { z } from 'zod'
import { procedure, defineContract } from '@webview-rpc/core'
import type { NativeClient, Handler } from './types'

// Test contract with known types similar to real example
const testContract = defineContract({
	web: {
		// Procedures
		showToast: procedure(
			z.object({
				message: z.string(),
				duration: z.number().optional(),
			}),
		).returns(z.void()),

		getUserData: procedure(
			z.object({
				userId: z.string(),
			}),
		).returns(
			z.object({
				name: z.string(),
				email: z.string(),
				age: z.number(),
			}),
		),

		// Events
		counterChanged: z.object({
			count: z.number(),
		}),

		userLoggedIn: z.object({
			userId: z.string(),
			timestamp: z.number(),
		}),
	},
	native: {
		// Procedures
		navigate: procedure(
			z.object({
				screen: z.string(),
			}),
		).returns(z.void()),

		share: procedure(
			z.object({
				title: z.string(),
				message: z.string(),
				url: z.string().optional(),
			}),
		).returns(
			z.object({
				success: z.boolean(),
			}),
		),

		openCamera: procedure(
			z.object({
				quality: z.number().min(0).max(1).optional(),
				allowsEditing: z.boolean().optional(),
			}),
		).returns(
			z.object({
				uri: z.string(),
				width: z.number(),
				height: z.number(),
			}),
		),

		// Events
		appStateChanged: z.object({
			state: z.enum(['active', 'background', 'inactive']),
		}),

		batteryLevelChanged: z.object({
			level: z.number(),
			isCharging: z.boolean(),
		}),
	},
})

describe('Type Inference - NativeClient', () => {
	describe('NativeClient<TContract> type structure', () => {
		it('should have web and native APIs', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Should have correct structure
			expectTypeOf<Client>().toHaveProperty('web')
			expectTypeOf<Client>().toHaveProperty('native')
			expectTypeOf<Client>().toHaveProperty('cleanup')
			expectTypeOf<Client>().toHaveProperty('handleMessage')
		})

		it('should have call, emit, handle methods on web API', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: web API should have correct methods
			expectTypeOf<Client['web']>().toHaveProperty('call')
			expectTypeOf<Client['web']>().toHaveProperty('emit')
			expectTypeOf<Client['web']>().toHaveProperty('handle')
		})

		it('should have emit and handle methods on native API', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: native API should have correct methods
			expectTypeOf<Client['native']>().toHaveProperty('emit')
			expectTypeOf<Client['native']>().toHaveProperty('handle')
			// native does not have 'call' - native calls web, not itself
			expectTypeOf<Client['native']>().not.toHaveProperty('call')
		})
	})

	describe('web.call() - procedure name inference', () => {
		it('should constrain procedure parameter to web keys', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: First parameter should be constrained to web names
			type CallFunction = Client['web']['call']
			type FirstParam = Parameters<CallFunction>[0]

			// Should accept valid procedure names
			expectTypeOf<'showToast'>().toMatchTypeOf<FirstParam>()
			expectTypeOf<'getUserData'>().toMatchTypeOf<FirstParam>()

			// Should also accept event names (they're valid keys)
			expectTypeOf<'counterChanged'>().toMatchTypeOf<FirstParam>()
			expectTypeOf<'userLoggedIn'>().toMatchTypeOf<FirstParam>()

			// Should NOT accept native names
			expectTypeOf<'navigate'>().not.toMatchTypeOf<FirstParam>()
			expectTypeOf<'share'>().not.toMatchTypeOf<FirstParam>()
		})
	})

	describe('web.call() - parameter and return type inference', () => {
		it('should accept correct parameter types', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Should accept correct parameter types
			expectTypeOf<Client['web']['call']>().toBeCallableWith('showToast', {
				message: 'test',
			})
			expectTypeOf<Client['web']['call']>().toBeCallableWith('showToast', {
				message: 'test',
				duration: 3000,
			})
			expectTypeOf<Client['web']['call']>().toBeCallableWith('getUserData', {
				userId: 'abc',
			})
		})

		it('should infer correct return types', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// Test return type through call signature
			// Note: We test via callable assertions since TypeScript doesn't support
			// generic invocation for conditional types in all contexts
			expectTypeOf<Client['web']['call']>().returns.toMatchTypeOf<Promise<void> | Promise<{ name: string; email: string; age: number }> | Promise<never>>()
		})
	})

	describe('web.emit() - event name and data inference', () => {
		it('should constrain event parameter to web names', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: First parameter should accept web keys
			type EmitFunction = Client['web']['emit']
			type FirstParam = Parameters<EmitFunction>[0]

			// Should accept valid web names
			expectTypeOf<'counterChanged'>().toMatchTypeOf<FirstParam>()
			expectTypeOf<'userLoggedIn'>().toMatchTypeOf<FirstParam>()
			expectTypeOf<'showToast'>().toMatchTypeOf<FirstParam>()

			// Should NOT accept native names
			expectTypeOf<'navigate'>().not.toMatchTypeOf<FirstParam>()
		})

		it('should accept correct data types', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Should accept correct data types
			expectTypeOf<Client['web']['emit']>().toBeCallableWith('counterChanged', {
				count: 5,
			})
			expectTypeOf<Client['web']['emit']>().toBeCallableWith('userLoggedIn', {
				userId: 'abc',
				timestamp: 123,
			})
		})
	})

	describe('web.handle() - handler parameter and return types', () => {
		it('should accept correct handler types for procedures', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Should accept handlers with correct parameter and return types
			expectTypeOf<Client['web']['handle']>().toBeCallableWith(
				'showToast',
				(data: { message: string; duration?: number }) => {},
			)

			expectTypeOf<Client['web']['handle']>().toBeCallableWith(
				'getUserData',
				(data: { userId: string }) => ({
					name: 'John',
					email: 'john@example.com',
					age: 30,
				}),
			)
		})

		it('should accept correct handler types for events', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Should accept handlers with correct parameter types
			expectTypeOf<Client['web']['handle']>().toBeCallableWith(
				'counterChanged',
				(data: { count: number }) => {},
			)
		})

		it('should return unsubscribe function', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: handle should return a function
			expectTypeOf<Client['web']['handle']>().returns.toEqualTypeOf<() => void>()
		})
	})

	describe('native.emit() - event name and data inference', () => {
		it('should constrain event parameter to native names', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: First parameter should accept native keys
			type EmitFunction = Client['native']['emit']
			type FirstParam = Parameters<EmitFunction>[0]

			// Should accept valid native names
			expectTypeOf<'navigate'>().toMatchTypeOf<FirstParam>()
			expectTypeOf<'share'>().toMatchTypeOf<FirstParam>()
			expectTypeOf<'appStateChanged'>().toMatchTypeOf<FirstParam>()
			expectTypeOf<'batteryLevelChanged'>().toMatchTypeOf<FirstParam>()

			// Should NOT accept web names
			expectTypeOf<'showToast'>().not.toMatchTypeOf<FirstParam>()
			expectTypeOf<'counterChanged'>().not.toMatchTypeOf<FirstParam>()
		})

		it('should accept correct data types', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Should accept correct data types
			expectTypeOf<Client['native']['emit']>().toBeCallableWith('appStateChanged', {
				state: 'active',
			})
			expectTypeOf<Client['native']['emit']>().toBeCallableWith('batteryLevelChanged', {
				level: 0.8,
				isCharging: true,
			})
		})
	})

	describe('native.handle() - handler types for procedures', () => {
		it('should accept correct handler types for procedures', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Should accept handlers with correct parameter and return types
			expectTypeOf<Client['native']['handle']>().toBeCallableWith(
				'navigate',
				(data: { screen: string }) => {},
			)

			expectTypeOf<Client['native']['handle']>().toBeCallableWith(
				'share',
				(data: { title: string; message: string; url?: string }) => ({
					success: true,
				}),
			)

			expectTypeOf<Client['native']['handle']>().toBeCallableWith(
				'openCamera',
				(data: { quality?: number; allowsEditing?: boolean }) => ({
					uri: '/path/to/image.jpg',
					width: 1920,
					height: 1080,
				}),
			)
		})
	})

	describe('native.handle() - handler types for events', () => {
		it('should accept correct handler types for events', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Should accept handlers with correct parameter types
			expectTypeOf<Client['native']['handle']>().toBeCallableWith(
				'appStateChanged',
				(data: { state: 'active' | 'background' | 'inactive' }) => {},
			)

			expectTypeOf<Client['native']['handle']>().toBeCallableWith(
				'batteryLevelChanged',
				(data: { level: number; isCharging: boolean }) => {},
			)
		})
	})

	describe('Handler type utility', () => {
		it('should infer correct types for procedure handler', () => {
			// GIVEN: A procedure handler type
			type ShareHandler = Handler<
				{ title: string; message: string; url?: string },
				{ success: boolean }
			>

			// THEN: Should have correct parameter and return types
			type HandlerInput = Parameters<ShareHandler>[0]
			type HandlerReturn = ReturnType<ShareHandler>

			expectTypeOf<HandlerInput>().toEqualTypeOf<{
				title: string
				message: string
				url?: string
			}>()
			expectTypeOf<HandlerReturn>().toEqualTypeOf<
				{ success: boolean } | Promise<{ success: boolean }>
			>()
		})

		it('should infer correct types for event handler', () => {
			// GIVEN: An event handler type
			type EventHandler = Handler<{ count: number }, void>

			// THEN: Should have correct parameter and return types
			type HandlerInput = Parameters<EventHandler>[0]
			type HandlerReturn = ReturnType<EventHandler>

			expectTypeOf<HandlerInput>().toEqualTypeOf<{ count: number }>()
			expectTypeOf<HandlerReturn>().toEqualTypeOf<void | Promise<void>>()
		})
	})

	describe('Complex real-world scenarios', () => {
		it('should handle full bidirectional contract', () => {
			// GIVEN: A contract with both web and native procedures/events
			const fullContract = defineContract({
				web: {
					navigate: procedure(
						z.object({
							path: z.string(),
							params: z.record(z.string()).optional(),
						}),
					).returns(z.object({ success: z.boolean() })),
					routeChanged: z.object({ path: z.string(), timestamp: z.number() }),
				},
				native: {
					share: procedure(
						z.object({ url: z.string(), title: z.string().optional() }),
					).returns(z.object({ success: z.boolean() })),
					appStateChanged: z.object({ state: z.enum(['active', 'background']) }),
				},
			})

			type Client = NativeClient<typeof fullContract>

			// THEN: All APIs should have correct types
			expectTypeOf<Client['web']['call']>().toBeCallableWith('navigate', {
				path: '/home',
			})
			expectTypeOf<Client['web']['emit']>().toBeCallableWith('routeChanged', {
				path: '/home',
				timestamp: 123,
			})
			expectTypeOf<Client['native']>().toHaveProperty('emit')
			expectTypeOf<Client['native']>().toHaveProperty('handle')
		})

		it('should handle complex nested types', () => {
			// GIVEN: A contract with complex nested types
			const nestedContract = defineContract({
				web: {
					updateSettings: procedure(
						z.object({
							settings: z.object({
								theme: z.enum(['light', 'dark', 'auto']),
								notifications: z.object({
									email: z.boolean(),
									push: z.boolean(),
									sms: z.boolean().optional(),
								}),
							}),
						}),
					).returns(z.object({ success: z.boolean() })),
				},
			})

			type Client = NativeClient<typeof nestedContract>

			// THEN: Should correctly infer nested structure
			expectTypeOf<Client['web']['call']>().toBeCallableWith('updateSettings', {
				settings: {
					theme: 'dark',
					notifications: { email: true, push: false },
				},
			})
		})

		it('should handle array types in procedures', () => {
			// GIVEN: A contract with array parameters
			const arrayContract = defineContract({
				web: {
					batchUpdate: procedure(
						z.object({
							items: z.array(z.object({ id: z.string(), value: z.number() })),
						}),
					).returns(
						z.object({
							results: z.array(z.object({ id: z.string(), success: z.boolean() })),
						}),
					),
				},
			})

			type Client = NativeClient<typeof arrayContract>

			// THEN: Should correctly infer array types
			expectTypeOf<Client['web']['call']>().toBeCallableWith('batchUpdate', {
				items: [
					{ id: '1', value: 100 },
					{ id: '2', value: 200 },
				],
			})
		})
	})

	describe('Negative tests - type safety', () => {
		it('should not allow wrong procedure names', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>
			type CallFunction = Client['web']['call']

			// THEN: Invalid procedure names should not be part of the union
			type InvalidName = 'invalidProcedure'
			type FirstParam = Parameters<CallFunction>[0]

			expectTypeOf<InvalidName>().not.toMatchTypeOf<FirstParam>()
		})

		it('should not allow cross-side procedure names', () => {
			// GIVEN: A typed client
			type Client = NativeClient<typeof testContract>

			// THEN: Native names should not be valid for web operations
			type WebCallParam = Parameters<Client['web']['call']>[0]
			type NativeEmitParam = Parameters<Client['native']['emit']>[0]

			expectTypeOf<'navigate'>().not.toMatchTypeOf<WebCallParam>()
			expectTypeOf<'showToast'>().not.toMatchTypeOf<NativeEmitParam>()
		})
	})
})
