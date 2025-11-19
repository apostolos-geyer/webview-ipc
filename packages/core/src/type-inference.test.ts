/**
 * Type inference integration tests for @webview-rpc/core
 * Tests compile-time type inference using Vitest's expectTypeOf
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { z } from 'zod'
import type {
	InferInput,
	InferOutput,
	InferReturns,
	ProcedureSchema,
	Contract,
} from './types'
import { procedure } from './procedure'
import { defineContract } from './contract'
import type { StandardSchemaV1 } from '@standard-schema/spec'

describe('Type Inference', () => {
	describe('InferInput', () => {
		it('should extract input type from plain Zod schema', () => {
			// GIVEN: A Zod schema with known types
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			})

			// THEN: InferInput should extract the correct input type
			expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<{
				name: string
				age: number
			}>()
		})

		it('should extract input type from ProcedureSchema', () => {
			// GIVEN: A procedure with known input type
			const proc = procedure(z.object({ id: z.number() })).returns(
				z.string(),
			)

			// THEN: InferInput should extract input type
			expectTypeOf<InferInput<typeof proc>>().toEqualTypeOf<{ id: number }>()
		})

		it('should handle simple primitive types', () => {
			// GIVEN: Simple primitive schemas
			const stringSchema = z.string()
			const numberSchema = z.number()
			const booleanSchema = z.boolean()

			// THEN: Should infer primitive types
			expectTypeOf<InferInput<typeof stringSchema>>().toEqualTypeOf<string>()
			expectTypeOf<InferInput<typeof numberSchema>>().toEqualTypeOf<number>()
			expectTypeOf<InferInput<typeof booleanSchema>>().toEqualTypeOf<boolean>()
		})

		it('should handle nested object types', () => {
			// GIVEN: Nested schema
			const schema = z.object({
				user: z.object({
					name: z.string(),
					email: z.string(),
				}),
				metadata: z.object({
					createdAt: z.number(),
				}),
			})

			// THEN: Should infer nested structure
			expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<{
				user: {
					name: string
					email: string
				}
				metadata: {
					createdAt: number
				}
			}>()
		})

		it('should handle array types', () => {
			// GIVEN: Schema with arrays
			const schema = z.object({
				tags: z.array(z.string()),
				counts: z.array(z.number()),
			})

			// THEN: Should infer array types
			expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<{
				tags: string[]
				counts: number[]
			}>()
		})

		it('should handle optional fields', () => {
			// GIVEN: Schema with optional fields
			const schema = z.object({
				required: z.string(),
				optional: z.string().optional(),
			})

			// THEN: Should infer optional correctly
			expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<{
				required: string
				optional?: string
			}>()
		})

		it('should handle union types', () => {
			// GIVEN: Schema with union
			const schema = z.object({
				status: z.union([z.literal('active'), z.literal('inactive')]),
			})

			// THEN: Should infer union
			expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<{
				status: 'active' | 'inactive'
			}>()
		})

		it('should return unknown for non-schema types', () => {
			// GIVEN: Non-schema type
			type NotASchema = { foo: string }

			// THEN: Should return unknown
			expectTypeOf<InferInput<NotASchema>>().toEqualTypeOf<unknown>()
		})
	})

	describe('InferOutput', () => {
		it('should extract output type from plain Zod schema', () => {
			// GIVEN: A Zod schema
			const schema = z.object({
				success: z.boolean(),
				message: z.string(),
			})

			// THEN: InferOutput should extract the correct output type
			expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<{
				success: boolean
				message: string
			}>()
		})

		it('should extract output type from ProcedureSchema input', () => {
			// GIVEN: A procedure (output comes from input schema)
			const proc = procedure(z.object({ id: z.number() })).returns(
				z.string(),
			)

			// THEN: InferOutput extracts from input schema
			expectTypeOf<InferOutput<typeof proc>>().toEqualTypeOf<{ id: number }>()
		})

		it('should handle transformed schemas', () => {
			// GIVEN: Schema with transformation
			const schema = z
				.string()
				.transform((s) => s.length)

			// THEN: Should infer transformed output type
			expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<number>()
		})

		it('should match InferInput for schemas without transforms', () => {
			// GIVEN: Simple schema without transforms
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			})

			// THEN: Input and Output should be same
			expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<
				InferOutput<typeof schema>
			>()
		})

		it('should return unknown for non-schema types', () => {
			// GIVEN: Non-schema type
			type NotASchema = { foo: string }

			// THEN: Should return unknown
			expectTypeOf<InferOutput<NotASchema>>().toEqualTypeOf<unknown>()
		})
	})

	describe('InferReturns', () => {
		it('should extract return type from procedure', () => {
			// GIVEN: Procedure with known return type
			const proc = procedure(z.object({ id: z.number() })).returns(
				z.object({
					success: z.boolean(),
					data: z.string(),
				}),
			)

			// THEN: Should infer return type
			expectTypeOf<InferReturns<typeof proc>>().toEqualTypeOf<{
				success: boolean
				data: string
			}>()
		})

		it('should extract simple return types', () => {
			// GIVEN: Procedures with simple returns
			const stringProc = procedure(z.object({})).returns(z.string())
			const numberProc = procedure(z.object({})).returns(z.number())
			const boolProc = procedure(z.object({})).returns(z.boolean())

			// THEN: Should infer primitives
			expectTypeOf<InferReturns<typeof stringProc>>().toEqualTypeOf<string>()
			expectTypeOf<InferReturns<typeof numberProc>>().toEqualTypeOf<number>()
			expectTypeOf<InferReturns<typeof boolProc>>().toEqualTypeOf<boolean>()
		})

		it('should extract nested return types', () => {
			// GIVEN: Procedure with nested return
			const proc = procedure(z.object({})).returns(
				z.object({
					user: z.object({
						id: z.number(),
						name: z.string(),
					}),
					settings: z.object({
						theme: z.string(),
					}),
				}),
			)

			// THEN: Should infer nested structure
			expectTypeOf<InferReturns<typeof proc>>().toEqualTypeOf<{
				user: {
					id: number
					name: string
				}
				settings: {
					theme: string
				}
			}>()
		})

		it('should extract array return types', () => {
			// GIVEN: Procedure returning array
			const proc = procedure(z.object({})).returns(
				z.array(
					z.object({
						id: z.number(),
						name: z.string(),
					}),
				),
			)

			// THEN: Should infer array type
			expectTypeOf<InferReturns<typeof proc>>().toEqualTypeOf<
				Array<{
					id: number
					name: string
				}>
			>()
		})

		it('should return never for plain Standard Schema', () => {
			// GIVEN: Plain schema without returns
			const schema = z.object({ foo: z.string() })

			// THEN: Should return never (not a procedure)
			expectTypeOf<InferReturns<typeof schema>>().toEqualTypeOf<never>()
		})

		it('should return never for procedure without returns call', () => {
			// GIVEN: Procedure before .returns() is called
			const proc = procedure(z.object({ id: z.number() }))

			// THEN: Should return never (no return schema set)
			expectTypeOf<InferReturns<typeof proc>>().toEqualTypeOf<never>()
		})
	})

	describe('ProcedureSchema generics flow', () => {
		it('should preserve input type through returns method', () => {
			// GIVEN: Procedure with specific input
			const inputSchema = z.object({ userId: z.string() })
			const proc = procedure(inputSchema)

			// THEN: Input type should flow through
			expectTypeOf<InferInput<typeof proc>>().toEqualTypeOf<{
				userId: string
			}>()
		})

		it('should flow output type through returns method', () => {
			// GIVEN: Procedure with returns called
			const proc = procedure(z.object({ id: z.number() })).returns(
				z.object({ name: z.string() }),
			)

			// THEN: Return type should be set
			expectTypeOf<InferReturns<typeof proc>>().toEqualTypeOf<{
				name: string
			}>()
		})

		it('should maintain both input and output types', () => {
			// GIVEN: Complete procedure
			const proc = procedure(
				z.object({ userId: z.string(), count: z.number() }),
			).returns(z.object({ success: z.boolean() }))

			// THEN: Both should be preserved
			expectTypeOf<InferInput<typeof proc>>().toEqualTypeOf<{
				userId: string
				count: number
			}>()
			expectTypeOf<InferReturns<typeof proc>>().toEqualTypeOf<{
				success: boolean
			}>()
		})

		it('should allow chaining returns multiple times', () => {
			// GIVEN: Procedure with multiple returns calls
			const base = procedure(z.object({ id: z.number() }))
			const withReturn1 = base.returns(z.string())
			const withReturn2 = withReturn1.returns(z.boolean())

			// THEN: Last return should win
			expectTypeOf<InferReturns<typeof withReturn2>>().toEqualTypeOf<
				boolean
			>()
		})
	})

	describe('defineContract type preservation', () => {
		it('should preserve web procedure types', () => {
			// GIVEN: Contract with web procedures
			const contract = defineContract({
				web: {
					navigate: procedure(z.object({ path: z.string() })).returns(
						z.object({ success: z.boolean() }),
					),
					getUserData: procedure(z.object({ userId: z.string() })).returns(
						z.object({
							name: z.string(),
							email: z.string(),
						}),
					),
				},
			})

			// THEN: Should preserve procedure types
			type NavInput = InferInput<typeof contract.web.navigate>
			type NavReturn = InferReturns<typeof contract.web.navigate>

			expectTypeOf<NavInput>().toEqualTypeOf<{ path: string }>()
			expectTypeOf<NavReturn>().toEqualTypeOf<{ success: boolean }>()
		})

		it('should preserve native procedure types', () => {
			// GIVEN: Contract with native procedures
			const contract = defineContract({
				native: {
					share: procedure(
						z.object({ url: z.string(), title: z.string() }),
					).returns(z.object({ success: z.boolean() })),
				},
			})

			// THEN: Should preserve types
			type ShareInput = InferInput<typeof contract.native.share>
			type ShareReturn = InferReturns<typeof contract.native.share>

			expectTypeOf<ShareInput>().toEqualTypeOf<{
				url: string
				title: string
			}>()
			expectTypeOf<ShareReturn>().toEqualTypeOf<{ success: boolean }>()
		})

		it('should preserve event types', () => {
			// GIVEN: Contract with events (no returns)
			const contract = defineContract({
				web: {
					pathChanged: z.object({ path: z.string(), timestamp: z.number() }),
				},
			})

			// THEN: Should infer event data type
			type EventData = InferInput<typeof contract.web.pathChanged>
			expectTypeOf<EventData>().toEqualTypeOf<{
				path: string
				timestamp: number
			}>()
		})

		it('should preserve mixed procedures and events', () => {
			// GIVEN: Contract with both
			const contract = defineContract({
				web: {
					// Procedure
					navigate: procedure(z.object({ path: z.string() })).returns(
						z.boolean(),
					),
					// Event
					pathChanged: z.object({ path: z.string() }),
				},
			})

			// THEN: Both should be correctly typed
			type NavInput = InferInput<typeof contract.web.navigate>
			type NavReturn = InferReturns<typeof contract.web.navigate>
			type EventData = InferInput<typeof contract.web.pathChanged>

			expectTypeOf<NavInput>().toEqualTypeOf<{ path: string }>()
			expectTypeOf<NavReturn>().toEqualTypeOf<boolean>()
			expectTypeOf<EventData>().toEqualTypeOf<{ path: string }>()
		})

		it('should preserve types across both web and native', () => {
			// GIVEN: Contract with both sides
			const contract = defineContract({
				web: {
					navigate: procedure(z.object({ path: z.string() })).returns(
						z.boolean(),
					),
				},
				native: {
					share: procedure(z.object({ url: z.string() })).returns(z.boolean()),
				},
			})

			// THEN: Both sides should have correct types
			type WebInput = InferInput<typeof contract.web.navigate>
			type NativeInput = InferInput<typeof contract.native.share>

			expectTypeOf<WebInput>().toEqualTypeOf<{ path: string }>()
			expectTypeOf<NativeInput>().toEqualTypeOf<{ url: string }>()
		})

		it('should allow extracting contract type', () => {
			// GIVEN: A defined contract
			const contract = defineContract({
				web: {
					test: procedure(z.object({ id: z.number() })).returns(z.string()),
				},
			})

			// THEN: Type can be extracted
			type AppContract = typeof contract
			expectTypeOf<AppContract>().toMatchTypeOf<Contract>()
		})
	})

	describe('Complex real-world scenarios', () => {
		it('should handle full navigation contract', () => {
			// GIVEN: Real-world navigation contract
			const contract = defineContract({
				web: {
					// Procedures
					navigate: procedure(
						z.object({
							path: z.string(),
							params: z.record(z.string()).optional(),
						}),
					).returns(z.object({ success: z.boolean() })),

					goBack: procedure(z.object({})).returns(z.boolean()),

					getCurrentPath: procedure(z.object({})).returns(z.string()),

					// Events
					pathChanged: z.object({
						path: z.string(),
						timestamp: z.number(),
					}),

					navigationError: z.object({
						message: z.string(),
						code: z.string(),
					}),
				},
			})

			// THEN: All types should be correctly inferred
			type NavigateInput = InferInput<typeof contract.web.navigate>
			type NavigateReturn = InferReturns<typeof contract.web.navigate>
			type GoBackReturn = InferReturns<typeof contract.web.goBack>
			type PathChangedData = InferInput<typeof contract.web.pathChanged>

			expectTypeOf<NavigateInput>().toEqualTypeOf<{
				path: string
				params?: Record<string, string>
			}>()
			expectTypeOf<NavigateReturn>().toEqualTypeOf<{ success: boolean }>()
			expectTypeOf<GoBackReturn>().toEqualTypeOf<boolean>()
			expectTypeOf<PathChangedData>().toEqualTypeOf<{
				path: string
				timestamp: number
			}>()
		})

		it('should handle full native features contract', () => {
			// GIVEN: Real-world native contract
			const contract = defineContract({
				native: {
					// Sharing
					share: procedure(
						z.object({
							url: z.string(),
							title: z.string().optional(),
							message: z.string().optional(),
						}),
					).returns(z.object({ success: z.boolean() })),

					// Camera
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

					// Haptics
					haptic: procedure(
						z.object({
							type: z.union([
								z.literal('light'),
								z.literal('medium'),
								z.literal('heavy'),
							]),
						}),
					).returns(z.object({ success: z.boolean() })),

					// Events
					appStateChange: z.object({
						state: z.union([
							z.literal('active'),
							z.literal('background'),
							z.literal('inactive'),
						]),
					}),
				},
			})

			// THEN: All native types should be correct
			type ShareInput = InferInput<typeof contract.native.share>
			type CameraReturn = InferReturns<typeof contract.native.openCamera>
			type HapticInput = InferInput<typeof contract.native.haptic>
			type AppStateData = InferInput<typeof contract.native.appStateChange>

			expectTypeOf<ShareInput>().toEqualTypeOf<{
				url: string
				title?: string
				message?: string
			}>()
			expectTypeOf<CameraReturn>().toEqualTypeOf<{
				uri: string
				width: number
				height: number
			}>()
			expectTypeOf<HapticInput>().toEqualTypeOf<{
				type: 'light' | 'medium' | 'heavy'
			}>()
			expectTypeOf<AppStateData>().toEqualTypeOf<{
				state: 'active' | 'background' | 'inactive'
			}>()
		})

		it('should handle bidirectional contract', () => {
			// GIVEN: Contract with both directions
			const contract = defineContract({
				web: {
					navigate: procedure(z.object({ path: z.string() })).returns(
						z.boolean(),
					),
					pathChanged: z.object({ path: z.string() }),
				},
				native: {
					share: procedure(z.object({ url: z.string() })).returns(
						z.boolean(),
					),
					shareComplete: z.object({ success: z.boolean() }),
				},
			})

			// THEN: Types should flow correctly in both directions
			type WebProcedure = InferInput<typeof contract.web.navigate>
			type WebEvent = InferInput<typeof contract.web.pathChanged>
			type NativeProcedure = InferInput<typeof contract.native.share>
			type NativeEvent = InferInput<typeof contract.native.shareComplete>

			expectTypeOf<WebProcedure>().toEqualTypeOf<{ path: string }>()
			expectTypeOf<WebEvent>().toEqualTypeOf<{ path: string }>()
			expectTypeOf<NativeProcedure>().toEqualTypeOf<{ url: string }>()
			expectTypeOf<NativeEvent>().toEqualTypeOf<{ success: boolean }>()
		})
	})

	describe('Negative tests - compile errors', () => {
		it('should error when using InferReturns on non-procedure', () => {
			// GIVEN: Plain schema (event)
			const event = z.object({ data: z.string() })

			// THEN: InferReturns should return never
			expectTypeOf<InferReturns<typeof event>>().toEqualTypeOf<never>()
		})

		it('should error when contract has neither web nor native', () => {
			// This test validates TypeScript catches the error at compile time
			// and runtime throws as expected

			// @ts-expect-error - Contract must have web or native
			expect(() => defineContract({})).toThrow(
				'Contract must define at least one of: web, native',
			)
		})

		it('should not allow invalid schema types', () => {
			// Type-level validation that non-schemas return unknown
			type NotASchema = { random: 'object' }
			expectTypeOf<InferInput<NotASchema>>().toEqualTypeOf<unknown>()
			expectTypeOf<InferOutput<NotASchema>>().toEqualTypeOf<unknown>()
			expectTypeOf<InferReturns<NotASchema>>().toEqualTypeOf<never>()
		})
	})

	describe('Runtime validation with type inference', () => {
		it('should validate procedure has correct runtime structure', () => {
			// GIVEN: A procedure
			const proc = procedure(z.object({ id: z.number() })).returns(
				z.string(),
			)

			// THEN: Should have Standard Schema structure
			expect(proc).toHaveProperty('~standard')
			expect(proc['~standard']).toHaveProperty('version', 1)
			expect(proc).toHaveProperty('returns')
			expect(typeof proc.returns).toBe('function')
			expect(proc).toHaveProperty('_returnSchema')
		})

		it('should validate contract preserves schemas', () => {
			// GIVEN: A contract
			const navigateSchema = procedure(z.object({ path: z.string() })).returns(
				z.boolean(),
			)
			const contract = defineContract({
				web: {
					navigate: navigateSchema,
				},
			})

			// THEN: Should preserve exact schema reference
			expect(contract.web.navigate).toBe(navigateSchema)
		})

		it('should validate Zod schemas are Standard Schema v1 compliant', () => {
			// GIVEN: Zod schema
			const zodSchema = z.object({ name: z.string() })

			// THEN: Should have Standard Schema marker
			expect(zodSchema).toHaveProperty('~standard')
			expect(zodSchema['~standard']).toHaveProperty('version', 1)
			expect(zodSchema['~standard']).toHaveProperty('vendor', 'zod')
			expect(zodSchema['~standard']).toHaveProperty('validate')
			expect(typeof zodSchema['~standard'].validate).toBe('function')
		})

		it('should validate type information exists on Zod schemas', () => {
			// GIVEN: Zod schema
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			})

			// THEN: Standard Schema should have types for TypeScript inference
			// Note: Zod's Standard Schema implementation provides types via TypeScript
			// generics, not as runtime properties
			expect(schema['~standard']).toBeDefined()
			expect(schema['~standard'].vendor).toBe('zod')

			// Type-level validation that types exist
			type SchemaTypes = NonNullable<typeof schema['~standard']['types']>
			expectTypeOf<SchemaTypes>().toMatchTypeOf<{
				input: { name: string; age: number }
				output: { name: string; age: number }
			}>()
		})
	})
})
