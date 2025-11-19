/**
 * Type definitions for @webview-rpc/web
 * @module types
 */

import type {
  Contract,
  Deserializer,
  InferInput,
  InferReturns,
  Serializer,
} from '@webview-rpc/core'

/**
 * WebView client instance returned by createWebClient
 */
export interface WebClient<TContract extends Contract> {
  /**
   * Native-side API - call procedures and listen to events from native
   */
  native: {
    /**
     * Call a procedure on the native side (request-response)
     */
    call: <K extends keyof NonNullable<TContract['native']>>(
      procedure: K,
      data: InferInput<NonNullable<TContract['native']>[K]>
    ) => Promise<InferReturns<NonNullable<TContract['native']>[K]>>

    /**
     * Register a handler for native events
     */
    handle: <K extends keyof NonNullable<TContract['native']>>(
      event: K,
      handler: (data: InferInput<NonNullable<TContract['native']>[K]>) => void
    ) => () => void
  }

  /**
   * Web-side API - handle procedures and emit events to native
   */
  web: {
    /**
     * Emit an event to the native side (fire-and-forget)
     */
    emit: <K extends keyof NonNullable<TContract['web']>>(
      event: K,
      data: InferInput<NonNullable<TContract['web']>[K]>
    ) => void

    /**
     * Register a handler for web procedures
     */
    handle: <K extends keyof NonNullable<TContract['web']>>(
      procedure: K,
      handler: (
        data: InferInput<NonNullable<TContract['web']>[K]>
      ) =>
        | Promise<InferReturns<NonNullable<TContract['web']>[K]>>
        | InferReturns<NonNullable<TContract['web']>[K]>
    ) => () => void
  }

  /**
   * Check if running inside a WebView
   */
  isWebView: boolean

  /**
   * Cleanup resources (cancel pending requests, remove listeners)
   */
  cleanup: () => void
}

/**
 * Options for creating a WebClient
 */
export interface WebClientOptions {
  /**
   * Custom serializer function (default: JSON.stringify)
   */
  serializer?: Serializer

  /**
   * Custom deserializer function (default: JSON.parse)
   */
  deserializer?: Deserializer

  /**
   * Request timeout in milliseconds (default: 5000)
   */
  timeout?: number

  /**
   * Error handler for unhandled errors
   */
  onError?: (error: Error) => void
}

/**
 * Handler function type for procedures
 */
export type Handler<TData = unknown, TReturn = unknown> = (
  data: TData
) => Promise<TReturn> | TReturn

/**
 * Event handler function type
 */
export type EventHandler<TData = unknown> = (data: TData) => void
