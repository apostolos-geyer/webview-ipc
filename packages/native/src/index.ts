/**
 * @webview-rpc/native
 *
 * React Native client for WebView RPC communication.
 * Provides type-safe bidirectional communication between React Native
 * and embedded web content (Next.js, React, etc).
 *
 * @module @webview-rpc/native
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
 * const result = await client.web.call('navigate', { path: '/home' })
 *
 * // Emit event to web
 * client.native.emit('appStateChange', { state: 'active' })
 *
 * // Handle web requests
 * client.native.handle('share', async (data) => {
 *   await Share.share({ url: data.url, title: data.title })
 *   return { success: true }
 * })
 * ```
 */

// Client creation
export { createNativeClient } from './client'

// React hooks
export { useNativeClient, useEvent } from './hooks'

// Type definitions
export type {
  NativeClient,
  NativeClientOptions,
  Handler,
  Handlers,
} from './types'
