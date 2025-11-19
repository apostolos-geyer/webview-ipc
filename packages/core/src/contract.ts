/**
 * Contract definition utilities for WebView RPC
 * @module contract
 */

import type { Contract } from './types'

/**
 * Defines a type-safe RPC contract for WebView communication.
 *
 * The contract specifies which procedures and events are available on each side
 * (web and native). Procedures are schemas with a `.returns()` method, while
 * events are plain schemas without returns.
 *
 * @param schema - Contract schema with optional web and native definitions
 * @returns Typed contract object
 *
 * @example
 * ```typescript
 * import { defineContract } from 'webview-rpc/core'
 * import { z } from 'zod'
 *
 * const contract = defineContract({
 *   web: {
 *     // Request-response procedure (has .returns())
 *     navigate: z.object({ path: z.string() })
 *       .returns(z.object({ success: z.boolean() })),
 *
 *     // Fire-and-forget event (no .returns())
 *     pathChanged: z.object({ path: z.string() }),
 *   },
 *   native: {
 *     share: z.object({ url: z.string() })
 *       .returns(z.object({ success: z.boolean() })),
 *   }
 * })
 * ```
 */
export function defineContract<T extends Contract>(schema: T): T {
	// Validate that the schema has at least web or native
	if (!schema.web && !schema.native) {
		throw new Error('Contract must define at least one of: web, native')
	}

	// Return the schema as-is for type inference
	// The actual validation of Standard Schema compliance happens at runtime
	// when handlers are invoked
	return schema
}
