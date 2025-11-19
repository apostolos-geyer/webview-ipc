import { describe, it, expect, expectTypeOf } from 'vitest'
import { defineContract } from './contract'
import type { Contract, ProcedureSchema } from './types'
import type { StandardSchemaV1 } from '@standard-schema/spec'

// Mock schemas for testing
const createMockSchema = (): StandardSchemaV1 => ({
	'~standard': {
		version: 1,
		vendor: 'test',
		validate: () => ({ value: {} }),
	},
})

const createMockProcedure = (): ProcedureSchema => {
	const schema: ProcedureSchema = {
		'~standard': {
			version: 1,
			vendor: 'test',
			validate: () => ({ value: {} }),
		},
		returns: (returnSchema: StandardSchemaV1) => {
			schema._returnSchema = returnSchema
			return schema
		},
	}
	return schema
}

describe('defineContract', () => {
	describe('basic functionality', () => {
		it('should accept contract with web definitions', () => {
			// GIVEN: Contract with web definitions
			const schema = {
				web: {
					navigate: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should return contract with web definitions
			expect(contract).toBeDefined()
			expect(contract.web).toBeDefined()
			expect(contract.web?.navigate).toBeDefined()
		})

		it('should accept contract with native definitions', () => {
			// GIVEN: Contract with native definitions
			const schema = {
				native: {
					share: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should return contract with native definitions
			expect(contract).toBeDefined()
			expect(contract.native).toBeDefined()
			expect(contract.native?.share).toBeDefined()
		})

		it('should accept contract with both web and native definitions', () => {
			// GIVEN: Contract with both sides
			const schema = {
				web: {
					navigate: createMockProcedure(),
				},
				native: {
					share: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should return contract with both sides
			expect(contract).toBeDefined()
			expect(contract.web).toBeDefined()
			expect(contract.native).toBeDefined()
		})

		it('should return the same schema object for type inference', () => {
			// GIVEN: A contract schema
			const schema = {
				web: {
					navigate: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should return the same object (for type inference)
			expect(contract).toBe(schema)
		})
	})

	describe('validation', () => {
		it('should throw if neither web nor native is defined', () => {
			// GIVEN: Empty contract
			const schema = {}

			// WHEN: Defining contract
			// THEN: Should throw error
			expect(() => defineContract(schema)).toThrow(
				'Contract must define at least one of: web, native',
			)
		})

		it('should throw if contract is null', () => {
			// GIVEN: null contract
			// WHEN/THEN: Should throw
			expect(() => defineContract(null as unknown as Contract)).toThrow()
		})

		it('should allow empty web object if native is defined', () => {
			// GIVEN: Contract with empty web but has native
			const schema = {
				web: {},
				native: {
					share: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should be valid
			expect(contract).toBeDefined()
		})

		it('should allow empty native object if web is defined', () => {
			// GIVEN: Contract with empty native but has web
			const schema = {
				web: {
					navigate: createMockProcedure(),
				},
				native: {},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should be valid
			expect(contract).toBeDefined()
		})
	})

	describe('procedures and events', () => {
		it('should accept procedures (schemas with returns)', () => {
			// GIVEN: Contract with procedure
			const procedure = createMockProcedure()
			const schema = {
				web: {
					navigate: procedure,
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should include procedure
			expect(contract.web?.navigate).toBe(procedure)
		})

		it('should accept events (schemas without returns)', () => {
			// GIVEN: Contract with event (plain schema)
			const event = createMockSchema()
			const schema = {
				web: {
					pathChanged: event,
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should include event
			expect(contract.web?.pathChanged).toBe(event)
		})

		it('should accept mix of procedures and events', () => {
			// GIVEN: Contract with both procedures and events
			const navigate = createMockProcedure()
			const pathChanged = createMockSchema()
			const schema = {
				web: {
					navigate,
					pathChanged,
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should include both
			expect(contract.web?.navigate).toBe(navigate)
			expect(contract.web?.pathChanged).toBe(pathChanged)
		})

		it('should accept multiple procedures', () => {
			// GIVEN: Contract with multiple procedures
			const schema = {
				web: {
					navigate: createMockProcedure(),
					getUserData: createMockProcedure(),
					updateSettings: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should include all procedures
			expect(contract.web?.navigate).toBeDefined()
			expect(contract.web?.getUserData).toBeDefined()
			expect(contract.web?.updateSettings).toBeDefined()
		})

		it('should accept multiple events', () => {
			// GIVEN: Contract with multiple events
			const schema = {
				web: {
					pathChanged: createMockSchema(),
					stateUpdated: createMockSchema(),
					errorOccurred: createMockSchema(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should include all events
			expect(contract.web?.pathChanged).toBeDefined()
			expect(contract.web?.stateUpdated).toBeDefined()
			expect(contract.web?.errorOccurred).toBeDefined()
		})
	})

	describe('type inference', () => {
		it('should infer contract type correctly', () => {
			// GIVEN: A typed contract
			const schema = {
				web: {
					navigate: createMockProcedure(),
				},
				native: {
					share: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Type should be inferred correctly
			expectTypeOf(contract).toMatchTypeOf<typeof schema>()
		})

		it('should preserve generic type parameter', () => {
			// GIVEN: Contract with specific type
			interface MyContract {
				web?: {
					navigate: ProcedureSchema
				}
				native?: {
					share: ProcedureSchema
				}
			}

			const schema: MyContract = {
				web: {
					navigate: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Type should be preserved
			expectTypeOf(contract).toMatchTypeOf<MyContract>()
		})

		it('should allow type to be extracted', () => {
			// GIVEN: A contract
			const contract = defineContract({
				web: {
					navigate: createMockProcedure(),
				},
			})

			// THEN: Type can be extracted
			type AppContract = typeof contract
			expectTypeOf<AppContract>().toMatchTypeOf<{
				web: {
					navigate: ProcedureSchema
				}
			}>()
		})
	})

	describe('real-world usage patterns', () => {
		it('should work with Zod-like schemas', () => {
			// GIVEN: Mock Zod-like schema
			const zodLikeSchema = {
				'~standard': { version: 1, vendor: 'zod' },
				returns: function (this: ProcedureSchema, returnSchema: StandardSchema) {
					this._returnSchema = returnSchema
					return this
				},
			} as ProcedureSchema

			const schema = {
				web: {
					navigate: zodLikeSchema,
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should work correctly
			expect(contract.web?.navigate).toBe(zodLikeSchema)
		})

		it('should handle complex nested contracts', () => {
			// GIVEN: Complex contract with many definitions
			const schema = {
				web: {
					// Navigation
					navigate: createMockProcedure(),
					goBack: createMockProcedure(),
					pathChanged: createMockSchema(),

					// User management
					getUserData: createMockProcedure(),
					updateUser: createMockProcedure(),
					userChanged: createMockSchema(),

					// Settings
					getSettings: createMockProcedure(),
					updateSettings: createMockProcedure(),
					settingsChanged: createMockSchema(),
				},
				native: {
					// Native features
					share: createMockProcedure(),
					openCamera: createMockProcedure(),
					appStateChange: createMockSchema(),

					// Notifications
					showNotification: createMockProcedure(),
					notificationTapped: createMockSchema(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should handle all definitions
			expect(contract.web).toBeDefined()
			expect(contract.native).toBeDefined()
			expect(Object.keys(contract.web || {}).length).toBe(9)
			expect(Object.keys(contract.native || {}).length).toBe(5)
		})

		it('should be immutable after definition', () => {
			// GIVEN: A contract
			const schema = {
				web: {
					navigate: createMockProcedure(),
				},
			}
			const contract = defineContract(schema)

			// WHEN: Attempting to modify (at runtime)
			const original = contract.web

			// THEN: Should still reference same object
			expect(contract.web).toBe(original)
		})
	})

	describe('edge cases', () => {
		it('should handle undefined web', () => {
			// GIVEN: Contract with only native
			const schema = {
				native: {
					share: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: web should be undefined
			expect(contract.web).toBeUndefined()
			expect(contract.native).toBeDefined()
		})

		it('should handle undefined native', () => {
			// GIVEN: Contract with only web
			const schema = {
				web: {
					navigate: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: native should be undefined
			expect(contract.native).toBeUndefined()
			expect(contract.web).toBeDefined()
		})

		it('should handle contract with only one procedure', () => {
			// GIVEN: Minimal contract
			const schema = {
				web: {
					test: createMockProcedure(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should work
			expect(contract.web?.test).toBeDefined()
		})

		it('should handle contract with only one event', () => {
			// GIVEN: Minimal contract with event
			const schema = {
				web: {
					testEvent: createMockSchema(),
				},
			}

			// WHEN: Defining contract
			const contract = defineContract(schema)

			// THEN: Should work
			expect(contract.web?.testEvent).toBeDefined()
		})
	})
})
