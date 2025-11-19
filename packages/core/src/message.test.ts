import { describe, it, expect } from 'vitest'
import { generateCorrelationId } from './message'

describe('generateCorrelationId', () => {
	describe('return value', () => {
		it('should return a string', () => {
			// GIVEN: Calling generateCorrelationId
			const id = generateCorrelationId()

			// THEN: Should return a string
			expect(typeof id).toBe('string')
		})

		it('should return a non-empty string', () => {
			// GIVEN: Calling generateCorrelationId
			const id = generateCorrelationId()

			// THEN: Should not be empty
			expect(id.length).toBeGreaterThan(0)
		})

		it('should return a valid UUID v4 format', () => {
			// GIVEN: Calling generateCorrelationId
			const id = generateCorrelationId()

			// THEN: Should match UUID v4 pattern
			// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
			// where x is any hexadecimal digit and y is one of 8, 9, A, or B
			const uuidV4Pattern =
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			expect(id).toMatch(uuidV4Pattern)
		})
	})

	describe('uniqueness', () => {
		it('should generate unique IDs on consecutive calls', () => {
			// GIVEN: Multiple consecutive calls
			const id1 = generateCorrelationId()
			const id2 = generateCorrelationId()
			const id3 = generateCorrelationId()

			// THEN: All should be unique
			expect(id1).not.toBe(id2)
			expect(id2).not.toBe(id3)
			expect(id1).not.toBe(id3)
		})

		it('should generate unique IDs across 100 calls', () => {
			// GIVEN: 100 correlation IDs
			const ids = Array.from({ length: 100 }, () => generateCorrelationId())

			// THEN: All should be unique (Set removes duplicates)
			const uniqueIds = new Set(ids)
			expect(uniqueIds.size).toBe(100)
		})

		it('should generate unique IDs across 1000 calls', () => {
			// GIVEN: 1000 correlation IDs
			const ids = Array.from({ length: 1000 }, () => generateCorrelationId())

			// THEN: All should be unique
			const uniqueIds = new Set(ids)
			expect(uniqueIds.size).toBe(1000)
		})

		it('should generate unique IDs when called rapidly', () => {
			// GIVEN: Rapid consecutive calls (no delay)
			const ids: string[] = []
			for (let i = 0; i < 50; i++) {
				ids.push(generateCorrelationId())
			}

			// THEN: All should still be unique
			const uniqueIds = new Set(ids)
			expect(uniqueIds.size).toBe(50)
		})
	})

	describe('consistency', () => {
		it('should always return strings of same format', () => {
			// GIVEN: Multiple IDs
			const ids = Array.from({ length: 20 }, () => generateCorrelationId())

			// THEN: All should have same length (UUID format)
			const lengths = ids.map((id) => id.length)
			const uniqueLengths = new Set(lengths)
			expect(uniqueLengths.size).toBe(1)
			expect(ids[0].length).toBe(36) // UUID v4 length with hyphens
		})

		it('should always return lowercase hex characters', () => {
			// GIVEN: Multiple IDs
			const ids = Array.from({ length: 20 }, () => generateCorrelationId())

			// THEN: All should only contain lowercase hex and hyphens
			const validChars = /^[0-9a-f-]+$/
			for (const id of ids) {
				expect(id).toMatch(validChars)
			}
		})

		it('should always have hyphens in correct positions', () => {
			// GIVEN: Multiple IDs
			const ids = Array.from({ length: 20 }, () => generateCorrelationId())

			// THEN: All should have hyphens at positions 8, 13, 18, 23
			for (const id of ids) {
				expect(id[8]).toBe('-')
				expect(id[13]).toBe('-')
				expect(id[18]).toBe('-')
				expect(id[23]).toBe('-')
			}
		})

		it('should always have 4 at position 14 (UUID v4 identifier)', () => {
			// GIVEN: Multiple IDs
			const ids = Array.from({ length: 20 }, () => generateCorrelationId())

			// THEN: Position 14 should always be "4" (UUID v4)
			for (const id of ids) {
				expect(id[14]).toBe('4')
			}
		})

		it('should always have valid variant bits at position 19', () => {
			// GIVEN: Multiple IDs
			const ids = Array.from({ length: 100 }, () => generateCorrelationId())

			// THEN: Position 19 should be one of 8, 9, a, b (variant bits)
			const validVariants = ['8', '9', 'a', 'b']
			for (const id of ids) {
				expect(validVariants).toContain(id[19])
			}
		})
	})

	describe('collision probability', () => {
		it('should have extremely low collision probability', () => {
			// GIVEN: A large number of IDs (simulating real-world usage)
			const numIds = 10000
			const ids = Array.from({ length: numIds }, () =>
				generateCorrelationId(),
			)

			// THEN: Should have zero collisions
			const uniqueIds = new Set(ids)
			expect(uniqueIds.size).toBe(numIds)

			// AND: No duplicate IDs
			const duplicates = ids.filter(
				(id, index) => ids.indexOf(id) !== index,
			)
			expect(duplicates.length).toBe(0)
		})
	})

	describe('usage in message correlation', () => {
		it('should be suitable for use as message ID', () => {
			// GIVEN: A request message ID
			const messageId = generateCorrelationId()

			// THEN: Should be usable as correlation ID
			const pendingRequests = new Map()
			pendingRequests.set(messageId, { resolve: () => {}, reject: () => {} })

			expect(pendingRequests.has(messageId)).toBe(true)
			expect(pendingRequests.get(messageId)).toBeDefined()
		})

		it('should work correctly in Map keys', () => {
			// GIVEN: Multiple messages with unique IDs
			const map = new Map()
			const id1 = generateCorrelationId()
			const id2 = generateCorrelationId()
			const id3 = generateCorrelationId()

			map.set(id1, 'value1')
			map.set(id2, 'value2')
			map.set(id3, 'value3')

			// THEN: Should maintain separate entries
			expect(map.size).toBe(3)
			expect(map.get(id1)).toBe('value1')
			expect(map.get(id2)).toBe('value2')
			expect(map.get(id3)).toBe('value3')
		})

		it('should be serializable to JSON', () => {
			// GIVEN: A correlation ID in a message
			const id = generateCorrelationId()
			const message = {
				id,
				type: 'request',
				procedure: 'test',
				data: {},
			}

			// THEN: Should serialize and deserialize correctly
			const serialized = JSON.stringify(message)
			const deserialized = JSON.parse(serialized)

			expect(deserialized.id).toBe(id)
			expect(deserialized.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			)
		})
	})
})
