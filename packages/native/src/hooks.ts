/**
 * React hooks for WebView RPC
 * @module hooks
 */

import type { Contract, InferInput, InferReturns } from '@webview-rpc/core'
import { useEffect, useMemo, useRef } from 'react'
import { createNativeClient } from './client'
import type { Handler, NativeClient, NativeClientOptions } from './types'

/**
 * Hook to create a native client for WebView RPC communication.
 *
 * The client is created once and memoized for the lifetime of the component.
 * Cleanup is automatically handled on unmount.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const webViewRef = useRef<WebView>(null)
 *
 *   const client = useNativeClient({
 *     webViewRef,
 *     contract,
 *     timeout: 5000
 *   })
 *
 *   const handleNavigate = async () => {
 *     const result = await client.web.call('navigate', { path: '/home' })
 *     console.log('Navigation result:', result)
 *   }
 *
 *   return (
 *     <WebView
 *       ref={webViewRef}
 *       onMessage={client.handleMessage}
 *       source={{ uri: 'https://app.com' }}
 *     />
 *   )
 * }
 * ```
 *
 * @param options - Configuration options for the client
 * @returns Native client instance
 */
export function useNativeClient<TContract extends Contract>(
  options: NativeClientOptions<TContract>
): NativeClient<TContract> {
  // Create client once and memoize it
  const client = useMemo(
    () => createNativeClient(options),
    // We use a ref to the options object to avoid recreating the client
    // unless the options object identity changes
    [options]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      client.cleanup()
    }
  }, [client])

  return client
}

/**
 * Hook to register an event listener for messages from the web side.
 *
 * The handler is automatically registered on mount and unregistered on unmount.
 * Changes to the handler function will re-register the listener.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const client = useNativeClient({ webViewRef, contract })
 *
 *   // Listen to events from web
 *   useEvent(client, 'web', 'pathChanged', (data) => {
 *     console.log('Web navigated to:', data.path)
 *   })
 *
 *   return <WebView ref={webViewRef} onMessage={client.handleMessage} />
 * }
 * ```
 *
 * @param client - The native client instance
 * @param side - Which side to listen to ('web' or 'native')
 * @param eventName - Name of the event to listen for
 * @param handler - Handler function to execute when event is received
 */
export function useEvent<
  TContract extends Contract,
  TSide extends 'web' | 'native',
  TEventName extends keyof TContract[TSide],
>(
  client: NativeClient<TContract>,
  side: TSide,
  eventName: TEventName,
  handler: Handler<
    InferInput<TContract[TSide][TEventName]>,
    TContract[TSide][TEventName] extends { returns: unknown }
      ? InferReturns<TContract[TSide][TEventName]>
      : void
  >
): void {
  // Use a ref to track the latest handler without causing re-registration
  const handlerRef = useRef(handler)

  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  // Register/unregister the event listener
  useEffect(() => {
    // Create a stable wrapper that calls the latest handler
    const stableHandler = (data: InferInput<TContract[TSide][TEventName]>) => {
      handlerRef.current(data)
    }

    // Register the handler
    // We need to cast because TypeScript can't infer the union properly
    const unsubscribe =
      side === 'web'
        ? client.web.handle(eventName as never, stableHandler as never)
        : client.native.handle(eventName as never, stableHandler as never)

    // Cleanup on unmount or when dependencies change
    return unsubscribe
  }, [client, side, eventName])
}
