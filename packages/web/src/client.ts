/**
 * Web client implementation for WebView RPC
 * @module client
 */

import type {
  Contract,
  EventMessage,
  InferInput,
  InferReturns,
  Message,
  RequestMessage,
  ResponseMessage,
} from '@webview-rpc/core'
import {
  WebViewRPCError,
  WebViewRPCTimeoutError,
  defaultDeserializer,
  defaultSerializer,
  generateCorrelationId,
} from '@webview-rpc/core'
import type { Handler, WebClient, WebClientOptions } from './types'

/**
 * Creates a type-safe RPC client for WebView communication from the web side.
 *
 * The client provides:
 * - `native.call()` - Call procedures on native side (request-response)
 * - `native.handle()` - Listen to events from native side
 * - `web.emit()` - Emit events to native side (fire-and-forget)
 * - `web.handle()` - Handle procedure calls from native side
 * - `isWebView` - Detect if running inside a WebView
 * - `cleanup()` - Clean up resources
 *
 * @example
 * ```typescript
 * import { createWebClient } from '@webview-rpc/web'
 * import { contract } from './contract'
 *
 * const client = createWebClient(contract, {
 *   timeout: 5000,
 *   onError: (error) => console.error(error)
 * })
 *
 * // Call native procedure
 * const result = await client.native.call('share', { url: 'https://example.com' })
 *
 * // Listen to native events
 * client.native.handle('appStateChange', (data) => {
 *   console.log('App state:', data.state)
 * })
 *
 * // Emit web event
 * client.web.emit('pathChanged', { path: '/home' })
 *
 * // Handle web procedure
 * client.web.handle('navigate', async (data) => {
 *   router.push(data.path)
 *   return { success: true }
 * })
 * ```
 *
 * @param contract - The shared RPC contract defining procedures and events
 * @param options - Configuration options
 * @returns WebClient instance
 */
