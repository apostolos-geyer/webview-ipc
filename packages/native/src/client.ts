/**
 * Native client implementation for WebView RPC
 * @module client
 */

import {
  WebViewRPCError,
  WebViewRPCTimeoutError,
  defaultDeserializer,
  defaultSerializer,
  generateCorrelationId,
} from '@webview-rpc/core'
import type {
  Contract,
  EventMessage,
  InferInput,
  InferReturns,
  Message,
  RequestMessage,
  ResponseMessage,
} from '@webview-rpc/core'
import type { Handler, NativeClient, NativeClientOptions } from './types'

/**
 * Creates a type-safe RPC client for React Native WebView communication.
 *
 * @example
 * ```typescript
 * import { createNativeClient } from '@webview-rpc/native'
 * import { contract } from './contract'
 *
 * const client = createNativeClient({
 *   webViewRef,
 *   contract,
 *   timeout: 5000
 * })
 *
 * // Call web procedure
 * const result = await client.web.myProcedure(data)
 *
 * // Emit event to web
 * client.native.emit.myEvent(data)
 *
 * // Handle events from web
 * client.native.handle('myEvent', (data) => {
 *   console.log('Event received:', data)
 * })
 * ```
 *
 * @param options - Configuration options including webViewRef and contract
 * @returns Client instance with web and native APIs
 */
