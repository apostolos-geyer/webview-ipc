import { describe, it, expect, expectTypeOf } from 'vitest'
import {
	defaultSerializer,
	defaultDeserializer,
	type Serializer,
	type Deserializer,
} from './transport'

describe('transport', () => {
	describe('Serializer type', () => {
		it('should accept function that takes unknown and returns string', () => {
			// Type-only test
			const customSerializer: Serializer = (data: unknown) =>
				JSON.stringify(data)

			expectTypeOf(customSerializer).toMatchTypeOf<Serializer>()
		})

		it('should be compatible with JSON.stringify', () => {
			// GIVEN: JSON.stringify as Serializer
			const serializer: Serializer = JSON.stringify

			// THEN: Should be valid
			expect(typeof serializer).toBe('function')
		})
	})

	describe('Deserializer type', () => {
		it('should accept function that takes string and returns unknown', () => {
			// Type-only test
			const customDeserializer: Deserializer = (data: string) =>
				JSON.parse(data)

			expectTypeOf(customDeserializer).toMatchTypeOf<Deserializer>()
		})

		it('should be compatible with JSON.parse', () => {
			// GIVEN: JSON.parse as Deserializer
			const deserializer: Deserializer = JSON.parse

			// THEN: Should be valid
			expect(typeof deserializer).toBe('function')
		})
	})

	describe('defaultSerializer', () => {
		describe('basic serialization', () => {
			it('should serialize plain object', () => {
				// GIVEN: A plain object
				const data = { name: 'John', age: 30 }

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should return JSON string
				expect(result).toBe('{"name":"John","age":30}')
			})

			it('should serialize string', () => {
				// GIVEN: A string
				const data = 'hello world'

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should return quoted string
				expect(result).toBe('"hello world"')
			})

			it('should serialize number', () => {
				// GIVEN: A number
				const data = 42

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should return number as string
				expect(result).toBe('42')
			})

			it('should serialize boolean', () => {
				// GIVEN: Booleans
				const trueData = true
				const falseData = false

				// WHEN: Serializing
				const trueResult = defaultSerializer(trueData)
				const falseResult = defaultSerializer(falseData)

				// THEN: Should return boolean strings
				expect(trueResult).toBe('true')
				expect(falseResult).toBe('false')
			})

			it('should serialize null', () => {
				// GIVEN: null
				const data = null

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should return "null"
				expect(result).toBe('null')
			})

			it('should serialize array', () => {
				// GIVEN: An array
				const data = [1, 2, 3]

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should return JSON array string
				expect(result).toBe('[1,2,3]')
			})

			it('should serialize nested object', () => {
				// GIVEN: A nested object
				const data = {
					user: {
						name: 'John',
						address: {
							city: 'NYC',
						},
					},
				}

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should serialize nested structure
				expect(result).toBe('{"user":{"name":"John","address":{"city":"NYC"}}}')
			})
		})

		describe('return type', () => {
			it('should always return string', () => {
				// GIVEN: Various data types
				const testCases = [
					{},
					'string',
					42,
					true,
					null,
					[],
					{ nested: { deep: 'value' } },
				]

				// WHEN: Serializing each
				for (const data of testCases) {
					const result = defaultSerializer(data)

					// THEN: Should return string
					expect(typeof result).toBe('string')
				}
			})
		})

		describe('edge cases', () => {
			it('should serialize empty object', () => {
				// GIVEN: Empty object
				const data = {}

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should return "{}"
				expect(result).toBe('{}')
			})

			it('should serialize empty array', () => {
				// GIVEN: Empty array
				const data: unknown[] = []

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should return "[]"
				expect(result).toBe('[]')
			})

			it('should serialize undefined as undefined (JSON behavior)', () => {
				// GIVEN: undefined
				const data = undefined

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should return undefined (JSON.stringify behavior)
				expect(result).toBeUndefined()
			})

			it('should handle special characters in strings', () => {
				// GIVEN: String with special characters
				const data = 'hello\nworld\t"quoted"'

				// WHEN: Serializing
				const result = defaultSerializer(data)

				// THEN: Should escape special characters
				expect(result).toBe('"hello\\nworld\\t\\"quoted\\""')
			})
		})
	})

	describe('defaultDeserializer', () => {
		describe('basic deserialization', () => {
			it('should deserialize plain object', () => {
				// GIVEN: JSON string of object
				const data = '{"name":"John","age":30}'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should return object
				expect(result).toEqual({ name: 'John', age: 30 })
			})

			it('should deserialize string', () => {
				// GIVEN: JSON string
				const data = '"hello world"'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should return string
				expect(result).toBe('hello world')
			})

			it('should deserialize number', () => {
				// GIVEN: JSON number
				const data = '42'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should return number
				expect(result).toBe(42)
			})

			it('should deserialize boolean', () => {
				// GIVEN: JSON booleans
				const trueData = 'true'
				const falseData = 'false'

				// WHEN: Deserializing
				const trueResult = defaultDeserializer(trueData)
				const falseResult = defaultDeserializer(falseData)

				// THEN: Should return booleans
				expect(trueResult).toBe(true)
				expect(falseResult).toBe(false)
			})

			it('should deserialize null', () => {
				// GIVEN: JSON null
				const data = 'null'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should return null
				expect(result).toBe(null)
			})

			it('should deserialize array', () => {
				// GIVEN: JSON array
				const data = '[1,2,3]'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should return array
				expect(result).toEqual([1, 2, 3])
			})

			it('should deserialize nested object', () => {
				// GIVEN: JSON nested object
				const data = '{"user":{"name":"John","address":{"city":"NYC"}}}'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should deserialize nested structure
				expect(result).toEqual({
					user: {
						name: 'John',
						address: {
							city: 'NYC',
						},
					},
				})
			})
		})

		describe('edge cases', () => {
			it('should deserialize empty object', () => {
				// GIVEN: Empty object JSON
				const data = '{}'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should return empty object
				expect(result).toEqual({})
			})

			it('should deserialize empty array', () => {
				// GIVEN: Empty array JSON
				const data = '[]'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should return empty array
				expect(result).toEqual([])
			})

			it('should handle escaped characters', () => {
				// GIVEN: JSON with escaped characters
				const data = '"hello\\nworld\\t\\"quoted\\""'

				// WHEN: Deserializing
				const result = defaultDeserializer(data)

				// THEN: Should unescape characters
				expect(result).toBe('hello\nworld\t"quoted"')
			})

			it('should throw on invalid JSON', () => {
				// GIVEN: Invalid JSON
				const invalidData = '{invalid json}'

				// WHEN: Deserializing
				// THEN: Should throw
				expect(() => defaultDeserializer(invalidData)).toThrow()
			})

			it('should throw on malformed JSON', () => {
				// GIVEN: Malformed JSON
				const malformedData = '{"name": "John", age: 30}' // Missing quotes around age

				// WHEN: Deserializing
				// THEN: Should throw
				expect(() => defaultDeserializer(malformedData)).toThrow()
			})
		})
	})

	describe('round-trip serialization', () => {
		it('should serialize and deserialize object correctly', () => {
			// GIVEN: Original data
			const original = { name: 'John', age: 30, active: true }

			// WHEN: Serializing then deserializing
			const serialized = defaultSerializer(original)
			const deserialized = defaultDeserializer(serialized)

			// THEN: Should match original
			expect(deserialized).toEqual(original)
		})

		it('should serialize and deserialize array correctly', () => {
			// GIVEN: Original array
			const original = [1, 'two', { three: 3 }, true, null]

			// WHEN: Round-trip
			const serialized = defaultSerializer(original)
			const deserialized = defaultDeserializer(serialized)

			// THEN: Should match original
			expect(deserialized).toEqual(original)
		})

		it('should serialize and deserialize nested structures correctly', () => {
			// GIVEN: Nested structure
			const original = {
				users: [
					{ id: 1, name: 'John', tags: ['admin', 'active'] },
					{ id: 2, name: 'Jane', tags: ['user'] },
				],
				metadata: {
					version: 1,
					timestamp: 1234567890,
				},
			}

			// WHEN: Round-trip
			const serialized = defaultSerializer(original)
			const deserialized = defaultDeserializer(serialized)

			// THEN: Should match original
			expect(deserialized).toEqual(original)
		})

		it('should work with message structure', () => {
			// GIVEN: A message structure
			const message = {
				id: 'test-id',
				type: 'request',
				procedure: 'navigate',
				data: { path: '/home' },
				timestamp: Date.now(),
			}

			// WHEN: Round-trip
			const serialized = defaultSerializer(message)
			const deserialized = defaultDeserializer(serialized)

			// THEN: Should match original
			expect(deserialized).toEqual(message)
		})
	})

	describe('type compatibility', () => {
		it('should be assignable to Serializer type', () => {
			// GIVEN: defaultSerializer
			const serializer: Serializer = defaultSerializer

			// THEN: Should be valid Serializer
			expect(typeof serializer).toBe('function')
			expectTypeOf(serializer).toMatchTypeOf<Serializer>()
		})

		it('should be assignable to Deserializer type', () => {
			// GIVEN: defaultDeserializer
			const deserializer: Deserializer = defaultDeserializer

			// THEN: Should be valid Deserializer
			expect(typeof deserializer).toBe('function')
			expectTypeOf(deserializer).toMatchTypeOf<Deserializer>()
		})
	})

	describe('custom serializers', () => {
		it('should support custom serializer implementation', () => {
			// GIVEN: Custom serializer (e.g., adding prefix)
			const customSerializer: Serializer = (data) =>
				`CUSTOM:${JSON.stringify(data)}`

			// WHEN: Using custom serializer
			const result = customSerializer({ test: 'data' })

			// THEN: Should use custom logic
			expect(result).toBe('CUSTOM:{"test":"data"}')
		})

		it('should support custom deserializer implementation', () => {
			// GIVEN: Custom deserializer (e.g., removing prefix)
			const customDeserializer: Deserializer = (data) => {
				const stripped = data.replace(/^CUSTOM:/, '')
				return JSON.parse(stripped)
			}

			// WHEN: Using custom deserializer
			const result = customDeserializer('CUSTOM:{"test":"data"}')

			// THEN: Should use custom logic
			expect(result).toEqual({ test: 'data' })
		})
	})
})
