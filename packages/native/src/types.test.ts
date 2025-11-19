/**
 * Type tests for native client types
 */

import type { Contract } from '@webview-rpc/core'
import type { RefObject } from 'react'
import type { WebView } from 'react-native-webview'
import { describe, expect, it } from 'vitest'
import { expectTypeOf } from 'vitest'
import type { Handler, Handlers, NativeClient, NativeClientOptions } from './types'

describe('types', () => {
  describe('NativeClientOptions', () => {
    it('should accept required webViewRef and contract', () => {
      const mockWebViewRef: RefObject<WebView> = { current: null }
      const mockContract: Contract = { web: {}, native: {} }

      const options: NativeClientOptions = {
        webViewRef: mockWebViewRef,
        contract: mockContract,
      }

      expect(options.webViewRef).toBe(mockWebViewRef)
      expect(options.contract).toBe(mockContract)
    })

    it('should accept optional serializer and deserializer', () => {
      const mockWebViewRef: RefObject<WebView> = { current: null }
      const mockContract: Contract = { web: {}, native: {} }

      const options: NativeClientOptions = {
        webViewRef: mockWebViewRef,
        contract: mockContract,
        serializer: (data: unknown) => JSON.stringify(data),
        deserializer: (data: string) => JSON.parse(data),
      }

      expect(options.serializer).toBeDefined()
      expect(options.deserializer).toBeDefined()
    })

    it('should accept optional timeout', () => {
      const mockWebViewRef: RefObject<WebView> = { current: null }
      const mockContract: Contract = { web: {}, native: {} }

      const options: NativeClientOptions = {
        webViewRef: mockWebViewRef,
        contract: mockContract,
        timeout: 10000,
      }

      expect(options.timeout).toBe(10000)
    })

    it('should accept optional onError handler', () => {
      const mockWebViewRef: RefObject<WebView> = { current: null }
      const mockContract: Contract = { web: {}, native: {} }
      const onError = (error: Error) => console.error(error)

      const options: NativeClientOptions = {
        webViewRef: mockWebViewRef,
        contract: mockContract,
        onError,
      }

      expect(options.onError).toBe(onError)
    })
  })

  describe('Handler', () => {
    it('should accept sync function', () => {
      const handler: Handler<{ name: string }, { greeting: string }> = (data) => {
        return { greeting: `Hello, ${data.name}` }
      }

      const result = handler({ name: 'World' })
      expect(result).toEqual({ greeting: 'Hello, World' })
    })

    it('should accept async function', async () => {
      const handler: Handler<{ name: string }, { greeting: string }> = async (data) => {
        return { greeting: `Hello, ${data.name}` }
      }

      const result = await handler({ name: 'World' })
      expect(result).toEqual({ greeting: 'Hello, World' })
    })

    it('should accept void return for events', () => {
      const handler: Handler<{ state: string }, void> = (data) => {
        console.log(`State: ${data.state}`)
      }

      const result = handler({ state: 'active' })
      expect(result).toBeUndefined()
    })
  })

  describe('Handlers', () => {
    it('should allow partial handler map', () => {
      type MyHandlers = Handlers<{
        proc1: { '~standard': unknown }
        proc2: { '~standard': unknown }
      }>

      const handlers: MyHandlers = {
        proc1: (data) => console.log(data),
        // proc2 is optional
      }

      expect(handlers.proc1).toBeDefined()
    })
  })

  describe('NativeClient type inference', () => {
    it('should infer web.call parameter and return types from contract', () => {
      type MockContract = Contract<{
        web: {
          navigate: {
            '~standard': { version: 1 }
            types?: {
              input: { path: string }
              output: { path: string }
            }
            returns: (schema: unknown) => unknown
            _returnSchema?: {
              '~standard': { version: 1 }
              types?: {
                input: { success: boolean }
                output: { success: boolean }
              }
            }
          }
        }
        native: Record<string, never>
      }>

      expectTypeOf<NativeClient<MockContract>['web']['call']>()
        .parameter(0)
        .toEqualTypeOf<'navigate'>()

      expectTypeOf<NativeClient<MockContract>['web']['call']>()
        .parameter(1)
        .toEqualTypeOf<{ path: string }>()

      expectTypeOf<ReturnType<NativeClient<MockContract>['web']['call']>>().resolves.toEqualTypeOf<{
        success: boolean
      }>()
    })

    it('should infer web.emit parameter types from contract', () => {
      type MockContract = Contract<{
        web: {
          pathChanged: {
            '~standard': { version: 1 }
            types?: {
              input: { path: string }
              output: { path: string }
            }
          }
        }
        native: Record<string, never>
      }>

      expectTypeOf<NativeClient<MockContract>['web']['emit']>()
        .parameter(0)
        .toEqualTypeOf<'pathChanged'>()

      expectTypeOf<NativeClient<MockContract>['web']['emit']>()
        .parameter(1)
        .toEqualTypeOf<{ path: string }>()
    })

    it('should infer native.handle parameter and return types from contract', () => {
      type MockContract = Contract<{
        web: Record<string, never>
        native: {
          share: {
            '~standard': { version: 1 }
            types?: {
              input: { url: string; title: string }
              output: { url: string; title: string }
            }
            returns: (schema: unknown) => unknown
            _returnSchema?: {
              '~standard': { version: 1 }
              types?: {
                input: { success: boolean }
                output: { success: boolean }
              }
            }
          }
        }
      }>

      expectTypeOf<NativeClient<MockContract>['native']['handle']>()
        .parameter(0)
        .toEqualTypeOf<'share'>()

      expectTypeOf<Parameters<NativeClient<MockContract>['native']['handle']>[1]>()
        .parameter(0)
        .toEqualTypeOf<{ url: string; title: string }>()

      expectTypeOf<
        ReturnType<Parameters<NativeClient<MockContract>['native']['handle']>[1]>
      >().resolves.toEqualTypeOf<{ success: boolean }>()
    })
  })
})
