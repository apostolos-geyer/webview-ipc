/**
 * Core TypeScript types for webview-rpc
 * @module types
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'

/**
 * Message types used in WebView RPC communication
 */
export type MessageType = 'request' | 'response' | 'event'

/**
 * Base message structure
 */
export interface BaseMessage {
	id: string
	type: MessageType
	timestamp?: number
}

/**
 * Request message sent to invoke a procedure
 */
export interface RequestMessage extends BaseMessage {
	type: 'request'
	procedure: string
	data: unknown
}

/**
 * Response message returned from a procedure
 */
export interface ResponseMessage extends BaseMessage {
	type: 'response'
	data?: unknown
	error?: {
		message: string
		code: string
	}
}

/**
 * Event message for fire-and-forget notifications
 */
export interface EventMessage extends BaseMessage {
	type: 'event'
	event: string
	data: unknown
}

/**
 * Union type of all message types
 */
export type Message = RequestMessage | ResponseMessage | EventMessage

/**
 * Contract definition for RPC procedures and events
 */
export interface Contract<T = unknown> {
	web?: T
	native?: T
}

/**
 * Schema definition that can be either a procedure (with returns) or an event
 */
export type SchemaDefinition = StandardSchemaV1 | ProcedureSchema

/**
 * Procedure schema with a returns() method
 * Generic over input schema and optional return schema
 */
export type ProcedureSchema<
	TInput extends StandardSchemaV1 = StandardSchemaV1,
	TOutput extends StandardSchemaV1 | undefined = undefined,
> = TInput & {
	returns: <TReturn extends StandardSchemaV1>(
		returnSchema: TReturn,
	) => ProcedureSchema<TInput, TReturn>
	_returnSchema?: TOutput
}

/**
 * Check if a schema is a procedure (has returns method)
 */
export function isProcedure(
	schema: SchemaDefinition,
): schema is ProcedureSchema {
	return 'returns' in schema && typeof schema.returns === 'function'
}

/**
 * Extract input type from a schema
 * Works with Standard Schema v1 compliant schemas (including Zod v4+)
 * Also handles ProcedureSchema by extracting from the underlying input schema
 */
export type InferInput<T> = T extends ProcedureSchema<infer TInput, infer _TOutput>
	? NonNullable<TInput['~standard']['types']>['input']
	: T extends StandardSchemaV1
		? NonNullable<T['~standard']['types']>['input']
		: unknown

/**
 * Extract output type from a schema
 * Works with Standard Schema v1 compliant schemas (including Zod v4+)
 * Also handles ProcedureSchema by extracting from the underlying input schema
 */
export type InferOutput<T> = T extends ProcedureSchema<infer TInput, infer _TOutput>
	? NonNullable<TInput['~standard']['types']>['output']
	: T extends StandardSchemaV1
		? NonNullable<T['~standard']['types']>['output']
		: unknown

/**
 * Extract return type from a procedure schema
 */
export type InferReturns<T> = T extends ProcedureSchema<
	infer _TInput,
	infer TOutput
>
	? TOutput extends StandardSchemaV1
		? InferOutput<TOutput>
		: never
	: never
