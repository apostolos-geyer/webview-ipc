/**
 * Procedure schema helper
 * @module procedure
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { ProcedureSchema } from './types'

/**
 * Mark a schema as a procedure by adding a returns() method.
 * This distinguishes procedures (request-response) from events (fire-and-forget).
 *
 * @param inputSchema - The input schema for the procedure
 * @returns A procedure schema with a returns() method
 *
 * @example
 * ```typescript
 * import { procedure } from '@webview-rpc/core'
 * import { z } from 'zod'
 *
 * const share = procedure(z.object({
 *   url: z.string(),
 *   title: z.string()
 * })).returns(z.object({
 *   success: z.boolean()
 * }))
 * ```
 */
export function procedure<T extends StandardSchemaV1>(
	inputSchema: T,
): ProcedureSchema<T, undefined> {
	const schema = inputSchema as unknown as ProcedureSchema<T, undefined>
	schema.returns = <TReturn extends StandardSchemaV1>(
		returnSchema: TReturn,
	): ProcedureSchema<T, TReturn> => {
		const result = schema as unknown as ProcedureSchema<T, TReturn>
		result._returnSchema = returnSchema
		return result
	}
	return schema
}
