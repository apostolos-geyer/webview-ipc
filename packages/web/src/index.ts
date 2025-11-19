/**
 * @webview-rpc/web
 *
 * Web/React client for WebView RPC communication.
 * Provides type-safe RPC client for web apps running in React Native WebView.
 *
 * @module @webview-rpc/web
 */

// Client
export { createWebClient } from './client'

// Provider and hooks
export { WebViewRPCProvider, useClient } from './provider'
export { useEvent, useProcedure } from './hooks'

// Utility components and hooks
export { useInWebView, InWebView, NotInWebView } from './utils'

// Types
export type {
  WebClient,
  WebClientOptions,
  Handler,
  EventHandler,
} from './types'

export type { WebViewRPCProviderProps } from './provider'

export type {
  ProcedureState,
  ProcedureHook,
} from './hooks'
