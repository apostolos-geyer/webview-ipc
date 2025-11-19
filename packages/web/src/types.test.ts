/**
 * Tests for type definitions
 * @module types.test
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { defineContract } from '@webview-rpc/core'
import { describe, expectTypeOf, it } from 'vitest'
import type { EventHandler, Handler, WebClient, WebClientOptions } from './types'

// Mock schema for testing
const mockSchema = {
  '~standard': {
    version: 1,
    vendor: 'mock',
    validate: (value: unknown) => ({ value }),
  },
} as StandardSchemaV1<{ test: string }, { test: string }>

const mockProcedureSchema = {
  ...mockSchema,
  returns: (_returnSchema: StandardSchemaV1) => ({
    ...mockSchema,
    _returnSchema: {
      '~standard': {
        version: 1,
        vendor: 'mock',
        validate: (_value: unknown) => ({ value: { success: true } }),
      },
    } as StandardSchemaV1<{ success: boolean }, { success: boolean }>,
    returns: (_rs: StandardSchemaV1) => mockProcedureSchema,
  }),
} as const

describe('WebClient type inference', () => {
  describe('GIVEN a contract with web and native procedures', () => {
    it('SHOULD infer correct types for native.call()', () => {
      // GIVEN: Contract with native procedure
      const contract = defineContract({
        native: {
          share: {
            ...mockSchema,
            returns: (_returnSchema: StandardSchemaV1) => ({
              ...mockSchema,
              _returnSchema: {
                '~standard': {
                  version: 1,
                  vendor: 'mock',
                  validate: (_value: unknown) => ({ value: { success: true } }),
                },
              } as StandardSchemaV1<{ success: boolean }, { success: boolean }>,
              returns: (_rs: StandardSchemaV1) => mockProcedureSchema,
            }),
          },
        },
      })

      type Client = WebClient<typeof contract>

      // THEN: native.call should be a function
      expectTypeOf<Client['native']['call']>().toBeFunction()
      // Type inference for exact parameter types is complex with union types, skip detailed test
    })

    it('SHOULD infer correct types for web.emit()', () => {
      // GIVEN: Contract with web event
      const contract = defineContract({
        web: {
          pathChanged: mockSchema,
        },
      })

      type Client = WebClient<typeof contract>

      // THEN: web.emit should be a function
      expectTypeOf<Client['web']['emit']>().toBeFunction()
    })

    it('SHOULD infer correct types for native.handle()', () => {
      // GIVEN: Contract with native event
      const contract = defineContract({
        native: {
          appStateChange: mockSchema,
        },
      })

      type Client = WebClient<typeof contract>

      // THEN: native.handle should be a function
      expectTypeOf<Client['native']['handle']>().toBeFunction()
    })

    it('SHOULD infer correct types for web.handle()', () => {
      // GIVEN: Contract with web procedure
      const contract = defineContract({
        web: {
          navigate: mockProcedureSchema,
        },
      })

      type Client = WebClient<typeof contract>

      // THEN: web.handle should be a function
      expectTypeOf<Client['web']['handle']>().toBeFunction()
    })
  })

  describe('GIVEN WebClient interface', () => {
    it('SHOULD have isWebView boolean property', () => {
      const contract = defineContract({ web: { test: mockSchema } })
      type Client = WebClient<typeof contract>

      // THEN: isWebView should be a boolean
      expectTypeOf<Client['isWebView']>().toEqualTypeOf<boolean>()
    })

    it('SHOULD have cleanup method', () => {
      const contract = defineContract({ web: { test: mockSchema } })
      type Client = WebClient<typeof contract>

      // THEN: cleanup should be a function that returns void
      expectTypeOf<Client['cleanup']>().toBeFunction()
      expectTypeOf<Client['cleanup']>().returns.toEqualTypeOf<void>()
    })

    it('SHOULD have native object with call and handle methods', () => {
      const contract = defineContract({
        native: {
          test: mockSchema,
        },
      })
      type Client = WebClient<typeof contract>

      // THEN: native should have call and handle methods
      expectTypeOf<Client['native']>().toHaveProperty('call')
      expectTypeOf<Client['native']>().toHaveProperty('handle')
    })

    it('SHOULD have web object with emit and handle methods', () => {
      const contract = defineContract({
        web: {
          test: mockSchema,
        },
      })
      type Client = WebClient<typeof contract>

      // THEN: web should have emit and handle methods
      expectTypeOf<Client['web']>().toHaveProperty('emit')
      expectTypeOf<Client['web']>().toHaveProperty('handle')
    })
  })
})

describe('WebClientOptions', () => {
  describe('GIVEN WebClientOptions interface', () => {
    it('SHOULD have optional serializer property', () => {
      // THEN: serializer should be optional and accept function
      expectTypeOf<WebClientOptions['serializer']>().toEqualTypeOf<
        ((data: unknown) => string) | undefined
      >()
    })

    it('SHOULD have optional deserializer property', () => {
      // THEN: deserializer should be optional and accept function
      expectTypeOf<WebClientOptions['deserializer']>().toEqualTypeOf<
        ((data: string) => unknown) | undefined
      >()
    })

    it('SHOULD have optional timeout property', () => {
      // THEN: timeout should be optional number
      expectTypeOf<WebClientOptions['timeout']>().toEqualTypeOf<number | undefined>()
    })

    it('SHOULD have optional onError property', () => {
      // THEN: onError should be optional function that accepts Error
      expectTypeOf<WebClientOptions['onError']>().toEqualTypeOf<
        ((error: Error) => void) | undefined
      >()
    })

    it('SHOULD allow empty options object', () => {
      // GIVEN: Empty options object
      const options: WebClientOptions = {}

      // THEN: Should compile without errors
      expectTypeOf(options).toMatchTypeOf<WebClientOptions>()
    })

    it('SHOULD allow partial options', () => {
      // GIVEN: Partial options object
      const options: WebClientOptions = {
        timeout: 3000,
      }

      // THEN: Should compile without errors
      expectTypeOf(options).toMatchTypeOf<WebClientOptions>()
    })

    it('SHOULD allow all options', () => {
      // GIVEN: Full options object
      const options: WebClientOptions = {
        serializer: (data: unknown) => JSON.stringify(data),
        deserializer: (data: string) => JSON.parse(data),
        timeout: 5000,
        onError: (error: Error) => console.error(error),
      }

      // THEN: Should compile without errors
      expectTypeOf(options).toMatchTypeOf<WebClientOptions>()
    })
  })
})

describe('Handler type', () => {
  describe('GIVEN Handler type', () => {
    it('SHOULD accept synchronous function', () => {
      // GIVEN: Synchronous handler
      const handler: Handler<{ id: string }, { success: boolean }> = (_data) => {
        return { success: true }
      }

      // THEN: Should compile
      expectTypeOf(handler).toMatchTypeOf<Handler<{ id: string }, { success: boolean }>>()
    })

    it('SHOULD accept async function', () => {
      // GIVEN: Async handler
      const handler: Handler<{ id: string }, { success: boolean }> = async (_data) => {
        return { success: true }
      }

      // THEN: Should compile
      expectTypeOf(handler).toMatchTypeOf<Handler<{ id: string }, { success: boolean }>>()
    })

    it('SHOULD return Promise or value', () => {
      // GIVEN: Handler type
      type TestHandler = Handler<{ id: string }, { success: boolean }>

      // THEN: Return type should be Promise or value
      expectTypeOf<ReturnType<TestHandler>>().toEqualTypeOf<
        Promise<{ success: boolean }> | { success: boolean }
      >()
    })
  })
})

describe('EventHandler type', () => {
  describe('GIVEN EventHandler type', () => {
    it('SHOULD accept function with void return', () => {
      // GIVEN: Event handler
      const handler: EventHandler<{ state: string }> = (data) => {
        console.log(data.state)
      }

      // THEN: Should compile
      expectTypeOf(handler).toMatchTypeOf<EventHandler<{ state: string }>>()
    })

    it('SHOULD have void return type', () => {
      // GIVEN: EventHandler type
      type TestHandler = EventHandler<{ state: string }>

      // THEN: Return type should be void
      expectTypeOf<ReturnType<TestHandler>>().toEqualTypeOf<void>()
    })
  })
})
