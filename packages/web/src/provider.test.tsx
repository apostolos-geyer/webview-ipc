/**
 * Tests for WebViewRPCProvider and useClient
 * @module provider.test
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { render, screen } from '@testing-library/react'
import { defineContract } from '@webview-rpc/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebViewRPCProvider, useClient } from './provider'

// Mock window.ReactNativeWebView
const mockPostMessage = vi.fn()

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    value: {
      ReactNativeWebView: {
        postMessage: mockPostMessage,
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  })
})

// Helper to create mock schema
const createMockSchema = <TInput, TOutput = TInput>(): StandardSchemaV1<TInput, TOutput> => ({
  '~standard': {
    version: 1,
    vendor: 'mock',
    validate: (value: unknown) => ({ value: value as TOutput }),
  },
})

describe('WebViewRPCProvider', () => {
  describe('GIVEN a valid contract', () => {
    it('SHOULD render children', () => {
      // GIVEN: A contract and children
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // WHEN: Rendering provider
      render(
        <WebViewRPCProvider contract={contract}>
          <div data-testid="child">Child component</div>
        </WebViewRPCProvider>
      )

      // THEN: Children should be rendered
      expect(screen.getByTestId('child')).toBeInTheDocument()
      expect(screen.getByText('Child component')).toBeInTheDocument()
    })

    it('SHOULD create client instance', () => {
      // GIVEN: Contract
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test variable capturing client from hook
      let clientInstance: any

      function TestComponent() {
        clientInstance = useClient()
        return <div>Test</div>
      }

      // WHEN: Rendering with provider
      render(
        <WebViewRPCProvider contract={contract}>
          <TestComponent />
        </WebViewRPCProvider>
      )

      // THEN: Client should be created
      expect(clientInstance).toBeDefined()
      expect(clientInstance).toHaveProperty('native')
      expect(clientInstance).toHaveProperty('web')
      expect(clientInstance).toHaveProperty('isWebView')
      expect(clientInstance).toHaveProperty('cleanup')
    })

    it('SHOULD pass options to createWebClient', () => {
      // GIVEN: Contract with options
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      const onError = vi.fn()

      // biome-ignore lint/suspicious/noExplicitAny: Test variable capturing client from hook
      let clientInstance: any

      function TestComponent() {
        clientInstance = useClient()
        return <div>Test</div>
      }

      // WHEN: Rendering with options
      render(
        <WebViewRPCProvider
          contract={contract}
          options={{
            timeout: 3000,
            onError,
          }}
        >
          <TestComponent />
        </WebViewRPCProvider>
      )

      // THEN: Client should be created with options
      expect(clientInstance).toBeDefined()
    })

    it('SHOULD provide same client instance to multiple children', () => {
      // GIVEN: Contract
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test array capturing multiple clients
      const clients: any[] = []

      function TestComponent({ id }: { id: number }) {
        const client = useClient()
        clients[id] = client
        return <div>Test {id}</div>
      }

      // WHEN: Rendering with multiple children
      render(
        <WebViewRPCProvider contract={contract}>
          <TestComponent id={0} />
          <TestComponent id={1} />
          <TestComponent id={2} />
        </WebViewRPCProvider>
      )

      // THEN: All should get same client instance
      expect(clients[0]).toBeDefined()
      expect(clients[0]).toBe(clients[1])
      expect(clients[1]).toBe(clients[2])
    })

    it('SHOULD cleanup client on unmount', () => {
      // GIVEN: Contract and rendered provider
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test variable capturing client from hook
      let clientInstance: any

      function TestComponent() {
        clientInstance = useClient()
        return <div>Test</div>
      }

      const { unmount } = render(
        <WebViewRPCProvider contract={contract}>
          <TestComponent />
        </WebViewRPCProvider>
      )

      const cleanupSpy = vi.spyOn(clientInstance, 'cleanup')

      // WHEN: Unmounting provider
      unmount()

      // THEN: Cleanup should be called
      expect(cleanupSpy).toHaveBeenCalled()
    })

    it('SHOULD not recreate client on re-render', () => {
      // GIVEN: Contract
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test array capturing multiple clients
      const clients: any[] = []

      function TestComponent() {
        const client = useClient()
        clients.push(client)
        return <div>Test</div>
      }

      // WHEN: Re-rendering multiple times
      const { rerender } = render(
        <WebViewRPCProvider contract={contract}>
          <TestComponent />
        </WebViewRPCProvider>
      )

      rerender(
        <WebViewRPCProvider contract={contract}>
          <TestComponent />
        </WebViewRPCProvider>
      )

      rerender(
        <WebViewRPCProvider contract={contract}>
          <TestComponent />
        </WebViewRPCProvider>
      )

      // THEN: Should reuse same client instance
      expect(clients.length).toBeGreaterThan(1)
      expect(clients.every((c) => c === clients[0])).toBe(true)
    })
  })
})

describe('useClient', () => {
  describe('GIVEN useClient hook', () => {
    it('SHOULD throw error when used outside provider', () => {
      // GIVEN: Component using useClient without provider
      function TestComponent() {
        useClient()
        return <div>Test</div>
      }

      // WHEN/THEN: Should throw error
      expect(() => {
        render(<TestComponent />)
      }).toThrow()
    })

    it('SHOULD return client when used inside provider', () => {
      // GIVEN: Contract and component using useClient
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test variable capturing client from hook
      let clientInstance: any

      function TestComponent() {
        clientInstance = useClient()
        return <div>Test</div>
      }

      // WHEN: Rendering with provider
      render(
        <WebViewRPCProvider contract={contract}>
          <TestComponent />
        </WebViewRPCProvider>
      )

      // THEN: Should return valid client
      expect(clientInstance).toBeDefined()
      expect(clientInstance).toHaveProperty('native')
      expect(clientInstance).toHaveProperty('web')
    })

    it('SHOULD work in nested components', () => {
      // GIVEN: Nested components using useClient
      const contract = defineContract({
        web: {
          test: createMockSchema<{ value: string }>(),
        },
      })

      // biome-ignore lint/suspicious/noExplicitAny: Test variable capturing client from hook
      let outerClient: any
      // biome-ignore lint/suspicious/noExplicitAny: Test variable capturing client from hook
      let innerClient: any

      function OuterComponent() {
        outerClient = useClient()
        return <InnerComponent />
      }

      function InnerComponent() {
        innerClient = useClient()
        return <div>Test</div>
      }

      // WHEN: Rendering nested structure
      render(
        <WebViewRPCProvider contract={contract}>
          <OuterComponent />
        </WebViewRPCProvider>
      )

      // THEN: Both should get same client
      expect(outerClient).toBeDefined()
      expect(innerClient).toBeDefined()
      expect(outerClient).toBe(innerClient)
    })
  })
})