export function createWebClient<TContract extends Contract>(
  _contract: TContract,
  options?: WebClientOptions
): WebClient<TContract> {
  // Configuration with defaults
  const config = {
    serializer: options?.serializer ?? defaultSerializer,
    deserializer: options?.deserializer ?? defaultDeserializer,
    timeout: options?.timeout ?? 5000,
    onError: options?.onError,
  }

  // Detect WebView environment
  const isWebView =
    // biome-ignore lint/suspicious/noExplicitAny: Required for window global augmentation check
    typeof window !== 'undefined' && typeof (window as any).ReactNativeWebView !== 'undefined'

  // Pending requests map for correlation
  const pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timeoutId: ReturnType<typeof setTimeout>
    }
  >()

  // Event handlers map
  // biome-ignore lint/suspicious/noExplicitAny: Handlers are type-safe at registration, stored generically
  const eventHandlers = new Map<string, Set<(data: any) => void>>()

  // Procedure handlers map
  // biome-ignore lint/suspicious/noExplicitAny: Handlers are type-safe at registration, stored generically
  const procedureHandlers = new Map<string, (data: any) => any>()

  /**
   * Post message to native side
   */
  const postToNative = (message: Message): void => {
    if (!isWebView) {
      return
    }

    try {
      const serialized = config.serializer(message)
      // biome-ignore lint/suspicious/noExplicitAny: Required for window global augmentation access
      ;(window as any).ReactNativeWebView.postMessage(serialized)
    } catch (error) {
      config.onError?.(error as Error)
    }
  }

  /**
   * Handle incoming messages from native
   */
  const handleMessage = (event: MessageEvent): void => {
    try {
      const message = config.deserializer(event.data) as Message

      if (message.type === 'response') {
        handleResponse(message as ResponseMessage)
      } else if (message.type === 'event') {
        handleEvent(message as EventMessage)
      } else if (message.type === 'request') {
        handleRequest(message as RequestMessage)
      }
    } catch (error) {
      config.onError?.(error as Error)
    }
  }

  /**
   * Handle response message
   */
  const handleResponse = (message: ResponseMessage): void => {
    const pending = pendingRequests.get(message.id)
    if (!pending) {
      return
    }

    // Clear timeout
    clearTimeout(pending.timeoutId)
    pendingRequests.delete(message.id)

    // Resolve or reject based on error
    if (message.error) {
      pending.reject(new WebViewRPCError(message.error.message, message.error.code))
    } else {
      pending.resolve(message.data)
    }
  }

  /**
   * Handle event message
   */
  const handleEvent = (message: EventMessage): void => {
    const handlers = eventHandlers.get(message.event)
    if (!handlers || handlers.size === 0) {
      return
    }

    for (const handler of handlers) {
      try {
        handler(message.data)
      } catch (error) {
        config.onError?.(error as Error)
      }
    }
  }

  /**
   * Handle request message (procedure call from native)
   */
  const handleRequest = async (message: RequestMessage): Promise<void> => {
    const handler = procedureHandlers.get(message.procedure)

    if (!handler) {
      // Send error response
      const errorResponse: ResponseMessage = {
        id: message.id,
        type: 'response',
        error: {
          message: `No handler registered for procedure: ${message.procedure}`,
          code: 'NO_HANDLER',
        },
      }
      postToNative(errorResponse)
      return
    }

    try {
      const result = await handler(message.data)
      const response: ResponseMessage = {
        id: message.id,
        type: 'response',
        data: result,
      }
      postToNative(response)
    } catch (error) {
      config.onError?.(error as Error)

      const errorResponse: ResponseMessage = {
        id: message.id,
        type: 'response',
        error: {
          message: (error as Error).message,
          code: 'HANDLER_ERROR',
        },
      }
      postToNative(errorResponse)
    }
  }

  /**
   * Call a procedure on native side
   */
  function call<K extends keyof NonNullable<TContract['native']>>(
    procedure: K,
    data: InferInput<NonNullable<TContract['native']>[K]>
  ): Promise<InferReturns<NonNullable<TContract['native']>[K]>> {
    return new Promise((resolve, reject) => {
      if (!isWebView) {
        reject(new WebViewRPCError('Not running in WebView', 'NOT_IN_WEBVIEW'))
        return
      }

      const id = generateCorrelationId()

      // Setup timeout
      const timeoutId = setTimeout(() => {
        pendingRequests.delete(id)
        reject(
          new WebViewRPCTimeoutError(`Request timed out after ${config.timeout}ms`, config.timeout)
        )
      }, config.timeout)

      // Store pending request
      pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject, timeoutId })

      // Send request
      const message: RequestMessage = {
        id,
        type: 'request',
        procedure: procedure as string,
        data,
      }

      postToNative(message)
    })
  }

  /**
   * Register event handler for native events
   */
  function handleNativeEvent<K extends keyof NonNullable<TContract['native']>>(
    event: K,
    handler: (data: InferInput<NonNullable<TContract['native']>[K]>) => void
  ): () => void {
    const eventName = event as string

    if (!eventHandlers.has(eventName)) {
      eventHandlers.set(eventName, new Set())
    }

    // biome-ignore lint/style/noNonNullAssertion: Safe after has() check above
    const handlers = eventHandlers.get(eventName)!
    handlers.add(handler)

    // Return unregister function
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        eventHandlers.delete(eventName)
      }
    }
  }

  /**
   * Emit event to native side
   */
  function emit<K extends keyof NonNullable<TContract['web']>>(
    event: K,
    data: InferInput<NonNullable<TContract['web']>[K]>
  ): void {
    if (!isWebView) {
      return
    }

    const message: EventMessage = {
      id: generateCorrelationId(),
      type: 'event',
      event: event as string,
      data,
    }

    postToNative(message)
  }

  /**
   * Register procedure handler for web procedures
   */
  function handleWebProcedure<K extends keyof NonNullable<TContract['web']>>(
    procedure: K,
    handler: Handler<
      InferInput<NonNullable<TContract['web']>[K]>,
      InferReturns<NonNullable<TContract['web']>[K]>
    >
  ): () => void {
    const procedureName = procedure as string
    procedureHandlers.set(procedureName, handler)

    // Return unregister function
    return () => {
      procedureHandlers.delete(procedureName)
    }
  }

  /**
   * Cleanup all resources
   */
  const cleanup = (): void => {
    // Cancel all pending requests
    pendingRequests.forEach((pending, _id) => {
      clearTimeout(pending.timeoutId)
      pending.reject(new WebViewRPCError('Client cleanup', 'CLEANUP'))
    })
    pendingRequests.clear()

    // Clear all handlers
    eventHandlers.clear()
    procedureHandlers.clear()

    // Remove window listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', handleMessage)
    }
  }

  // Setup message listener
  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage)
  }

  const client: WebClient<TContract> = {
    native: {
      call,
      handle: handleNativeEvent,
    },
    web: {
      emit,
      handle: handleWebProcedure,
    },
    isWebView,
    cleanup,
  }

  return client
}
