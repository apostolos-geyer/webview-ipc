'use client'

/**
 * Utility components and hooks for conditional WebView rendering
 * @module utils
 */

import type { ReactNode } from 'react'
import { useClient } from './provider'

/**
 * Hook to check if the app is running in a React Native WebView.
 *
 * This is a convenience hook that returns just the boolean value
 * without requiring access to the full client.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isInWebView = useInWebView()
 *
 *   return (
 *     <div>
 *       {isInWebView ? 'Running in WebView' : 'Running in browser'}
 *     </div>
 *   )
 * }
 * ```
 *
 * @returns true if running in a React Native WebView, false otherwise
 * @throws Error if used outside WebViewRPCProvider
 */
export function useInWebView(): boolean {
  const client = useClient()
  return client.isWebView
}

/**
 * Component that renders its children only when running inside a React Native WebView.
 *
 * Useful for conditionally rendering native-specific UI or features that
 * only work within the WebView environment.
 *
 * @example
 * ```typescript
 * function App() {
 *   return (
 *     <div>
 *       <h1>My App</h1>
 *       <InWebView>
 *         <NativeShareButton />
 *       </InWebView>
 *     </div>
 *   )
 * }
 * ```
 *
 * @param props - Component props
 * @param props.children - Content to render when in WebView
 * @returns Children if in WebView, null otherwise
 */
export function InWebView({ children }: { children: ReactNode }): ReactNode {
  const isInWebView = useInWebView()
  return isInWebView ? children : null
}

/**
 * Component that renders its children only when NOT running inside a React Native WebView.
 *
 * Useful for conditionally rendering browser-specific UI or fallback features
 * that should only appear in standard web browsers.
 *
 * @example
 * ```typescript
 * function App() {
 *   return (
 *     <div>
 *       <h1>My App</h1>
 *       <NotInWebView>
 *         <BrowserOnlyFeature />
 *       </NotInWebView>
 *     </div>
 *   )
 * }
 * ```
 *
 * @param props - Component props
 * @param props.children - Content to render when not in WebView
 * @returns Children if not in WebView, null otherwise
 */
export function NotInWebView({ children }: { children: ReactNode }): ReactNode {
  const isInWebView = useInWebView()
  return !isInWebView ? children : null
}
