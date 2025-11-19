/**
 * @webview-rpc/core
 *
 * Core message protocol for WebView RPC communication.
 * Provides framework-agnostic utilities for defining contracts,
 * generating correlation IDs, and serializing messages.
 *
 * @module @webview-rpc/core
 */

// Contract definition
export { defineContract } from './contract'
export { procedure } from './procedure'

// Message utilities
export { generateCorrelationId } from './message'

// Error classes
export {
	NotImplementedError,
	WebViewRPCError,
	WebViewRPCTimeoutError,
} from './errors'

// Transport utilities
export {
	defaultSerializer,
	defaultDeserializer,
	type Serializer,
	type Deserializer,
} from './transport'

// Type definitions
export type {
	Contract,
	Message,
	MessageType,
	RequestMessage,
	ResponseMessage,
	EventMessage,
	SchemaDefinition,
	ProcedureSchema,
	BaseMessage,
	InferInput,
	InferOutput,
	InferReturns,
} from './types'

export type { StandardSchemaV1 } from '@standard-schema/spec'

export { isProcedure } from './types'
