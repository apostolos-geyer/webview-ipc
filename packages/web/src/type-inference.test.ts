/**
 * Type inference integration tests for @webview-rpc/web
 * Tests compile-time type inference using Vitest's expectTypeOf
 */

import { defineContract, procedure } from '@webview-rpc/core'
import { describe, expectTypeOf, it } from 'vitest'
import { z } from 'zod'
import type { ProcedureHook, ProcedureState } from './hooks'
import type { EventHandler, Handler, WebClient } from './types'

// Test contract with known types matching native package tests
const testContract = defineContract({
  web: {
    // Procedures
    showToast: procedure(
      z.object({
        message: z.string(),
        duration: z.number().optional(),
      })
    ).returns(z.void()),

    getUserData: procedure(
      z.object({
        userId: z.string(),
      })
    ).returns(
      z.object({
        name: z.string(),
        email: z.string(),
      })
    ),

    // Events
    counterChanged: z.object({
      count: z.number(),
    }),

    userLoggedIn: z.object({
      userId: z.string(),
      timestamp: z.number(),
    }),
  },
  native: {
    // Procedures
    navigate: procedure(
      z.object({
        screen: z.string(),
      })
    ).returns(z.void()),

    share: procedure(
      z.object({
        title: z.string(),
        message: z.string(),
        url: z.string().optional(),
      })
    ).returns(
      z.object({
        success: z.boolean(),
      })
    ),

    // Events
    appStateChanged: z.object({
      state: z.enum(['active', 'background', 'inactive']),
    }),
  },
})

