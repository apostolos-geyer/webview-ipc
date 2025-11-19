/**
 * Type definitions for the React Native WebView RPC client
 * @module types
 */

import type {
  Contract,
  Deserializer,
  InferInput,
  InferReturns,
  Serializer,
} from '@webview-rpc/core'
import type { RefObject } from 'react'
import type { WebView } from 'react-native-webview'

/**
 * Options for creating a native client
 */
export interface NativeClientOptions<TContract extends Contract = Contract> {
  /**
   * Reference to the WebView component
   */
  webViewRef: RefObject<WebView | null>

  /**
   * The shared RPC contract
   */
  contract: TContract

  /**
   * Custom serializer for messages (optional, defaults to JSON.stringify)
   */
  serializer?: Serializer

  /**
   * Custom deserializer for messages (optional, defaults to JSON.parse)
   */
  deserializer?: Deserializer

  /**
   * Request timeout in milliseconds (default: 5000)
   */
  timeout?: number

  /**
   * Error handler for uncaught errors
   */
  onError?: (error: Error) => void
}

/**
 * Handler function type for procedures and events
 */
export type Handler<TInput = unknown, TOutput = unknown> = (
  data: TInput
) => TOutput | Promise<TOutput>

/**
 * Map of procedure/event names to handler functions
 */
export type Handlers<T> = {
  [K in keyof T]?: Handler<
    T[K] extends { '~standard': unknown } ? InferInput<T[K]> : unknown,
    T[K] extends { returns: unknown } ? InferReturns<T[K]> : void
  >
}

/**
 * Native client interface
 */
export interface NativeClient<TContract extends Contract = Contract> {
  /**
   * API for calling web procedures and emitting events to web
   */
  web: {
    /**
     * Call a procedure on the web side
     */
    call: <K extends keyof TContract['web']>(
      procedure: K,
      data: InferInput<TContract['web'][K]>
    ) => Promise<
      TContract['web'][K] extends { returns: unknown } ? InferReturns<TContract['web'][K]> : never
    >

    /**
     * Emit an event to the web side
     */
    emit: <K extends keyof TContract['web']>(
      event: K,
      data: InferInput<TContract['web'][K]>
    ) => void

    /**
     * Register a handler for a procedure or event from native
     */
    handle: <K extends keyof TContract['web']>(
      name: K,
      handler: Handler<
        InferInput<TContract['web'][K]>,
        TContract['web'][K] extends { returns: unknown } ? InferReturns<TContract['web'][K]> : void
      >
    ) => () => void
  }

  /**
   * API for handling native procedures and events
   */
  native: {
    /**
     * Emit an event from native
     */
    emit: <K extends keyof TContract['native']>(
      event: K,
      data: InferInput<TContract['native'][K]>
    ) => void

    /**
     * Register a handler for a procedure or event from web
     */
    handle: <K extends keyof TContract['native']>(
      name: K,
      handler: Handler<
        InferInput<TContract['native'][K]>,
        TContract['native'][K] extends { returns: unknown }
          ? InferReturns<TContract['native'][K]>
          : void
      >
    ) => () => void
  }

  /**
   * Cleanup function to remove all handlers and cancel pending requests
   */
  cleanup: () => void

  /**
   * Message handler for WebView's onMessage prop.
   * Pass this to WebView's onMessage to handle incoming messages from the web side.
   *
   * @example
   * ```tsx
   * <WebView
   *   ref={webViewRef}
   *   onMessage={client.handleMessage}
   *   source={{ uri: 'http://localhost:3000' }}
   * />
   * ```
   */
  handleMessage: (event: { nativeEvent: { data: string } }) => void
}
