/**
 * Message utilities for WebView RPC
 * @module message
 */

/**
 * Generates a unique correlation ID for request-response matching.
 * Uses UUID v4 format for guaranteed uniqueness.
 *
 * This is a cross-platform implementation that works in both Node.js and React Native
 * without requiring native crypto modules.
 *
 * @returns A unique UUID v4 string
 *
 * @example
 * ```typescript
 * const id1 = generateCorrelationId() // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 * const id2 = generateCorrelationId() // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateCorrelationId(): string {
	// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
	// where y is one of [8, 9, a, b]
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0
		const v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}