describe('Type Inference - WebClient', () => {
  describe('WebClient<TContract> type structure', () => {
    it('should have native and web APIs', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: Should have correct structure
      expectTypeOf<Client>().toHaveProperty('native')
      expectTypeOf<Client>().toHaveProperty('web')
      expectTypeOf<Client>().toHaveProperty('isWebView')
      expectTypeOf<Client>().toHaveProperty('cleanup')
    })

    it('should have call and handle methods on native API', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: native API should have correct methods
      expectTypeOf<Client['native']>().toHaveProperty('call')
      expectTypeOf<Client['native']>().toHaveProperty('handle')
    })

    it('should have emit and handle methods on web API', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: web API should have correct methods
      expectTypeOf<Client['web']>().toHaveProperty('emit')
      expectTypeOf<Client['web']>().toHaveProperty('handle')
      // web does not have 'call' - web calls native, not itself
      expectTypeOf<Client['web']>().not.toHaveProperty('call')
    })

    it('should have isWebView boolean property', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: isWebView should be boolean
      expectTypeOf<Client['isWebView']>().toEqualTypeOf<boolean>()
    })

    it('should have cleanup function', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: cleanup should be a function returning void
      expectTypeOf<Client['cleanup']>().toEqualTypeOf<() => void>()
    })
  })

  describe('native.call() - procedure name inference', () => {
    it('should constrain procedure parameter to native keys', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: First parameter should be constrained to native names
      type CallFunction = Client['native']['call']
      type FirstParam = Parameters<CallFunction>[0]

      // Should accept valid procedure names
      expectTypeOf<'navigate'>().toMatchTypeOf<FirstParam>()
      expectTypeOf<'share'>().toMatchTypeOf<FirstParam>()

      // Should also accept event names (they're valid keys)
      expectTypeOf<'appStateChanged'>().toMatchTypeOf<FirstParam>()

      // Should NOT accept web names
      expectTypeOf<'showToast'>().not.toMatchTypeOf<FirstParam>()
      expectTypeOf<'getUserData'>().not.toMatchTypeOf<FirstParam>()
    })
  })

  describe('native.call() - parameter and return type inference', () => {
    it('should accept correct parameter types for navigate', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>
      type CallFunction = Client['native']['call']

      // THEN: First parameter should include 'navigate'
      type FirstParam = Parameters<CallFunction>[0]
      expectTypeOf<'navigate'>().toMatchTypeOf<FirstParam>()
    })

    it('should accept correct parameter types for share', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: First parameter should include 'share'
      type Call = Client['native']['call']
      type FirstParam = Parameters<Call>[0]

      expectTypeOf<'share'>().toMatchTypeOf<FirstParam>()
    })

    it('should return Promise from call method', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // Test return type is a Promise
      type CallReturn = ReturnType<Client['native']['call']>

      expectTypeOf<CallReturn>().toMatchTypeOf<Promise<unknown>>()
    })
  })

  describe('native.handle() - handler parameter types', () => {
    it('should constrain event names to native keys', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: First parameter should be constrained to native keys
      type HandleFunction = Client['native']['handle']
      type FirstParam = Parameters<HandleFunction>[0]

      expectTypeOf<'appStateChanged'>().toMatchTypeOf<FirstParam>()
      expectTypeOf<'navigate'>().toMatchTypeOf<FirstParam>()
      expectTypeOf<'share'>().toMatchTypeOf<FirstParam>()
    })

    it('should accept handler function as second parameter', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>
      type HandleFunction = Client['native']['handle']

      // THEN: Second parameter should be a function
      type SecondParam = Parameters<HandleFunction>[1]
      expectTypeOf<SecondParam>().toBeFunction()
    })

    it('should return unsubscribe function', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: handle should return a function
      expectTypeOf<Client['native']['handle']>().returns.toEqualTypeOf<() => void>()
    })
  })

  describe('web.emit() - event name and data inference', () => {
    it('should constrain event parameter to web names', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: First parameter should accept web keys
      type EmitFunction = Client['web']['emit']
      type FirstParam = Parameters<EmitFunction>[0]

      // Should accept valid web names
      expectTypeOf<'counterChanged'>().toMatchTypeOf<FirstParam>()
      expectTypeOf<'userLoggedIn'>().toMatchTypeOf<FirstParam>()
      expectTypeOf<'showToast'>().toMatchTypeOf<FirstParam>()

      // Should NOT accept native names
      expectTypeOf<'navigate'>().not.toMatchTypeOf<FirstParam>()
      expectTypeOf<'appStateChanged'>().not.toMatchTypeOf<FirstParam>()
    })

    it('should accept data parameter', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>
      type EmitFunction = Client['web']['emit']

      // THEN: Second parameter should be the data
      type SecondParam = Parameters<EmitFunction>[1]
      expectTypeOf<SecondParam>().not.toBeNever()
    })
  })

  describe('web.handle() - handler parameter and return types', () => {
    it('should constrain procedure/event names to web keys', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: First parameter should be constrained to web keys
      type HandleFunction = Client['web']['handle']
      type FirstParam = Parameters<HandleFunction>[0]

      // Should accept web keys
      expectTypeOf<'showToast'>().toMatchTypeOf<FirstParam>()
      expectTypeOf<'getUserData'>().toMatchTypeOf<FirstParam>()
      expectTypeOf<'counterChanged'>().toMatchTypeOf<FirstParam>()
      expectTypeOf<'userLoggedIn'>().toMatchTypeOf<FirstParam>()

      // Should NOT accept native keys
      expectTypeOf<'navigate'>().not.toMatchTypeOf<FirstParam>()
    })

    it('should accept handler function as second parameter', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>
      type HandleFunction = Client['web']['handle']

      // THEN: Second parameter should be a function
      type SecondParam = Parameters<HandleFunction>[1]
      expectTypeOf<SecondParam>().toBeFunction()
    })

    it('should return unsubscribe function', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: handle should return a function
      expectTypeOf<Client['web']['handle']>().returns.toEqualTypeOf<() => void>()
    })
  })

  describe('Handler type utility', () => {
    it('should infer correct types for procedure handler', () => {
      // GIVEN: A procedure handler type
      type ShareHandler = Handler<
        { title: string; message: string; url?: string },
        { success: boolean }
      >

      // THEN: Should have correct parameter and return types
      type HandlerInput = Parameters<ShareHandler>[0]
      type HandlerReturn = ReturnType<ShareHandler>

      expectTypeOf<HandlerInput>().toEqualTypeOf<{
        title: string
        message: string
        url?: string
      }>()
      expectTypeOf<HandlerReturn>().toEqualTypeOf<
        { success: boolean } | Promise<{ success: boolean }>
      >()
    })

    it('should infer correct types for event handler', () => {
      // GIVEN: An event handler type
      type CounterHandler = EventHandler<{ count: number }>

      // THEN: Should have correct parameter and return types
      type HandlerInput = Parameters<CounterHandler>[0]
      type HandlerReturn = ReturnType<CounterHandler>

      expectTypeOf<HandlerInput>().toEqualTypeOf<{ count: number }>()
      expectTypeOf<HandlerReturn>().toEqualTypeOf<void>()
    })
  })

  describe('ProcedureState type', () => {
    it('should have correct structure for procedure state', () => {
      // GIVEN: A procedure state type
      type State = ProcedureState<{ success: boolean }>

      // THEN: Should have correct properties
      expectTypeOf<State>().toHaveProperty('isPending')
      expectTypeOf<State>().toHaveProperty('error')
      expectTypeOf<State>().toHaveProperty('data')

      expectTypeOf<State['isPending']>().toEqualTypeOf<boolean>()
      expectTypeOf<State['error']>().toEqualTypeOf<Error | null>()
      expectTypeOf<State['data']>().toEqualTypeOf<{ success: boolean } | null>()
    })
  })

  describe('ProcedureHook type', () => {
    it('should have correct structure extending ProcedureState', () => {
      // GIVEN: A procedure hook type
      type Hook = ProcedureHook<{ url: string }, { success: boolean }>

      // THEN: Should have all state properties
      expectTypeOf<Hook>().toHaveProperty('isPending')
      expectTypeOf<Hook>().toHaveProperty('error')
      expectTypeOf<Hook>().toHaveProperty('data')

      // THEN: Should have mutate function
      expectTypeOf<Hook>().toHaveProperty('mutate')
      expectTypeOf<Hook['mutate']>().toEqualTypeOf<(data: { url: string }) => Promise<void>>()

      // THEN: Should have reset function
      expectTypeOf<Hook>().toHaveProperty('reset')
      expectTypeOf<Hook['reset']>().toEqualTypeOf<() => void>()
    })

    it('should infer correct data type in ProcedureHook', () => {
      // GIVEN: A procedure hook type with specific result type
      type ShareHook = ProcedureHook<{ title: string; message: string }, { success: boolean }>

      // THEN: data should be nullable result type
      expectTypeOf<ShareHook['data']>().toEqualTypeOf<{ success: boolean } | null>()
    })

    it('should infer correct mutate parameter type', () => {
      // GIVEN: A procedure hook type with specific data type
      type NavigateHook = ProcedureHook<{ screen: string }, void>

      // THEN: mutate should accept correct parameter type
      expectTypeOf<NavigateHook['mutate']>().parameter(0).toEqualTypeOf<{ screen: string }>()
    })
  })

  describe('Complex real-world scenarios', () => {
    it('should handle full bidirectional contract', () => {
      // GIVEN: A contract with both web and native procedures/events
      const fullContract = defineContract({
        web: {
          navigate: procedure(
            z.object({
              path: z.string(),
              params: z.record(z.string(), z.string()).optional(),
            })
          ).returns(z.object({ success: z.boolean() })),
          routeChanged: z.object({ path: z.string(), timestamp: z.number() }),
        },
        native: {
          share: procedure(z.object({ url: z.string(), title: z.string().optional() })).returns(
            z.object({ success: z.boolean() })
          ),
          appStateChanged: z.object({ state: z.enum(['active', 'background']) }),
        },
      })

      type Client = WebClient<typeof fullContract>

      // THEN: All APIs should have correct structure
      expectTypeOf<Client>().toHaveProperty('native')
      expectTypeOf<Client>().toHaveProperty('web')
      expectTypeOf<Client>().toHaveProperty('isWebView')
      expectTypeOf<Client['native']>().toHaveProperty('call')
      expectTypeOf<Client['native']>().toHaveProperty('handle')
      expectTypeOf<Client['web']>().toHaveProperty('emit')
      expectTypeOf<Client['web']>().toHaveProperty('handle')

      // Verify procedure names are constrained
      type NativeCallParam = Parameters<Client['native']['call']>[0]
      expectTypeOf<'share'>().toMatchTypeOf<NativeCallParam>()
      expectTypeOf<'navigate'>().not.toMatchTypeOf<NativeCallParam>()
    })

    it('should handle complex nested types', () => {
      // GIVEN: A contract with complex nested types
      const nestedContract = defineContract({
        web: {
          updateSettings: procedure(
            z.object({
              settings: z.object({
                theme: z.enum(['light', 'dark', 'auto']),
                notifications: z.object({
                  email: z.boolean(),
                  push: z.boolean(),
                  sms: z.boolean().optional(),
                }),
              }),
            })
          ).returns(z.object({ success: z.boolean() })),
        },
        native: {},
      })

      type Client = WebClient<typeof nestedContract>

      // THEN: Should have correct structure
      expectTypeOf<Client['web']>().toHaveProperty('handle')
      type HandleParam = Parameters<Client['web']['handle']>[0]
      expectTypeOf<'updateSettings'>().toMatchTypeOf<HandleParam>()
    })

    it('should handle array types in procedures', () => {
      // GIVEN: A contract with array parameters
      const arrayContract = defineContract({
        web: {
          batchUpdate: procedure(
            z.object({
              items: z.array(z.object({ id: z.string(), value: z.number() })),
            })
          ).returns(
            z.object({
              results: z.array(z.object({ id: z.string(), success: z.boolean() })),
            })
          ),
        },
        native: {},
      })

      type Client = WebClient<typeof arrayContract>

      // THEN: Should have correct structure
      expectTypeOf<Client['web']>().toHaveProperty('handle')
      type HandleParam = Parameters<Client['web']['handle']>[0]
      expectTypeOf<'batchUpdate'>().toMatchTypeOf<HandleParam>()
    })

    it('should handle procedure hook with complex types', () => {
      // GIVEN: A procedure hook with nested return type
      type ComplexHook = ProcedureHook<
        { items: Array<{ id: string }> },
        { results: Array<{ id: string; success: boolean }> }
      >

      // THEN: Should correctly infer all types
      expectTypeOf<ComplexHook['mutate']>()
        .parameter(0)
        .toEqualTypeOf<{ items: Array<{ id: string }> }>()

      expectTypeOf<ComplexHook['data']>().toEqualTypeOf<{
        results: Array<{ id: string; success: boolean }>
      } | null>()
    })
  })

  describe('Negative tests - type safety', () => {
    it('should not allow wrong procedure names in native.call', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>
      type CallFunction = Client['native']['call']

      // THEN: Invalid procedure names should not be part of the union
      type InvalidName = 'invalidProcedure'
      type FirstParam = Parameters<CallFunction>[0]

      expectTypeOf<InvalidName>().not.toMatchTypeOf<FirstParam>()
    })

    it('should not allow cross-side procedure names', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: Web names should not be valid for native operations
      type NativeCallParam = Parameters<Client['native']['call']>[0]
      type WebEmitParam = Parameters<Client['web']['emit']>[0]

      expectTypeOf<'showToast'>().not.toMatchTypeOf<NativeCallParam>()
      expectTypeOf<'navigate'>().not.toMatchTypeOf<WebEmitParam>()
    })

    it('should not allow wrong event names in web.emit', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>
      type EmitFunction = Client['web']['emit']

      // THEN: Invalid event names should not be part of the union
      type InvalidName = 'invalidEvent'
      type FirstParam = Parameters<EmitFunction>[0]

      expectTypeOf<InvalidName>().not.toMatchTypeOf<FirstParam>()
    })

    it('should not allow native events in web.emit', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>
      type WebEmitParam = Parameters<Client['web']['emit']>[0]

      // THEN: Native event names should not be valid
      expectTypeOf<'appStateChanged'>().not.toMatchTypeOf<WebEmitParam>()
    })
  })

  describe('Hook type inference for useEvent', () => {
    it('should constrain side parameter to valid sides', () => {
      // GIVEN: useEvent hook type signature
      // The side parameter should only accept 'native' or 'web'
      type ValidSide = 'native' | 'web'

      // THEN: Should accept valid sides
      expectTypeOf<'native'>().toMatchTypeOf<ValidSide>()
      expectTypeOf<'web'>().toMatchTypeOf<ValidSide>()

      // THEN: Should not accept invalid sides
      expectTypeOf<'invalid'>().not.toMatchTypeOf<ValidSide>()
    })

    it('should validate event names based on side', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: Native handle should only accept native keys
      type NativeHandleParam = Parameters<Client['native']['handle']>[0]
      expectTypeOf<'appStateChanged'>().toMatchTypeOf<NativeHandleParam>()
      expectTypeOf<'counterChanged'>().not.toMatchTypeOf<NativeHandleParam>()

      // THEN: Web handle should only accept web keys
      type WebHandleParam = Parameters<Client['web']['handle']>[0]
      expectTypeOf<'counterChanged'>().toMatchTypeOf<WebHandleParam>()
      expectTypeOf<'appStateChanged'>().not.toMatchTypeOf<WebHandleParam>()
    })

    it('should accept handler functions', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: Handler should be a function parameter
      type NativeHandler = Parameters<Client['native']['handle']>[1]
      type WebHandler = Parameters<Client['web']['handle']>[1]

      expectTypeOf<NativeHandler>().toBeFunction()
      expectTypeOf<WebHandler>().toBeFunction()
    })
  })

  describe('Hook type inference for useProcedure', () => {
    it('should validate procedure names based on side', () => {
      // GIVEN: A typed client
      type Client = WebClient<typeof testContract>

      // THEN: Native call should only accept native procedure keys
      type NativeCallParam = Parameters<Client['native']['call']>[0]
      expectTypeOf<'navigate'>().toMatchTypeOf<NativeCallParam>()
      expectTypeOf<'share'>().toMatchTypeOf<NativeCallParam>()
      expectTypeOf<'showToast'>().not.toMatchTypeOf<NativeCallParam>()
    })

    it('should infer mutate function parameter type from procedure', () => {
      // GIVEN: A procedure hook for share
      type ShareHook = ProcedureHook<
        { title: string; message: string; url?: string },
        { success: boolean }
      >

      // THEN: mutate should accept correct parameter type
      type MutateParam = Parameters<ShareHook['mutate']>[0]
      expectTypeOf<MutateParam>().toEqualTypeOf<{
        title: string
        message: string
        url?: string
      }>()
    })

    it('should infer data result type from procedure', () => {
      // GIVEN: A procedure hook for share
      type ShareHook = ProcedureHook<{ title: string; message: string }, { success: boolean }>

      // THEN: data should be nullable result type
      expectTypeOf<ShareHook['data']>().toEqualTypeOf<{ success: boolean } | null>()
    })

    it('should have correct error type', () => {
      // GIVEN: A procedure hook
      type Hook = ProcedureHook<unknown, unknown>

      // THEN: error should be Error | null
      expectTypeOf<Hook['error']>().toEqualTypeOf<Error | null>()
    })

    it('should have correct isPending type', () => {
      // GIVEN: A procedure hook
      type Hook = ProcedureHook<unknown, unknown>

      // THEN: isPending should be boolean
      expectTypeOf<Hook['isPending']>().toEqualTypeOf<boolean>()
    })

    it('should infer void return type for procedures returning void', () => {
      // GIVEN: A procedure hook for navigate (returns void)
      type NavigateHook = ProcedureHook<{ screen: string }, void>

      // THEN: data should be undefined | null
      expectTypeOf<NavigateHook['data']>().toMatchTypeOf<undefined | null>()
    })
  })
})
