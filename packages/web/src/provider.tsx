'use client'

/**
 * React context provider for WebView RPC client
 * @module provider
 */

import type { Contract } from '@webview-rpc/core'
import React, { type ReactNode, createContext, useContext, useEffect, useRef } from 'react'
import { createWebClient } from './client'
import type { WebClient, WebClientOptions } from './types'

/**
 * Context for WebView RPC client
 */
// biome-ignore lint/suspicious/noExplicitAny: Context must accept any contract type for flexibility
const WebViewRPCContext = createContext<WebClient<any> | null>(null)

/**
 * Props for WebViewRPCProvider
 */
export interface WebViewRPCProviderProps<TContract extends Contract> {
  /**
   * The shared RPC contract
   */
  contract: TContract

  /**
   * Optional client configuration
   */
  options?: WebClientOptions

  /**
   * Child components
   */
  children: ReactNode
}

/**
 * Provider component that creates and manages a WebView RPC client.
 *
 * Wraps your app and provides the client instance to all child components
 * via the useClient hook.
 *
 * @example
 * ```typescript
 * import { WebViewRPCProvider } from '@webview-rpc/web'
 * import { contract } from './contract'
 *
 * function App() {
 *   return (
 *     <WebViewRPCProvider contract={contract}>
 *       <MyComponent />
 *     </WebViewRPCProvider>
 *   )
 * }
 * ```
 *
 * @param props - Provider props including contract and options
 * @returns Provider component
 */
export function WebViewRPCProvider<TContract extends Contract>(
  props: WebViewRPCProviderProps<TContract>
): ReactNode {
  const { contract, options, children } = props

  // Create client instance only once, never recreate even if contract changes
  // This prevents duplicate event listeners in development mode with HMR
  const clientRef = useRef<WebClient<TContract> | null>(null)

  if (!clientRef.current) {
    clientRef.current = createWebClient(contract, options)
  }

  const client = clientRef.current

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      client.cleanup()
    }
  }, [client])

  return <WebViewRPCContext.Provider value={client}>{children}</WebViewRPCContext.Provider>
}

/**
 * Hook to access the WebView RPC client from context.
 *
 * Must be used within a WebViewRPCProvider.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const client = useClient()
 *
 *   const handleClick = async () => {
 *     const result = await client.native.call('share', { url: 'https://example.com' })
 *   }
 *
 *   return <button onClick={handleClick}>Share</button>
 * }
 * ```
 *
 * @returns WebClient instance
 * @throws Error if used outside WebViewRPCProvider
 */
// biome-ignore lint/suspicious/noExplicitAny: Default type parameter for generic hook usage
export function useClient<TContract extends Contract = any>(): WebClient<TContract> {
  const client = useContext(WebViewRPCContext)

  if (!client) {
    throw new Error('useClient must be used within a WebViewRPCProvider')
  }

  return client as WebClient<TContract>
}
