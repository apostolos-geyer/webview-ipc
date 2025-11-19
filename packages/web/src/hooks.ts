'use client'

/**
 * React hooks for WebView RPC
 * @module hooks
 */

import type { Contract, InferInput, InferReturns } from '@webview-rpc/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Handler } from './types'
import { useClient } from './provider'

/**
 * Hook to listen to events from the other side.
 *
 * Automatically registers the event handler and cleans up on unmount.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   // Listen to events from native
 *   useEvent('native', 'appStateChange', (data) => {
 *     console.log('App state:', data.state)
 *   })
 *
 *   return <div>Component</div>
 * }
 * ```
 *
 * @param side - Which side to listen to ('native' or 'web')
 * @param event - Event name
 * @param handler - Event handler function
 */
export function useEvent<
  TContract extends Contract,
  TSide extends 'native' | 'web',
  TEvent extends keyof NonNullable<TContract[TSide]>,
>(
  side: TSide,
  event: TEvent,
  handler: Handler<
    InferInput<NonNullable<TContract[TSide]>[TEvent]>,
    NonNullable<TContract[TSide]>[TEvent] extends { returns: unknown }
      ? InferReturns<NonNullable<TContract[TSide]>[TEvent]>
      : void
  >
): void {
  const client = useClient<TContract>()

  // Use ref to store handler to avoid re-registering on every render
  const handlerRef = useRef(handler)

  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  // Register event listener
  useEffect(() => {
    const stableHandler = (data: InferInput<NonNullable<TContract[TSide]>[TEvent]>) => {
      handlerRef.current(data)
    }

    // Use type assertion to handle the union type
    // biome-ignore lint/suspicious/noExplicitAny: Required for dynamic side access (native|web)
    const sideApi = client[side] as any
    const unregister = sideApi.handle(event, stableHandler)

    return () => {
      unregister()
    }
  }, [client, side, event])
}

/**
 * State for useProcedure hook
 */
export interface ProcedureState<TResult> {
  /**
   * Whether the procedure call is pending
   */
  isPending: boolean

  /**
   * Error from the last call (if any)
   */
  error: Error | null

  /**
   * Result from the last successful call (if any)
   */
  data: TResult | null
}

/**
 * Return type for useProcedure hook
 */
export interface ProcedureHook<TData, TResult> extends ProcedureState<TResult> {
  /**
   * Function to call the procedure
   */
  mutate: (data: TData) => Promise<void>

  /**
   * Reset the state (clear error and data)
   */
  reset: () => void
}

/**
 * Hook to call procedures on the other side with loading/error state management.
 *
 * Similar to React Query's useMutation pattern.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { mutate, isPending, error, data } = useProcedure('native', 'share')
 *
 *   const handleShare = () => {
 *     mutate({ url: 'https://example.com', title: 'Example' })
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={handleShare} disabled={isPending}>
 *         {isPending ? 'Sharing...' : 'Share'}
 *       </button>
 *       {error && <div>Error: {error.message}</div>}
 *       {data && <div>Success!</div>}
 *     </div>
 *   )
 * }
 * ```
 *
 * @param side - Which side to call ('native' or 'web')
 * @param procedure - Procedure name
 * @returns Hook state and mutation function
 */
export function useProcedure<
  TContract extends Contract,
  TSide extends 'native' | 'web',
  TProcedure extends keyof NonNullable<TContract[TSide]>,
  TData = InferInput<NonNullable<TContract[TSide]>[TProcedure]>,
  TResult = InferReturns<NonNullable<TContract[TSide]>[TProcedure]>,
>(side: TSide, procedure: TProcedure): ProcedureHook<TData, TResult> {
  const client = useClient<TContract>()

  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<TResult | null>(null)

  const mutate = useCallback(
    async (callData: TData) => {
      setIsPending(true)
      setError(null)

      try {
        // Use type assertion to handle the union type
        // biome-ignore lint/suspicious/noExplicitAny: Required for dynamic side access (native|web)
        const sideApi = client[side] as any
        const result = await sideApi.call(procedure, callData)
        setData(result as TResult)
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsPending(false)
      }
    },
    [client, side, procedure]
  )

  const reset = useCallback(() => {
    setIsPending(false)
    setError(null)
    setData(null)
  }, [])

  return {
    mutate,
    isPending,
    error,
    data,
    reset,
  }
}
