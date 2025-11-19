/**
 * Transport layer utilities for message serialization
 * @module transport
 */

/**
 * Serializer function type that converts data to string
 */
export type Serializer = (data: unknown) => string

/**
 * Deserializer function type that converts string back to data
 */
export type Deserializer = (data: string) => unknown

/**
 * Default serializer using JSON.stringify
 *
 * @param data - Data to serialize
 * @returns JSON string representation
 *
 * @example
 * ```typescript
 * const serialized = defaultSerializer({ name: 'John' })
 * // '{"name":"John"}'
 * ```
 */
export const defaultSerializer: Serializer = (data: unknown): string => {
	return JSON.stringify(data)
}

/**
 * Default deserializer using JSON.parse
 *
 * @param data - JSON string to deserialize
 * @returns Parsed data
 *
 * @example
 * ```typescript
 * const data = defaultDeserializer('{"name":"John"}')
 * // { name: 'John' }
 * ```
 */
export const defaultDeserializer: Deserializer = (data: string): unknown => {
	return JSON.parse(data)
}