export function createNativeClient<TContract extends Contract>(
  options: NativeClientOptions<TContract>
): NativeClient<TContract> {
  const {
    webViewRef,
    serializer = defaultSerializer,
    deserializer = defaultDeserializer,
    timeout = 5000,
    onError,
  } = options

  // Track pending requests for correlation
  const pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeoutId: ReturnType<typeof setTimeout>
    }
  >()

  // Track handlers for native procedures and events
  const nativeHandlers = new Map<string, Set<Handler>>()

  /**
   * Send a message to the WebView
   */
  function postMessage(message: Message): void {
    const webView = webViewRef.current

    if (!webView) {
      // For events, silently ignore if WebView is not available
      if (message.type === 'event') {
        return
      }
      // For requests, reject the pending promise
      // biome-ignore lint/style/noNonNullAssertion: Safe - pending is guaranteed to exist since we add it right before calling postMessage in callWeb
      const pending = pendingRequests.get(message.id)!
      clearTimeout(pending.timeoutId)
      pendingRequests.delete(message.id)
      pending.reject(new WebViewRPCError('WebView ref is null', 'WEBVIEW_NULL'))
      return
    }

    try {
      const serialized = serializer(message)
      webView.postMessage(serialized)
    } catch (error) {
      onError?.(error as Error)

      // If it's a request, reject the pending promise
      if (message.type === 'request') {
        // biome-ignore lint/style/noNonNullAssertion: Safe - pending is guaranteed to exist since we add it right before calling postMessage in callWeb
        const pending = pendingRequests.get(message.id)!
        clearTimeout(pending.timeoutId)
        pendingRequests.delete(message.id)
        pending.reject(error as Error)
      }
    }
  }

  /**
   * Handle incoming messages from WebView
   */
  function handleMessage(event: { nativeEvent: { data: string } }): void {
    try {
      const message = deserializer(event.nativeEvent.data) as Message

      if (message.type === 'response') {
        handleResponse(message)
      } else if (message.type === 'request') {
        handleRequest(message)
      } else if (message.type === 'event') {
        handleEvent(message)
      }
    } catch (error) {
      onError?.(error as Error)
    }
  }

  /**
   * Handle response message (completes a pending request)
   */
  function handleResponse(message: ResponseMessage): void {
    const pending = pendingRequests.get(message.id)

    if (!pending) {
      // Response for unknown request, ignore
      return
    }

    clearTimeout(pending.timeoutId)
    pendingRequests.delete(message.id)

    if (message.error) {
      pending.reject(new WebViewRPCError(message.error.message, message.error.code))
    } else {
      pending.resolve(message.data)
    }
  }

  /**
   * Handle request message (invoke native handler and send response)
   */
  async function handleRequest(message: RequestMessage): Promise<void> {
    const handlers = nativeHandlers.get(message.procedure)

    if (!handlers || handlers.size === 0) {
      // No handler registered, send error response
      const errorResponse: ResponseMessage = {
        id: message.id,
        type: 'response',
        error: {
          message: `No handler registered for procedure: ${message.procedure}`,
          code: 'NO_HANDLER',
        },
        timestamp: Date.now(),
      }
      postMessage(errorResponse)
      return
    }

    // Execute the first handler (procedures should only have one handler)
    const handler = Array.from(handlers)[0]

    try {
      const result = await handler(message.data)

      const response: ResponseMessage = {
        id: message.id,
        type: 'response',
        data: result,
        timestamp: Date.now(),
      }
      postMessage(response)
    } catch (error) {
      const errorResponse: ResponseMessage = {
        id: message.id,
        type: 'response',
        error: {
          message: (error as Error).message,
          code: 'HANDLER_ERROR',
        },
        timestamp: Date.now(),
      }
      postMessage(errorResponse)

      onError?.(error as Error)
    }
  }

  /**
   * Handle event message (invoke all registered handlers)
   */
  function handleEvent(message: EventMessage): void {
    const handlers = nativeHandlers.get(message.event)

    if (!handlers || handlers.size === 0) {
      return
    }

    // Execute all handlers for this event
    for (const handler of handlers) {
      try {
        handler(message.data)
      } catch (error) {
        onError?.(error as Error)
      }
    }
  }

  /**
   * Call a procedure on the web side
   */
  function callWeb<K extends keyof TContract['web']>(
    procedure: K,
    data: InferInput<TContract['web'][K]>
  ): Promise<
    TContract['web'][K] extends { returns: unknown } ? InferReturns<TContract['web'][K]> : never
  > {
    const id = generateCorrelationId()
    const message: RequestMessage = {
      id,
      type: 'request',
      procedure: procedure as string,
      data,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingRequests.delete(id)
        reject(new WebViewRPCTimeoutError(`Request timed out after ${timeout}ms`, timeout))
      }, timeout)

      pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId,
      })

      postMessage(message)
    })
  }

  /**
   * Emit an event to the web side
   */
  function emitWeb<K extends keyof TContract['web']>(
    event: K,
    data: InferInput<TContract['web'][K]>
  ): void {
    const message: EventMessage = {
      id: generateCorrelationId(),
      type: 'event',
      event: event as string,
      data,
      timestamp: Date.now(),
    }

    postMessage(message)
  }

  /**
   * Emit an event from native
   */
  function emitNative<K extends keyof TContract['native']>(
    event: K,
    data: InferInput<TContract['native'][K]>
  ): void {
    const message: EventMessage = {
      id: generateCorrelationId(),
      type: 'event',
      event: event as string,
      data,
      timestamp: Date.now(),
    }

    postMessage(message)
  }

  /**
   * Register a handler for a web procedure or event (called from native to handle web requests)
   */
  function registerWebHandler<K extends keyof TContract['web']>(
    name: K,
    handler: Handler<
      InferInput<TContract['web'][K]>,
      TContract['web'][K] extends { returns: unknown } ? InferReturns<TContract['web'][K]> : void
    >
  ): () => void {
    const nameStr = name as string
    if (!nativeHandlers.has(nameStr)) {
      nativeHandlers.set(nameStr, new Set())
    }

    // biome-ignore lint/style/noNonNullAssertion: Safe - handlers is guaranteed to exist after has() check
    const handlers = nativeHandlers.get(nameStr)!
    handlers.add(handler as Handler)

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as Handler)
      if (handlers.size === 0) {
        nativeHandlers.delete(nameStr)
      }
    }
  }

  /**
   * Register a handler for a native procedure or event (called from web)
   */
  function registerNativeHandler<K extends keyof TContract['native']>(
    name: K,
    handler: Handler<
      InferInput<TContract['native'][K]>,
      TContract['native'][K] extends { returns: unknown } ? InferReturns<TContract['native'][K]> : void
    >
  ): () => void {
    const nameStr = name as string
    if (!nativeHandlers.has(nameStr)) {
      nativeHandlers.set(nameStr, new Set())
    }

    // biome-ignore lint/style/noNonNullAssertion: Safe - handlers is guaranteed to exist after has() check
    const handlers = nativeHandlers.get(nameStr)!
    handlers.add(handler as Handler)

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as Handler)
      if (handlers.size === 0) {
        nativeHandlers.delete(nameStr)
      }
    }
  }

  /**
   * Cleanup all pending requests and handlers
   */
  function cleanup(): void {
    // Reject all pending requests
    for (const [, pending] of pendingRequests) {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('Client cleanup called'))
    }
    pendingRequests.clear()

    // Clear all handlers
    nativeHandlers.clear()
  }

  // Build the client API
  const client: NativeClient<TContract> = {
    web: {
      call: callWeb,
      emit: emitWeb,
      handle: registerWebHandler,
    },
    native: {
      emit: emitNative,
      handle: registerNativeHandler,
    },
    cleanup,
    handleMessage,
  }

  return client
}
