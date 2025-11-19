import { describe, it, expect, expectTypeOf } from 'vitest'
import type {
	MessageType,
	RequestMessage,
	ResponseMessage,
	EventMessage,
	Message,
	Contract,
	SchemaDefinition,
	ProcedureSchema,
} from './types'
import { isProcedure } from './types'
import type { StandardSchemaV1 } from '@standard-schema/spec'

describe('types', () => {
	describe('MessageType', () => {
		it('should include request, response, and event', () => {
			// GIVEN: MessageType union
			const request: MessageType = 'request'
			const response: MessageType = 'response'
			const event: MessageType = 'event'

			// THEN: All should be valid
			expect(request).toBe('request')
			expect(response).toBe('response')
			expect(event).toBe('event')
		})

		it('should enforce type at compile time', () => {
			// Type-only test
			expectTypeOf<MessageType>().toEqualTypeOf<
				'request' | 'response' | 'event'
			>()
		})
	})

	describe('RequestMessage', () => {
		it('should have correct structure', () => {
			// GIVEN: A request message
			const message: RequestMessage = {
				id: 'test-id',
				type: 'request',
				procedure: 'navigate',
				data: { path: '/home' },
			}

			// THEN: Should have all required fields
			expect(message.id).toBe('test-id')
			expect(message.type).toBe('request')
			expect(message.procedure).toBe('navigate')
			expect(message.data).toEqual({ path: '/home' })
		})

		it('should allow optional timestamp', () => {
			// GIVEN: A request message with timestamp
			const message: RequestMessage = {
				id: 'test-id',
				type: 'request',
				procedure: 'test',
				data: {},
				timestamp: Date.now(),
			}

			// THEN: Timestamp should be present
			expect(message.timestamp).toBeDefined()
			expect(typeof message.timestamp).toBe('number')
		})

		it('should enforce correct type literal', () => {
			// Type-only test
			expectTypeOf<RequestMessage['type']>().toEqualTypeOf<'request'>()
		})
	})

	describe('ResponseMessage', () => {
		it('should have correct structure for success response', () => {
			// GIVEN: A success response message
			const message: ResponseMessage = {
				id: 'test-id',
				type: 'response',
				data: { success: true },
			}

			// THEN: Should have data but no error
			expect(message.id).toBe('test-id')
			expect(message.type).toBe('response')
			expect(message.data).toEqual({ success: true })
			expect(message.error).toBeUndefined()
		})

		it('should have correct structure for error response', () => {
			// GIVEN: An error response message
			const message: ResponseMessage = {
				id: 'test-id',
				type: 'response',
				error: {
					message: 'Something went wrong',
					code: 'ERR_CODE',
				},
			}

			// THEN: Should have error but no data
			expect(message.id).toBe('test-id')
			expect(message.type).toBe('response')
			expect(message.error).toEqual({
				message: 'Something went wrong',
				code: 'ERR_CODE',
			})
			expect(message.data).toBeUndefined()
		})

		it('should allow optional timestamp', () => {
			// GIVEN: A response message with timestamp
			const message: ResponseMessage = {
				id: 'test-id',
				type: 'response',
				data: {},
				timestamp: Date.now(),
			}

			// THEN: Timestamp should be present
			expect(message.timestamp).toBeDefined()
		})

		it('should enforce correct type literal', () => {
			// Type-only test
			expectTypeOf<ResponseMessage['type']>().toEqualTypeOf<'response'>()
		})
	})

	describe('EventMessage', () => {
		it('should have correct structure', () => {
			// GIVEN: An event message
			const message: EventMessage = {
				id: 'test-id',
				type: 'event',
				event: 'pathChanged',
				data: { path: '/home' },
			}

			// THEN: Should have all required fields
			expect(message.id).toBe('test-id')
			expect(message.type).toBe('event')
			expect(message.event).toBe('pathChanged')
			expect(message.data).toEqual({ path: '/home' })
		})

		it('should allow optional timestamp', () => {
			// GIVEN: An event message with timestamp
			const message: EventMessage = {
				id: 'test-id',
				type: 'event',
				event: 'test',
				data: {},
				timestamp: Date.now(),
			}

			// THEN: Timestamp should be present
			expect(message.timestamp).toBeDefined()
		})

		it('should enforce correct type literal', () => {
			// Type-only test
			expectTypeOf<EventMessage['type']>().toEqualTypeOf<'event'>()
		})
	})

	describe('Message', () => {
		it('should accept request message', () => {
			// GIVEN: A request message
			const message: Message = {
				id: 'test',
				type: 'request',
				procedure: 'test',
				data: {},
			}

			// THEN: Should be valid
			expect(message.type).toBe('request')
		})

		it('should accept response message', () => {
			// GIVEN: A response message
			const message: Message = {
				id: 'test',
				type: 'response',
				data: {},
			}

			// THEN: Should be valid
			expect(message.type).toBe('response')
		})

		it('should accept event message', () => {
			// GIVEN: An event message
			const message: Message = {
				id: 'test',
				type: 'event',
				event: 'test',
				data: {},
			}

			// THEN: Should be valid
			expect(message.type).toBe('event')
		})

		it('should be discriminated union by type', () => {
			// GIVEN: A Message
			const message: Message = {
				id: 'test',
				type: 'request',
				procedure: 'test',
				data: {},
			}

			// WHEN: Type narrowing by discriminant
			if (message.type === 'request') {
				// THEN: Should have procedure property
				expectTypeOf(message.procedure).toBeString()
			}
		})
	})

	describe('Contract', () => {
		it('should allow web and native definitions', () => {
			// GIVEN: A contract with web and native
			const contract: Contract = {
				web: {},
				native: {},
			}

			// THEN: Should have both properties
			expect(contract.web).toBeDefined()
			expect(contract.native).toBeDefined()
		})

		it('should allow only web definition', () => {
			// GIVEN: A contract with only web
			const contract: Contract = {
				web: {},
			}

			// THEN: Should be valid
			expect(contract.web).toBeDefined()
			expect(contract.native).toBeUndefined()
		})

		it('should allow only native definition', () => {
			// GIVEN: A contract with only native
			const contract: Contract = {
				native: {},
			}

			// THEN: Should be valid
			expect(contract.native).toBeDefined()
			expect(contract.web).toBeUndefined()
		})

		it('should allow generic type parameter', () => {
			// Type-only test
			interface MySchemas {
				navigate: unknown
			}

			expectTypeOf<Contract<MySchemas>>().toMatchTypeOf<{
				web?: MySchemas
				native?: MySchemas
			}>()
		})
	})

	describe('isProcedure', () => {
		it('should return true for schema with returns method', () => {
			// GIVEN: A schema with returns method
			const schema = {
				'~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) },
				returns: (returnSchema: StandardSchemaV1) => schema,
			} as ProcedureSchema

			// WHEN: Checking if it's a procedure
			const result = isProcedure(schema)

			// THEN: Should return true
			expect(result).toBe(true)
		})

		it('should return false for schema without returns method', () => {
			// GIVEN: A plain Standard Schema (event)
			const schema = {
				'~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) },
			} as StandardSchemaV1

			// WHEN: Checking if it's a procedure
			const result = isProcedure(schema)

			// THEN: Should return false
			expect(result).toBe(false)
		})

		it('should narrow type when true', () => {
			// GIVEN: A schema
			const schema: SchemaDefinition = {
				'~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) },
				returns: (returnSchema: StandardSchemaV1) => schema as ProcedureSchema,
			} as ProcedureSchema

			// WHEN: Using type guard
			if (isProcedure(schema)) {
				// THEN: Should have returns method in type
				expectTypeOf(schema.returns).toBeFunction()
			}
		})

		it('should handle schema with returns property but not a function', () => {
			// GIVEN: A schema with returns as non-function
			const schema = {
				'~standard': { version: 1, vendor: 'test' },
				returns: 'not a function',
			} as unknown as SchemaDefinition

			// WHEN: Checking if it's a procedure
			const result = isProcedure(schema)

			// THEN: Should return false
			expect(result).toBe(false)
		})
	})

	describe('ProcedureSchema', () => {
		it('should extend StandardSchemaV1', () => {
			// Type-only test
			expectTypeOf<ProcedureSchema>().toMatchTypeOf<StandardSchemaV1>()
		})

		it('should have returns method', () => {
			// GIVEN: A procedure schema
			const schema: ProcedureSchema = {
				'~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) },
				returns: (returnSchema: StandardSchemaV1) => schema,
			}

			// THEN: Should have returns method
			expect(schema.returns).toBeTypeOf('function')
		})

		it('should allow optional _returnSchema property', () => {
			// GIVEN: A procedure schema with _returnSchema
			const returnSchema: StandardSchemaV1 = {
				'~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) },
			}
			const schema: ProcedureSchema = {
				'~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) },
				returns: () => schema,
				_returnSchema: returnSchema,
			}

			// THEN: Should have _returnSchema
			expect(schema._returnSchema).toBe(returnSchema)
		})
	})
})
