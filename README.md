# webview-rpc

> Type-safe bidirectional RPC for React Native WebView communication

[![npm version](https://img.shields.io/npm/v/@webviewrpc/core.svg)](https://www.npmjs.com/package/@webviewrpc/core)
[![CI](https://github.com/apostolos-geyer/webview-ipc/actions/workflows/ci.yml/badge.svg)](https://github.com/apostolos-geyer/webview-ipc/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, type-safe library for bidirectional communication between React Native apps and embedded web content via WebView. Think tRPC, but for WebView.

## The Problem

Building hybrid mobile apps with React Native WebViews often requires communication between native and web code. The standard approach using `postMessage` has several pain points:

- **No type safety** - Messages are stringly-typed, easy to break
- **Manual correlation** - Matching requests to responses requires custom correlation logic
- **Error handling** - No standardized way to handle errors across boundaries
- **Boilerplate** - Lots of repetitive serialization and message routing code

## The Solution

webview-rpc provides a tRPC-inspired API that makes WebView communication feel like calling local functions:

```typescript
// Native side - call web procedures
const result = await client.native.call('share', {
  url: 'https://example.com',
  title: 'Check this out!'
})

// Web side - call native procedures
const result = await client.web.call('getDeviceInfo', {})
```

**Key Features:**

- ✅ **Full TypeScript inference** - Types flow from contract to handler parameters
- ✅ **Request-response pattern** - Automatic correlation IDs and promise resolution
- ✅ **Fire-and-forget events** - Emit events without waiting for responses
- ✅ **Standard Schema** - Works with Zod, Valibot, ArkType, or any validation library
- ✅ **User-defined serialization** - Bring your own serializer (SuperJSON recommended)
- ✅ **Timeout handling** - Configurable timeouts with automatic cleanup
- ✅ **Error handling** - Structured errors with codes

## Installation

```bash
# Install the main package
pnpm add @webviewrpc/core

# For React Native apps
pnpm add @webviewrpc/native

# For web apps
pnpm add @webviewrpc/web

# Peer dependencies (choose your own)
pnpm add zod superjson react-native-webview
```

### React Native 0.76+ Compatibility

If using React Native 0.76+, you need to patch `react-native-webview`:

```bash
node ./scripts/patch-webview.cjs
```

Add to your root `package.json`:

```json
{
  "scripts": {
    "postinstall": "node ./scripts/patch-webview.cjs"
  }
}
```

<details>
<summary>Why is this patch needed?</summary>

React Native 0.76 removed `Image.resolveAssetSource`, breaking `react-native-webview`. The patch adds a safe fallback.

</details>

## Quick Start

### 1. Define Your Contract (Shared Package)

Create a shared contract that both native and web will import:

```typescript
// example/packages/contract/src/index.ts
import { defineContract, procedure } from '@webviewrpc/core'
import { z } from 'zod'

export const contract = defineContract({
  // Web procedures (called FROM native TO web)
  web: {
    // Request-response procedure
    showToast: procedure(z.object({
      message: z.string(),
      duration: z.number().optional(),
    })).returns(z.void()),

    updateCounter: procedure(z.object({
      value: z.number(),
    })).returns(z.void()),

    // Events emitted FROM web TO native
    counterChanged: z.object({
      count: z.number(),
    }),

    themeChanged: z.object({
      theme: z.enum(['light', 'dark']),
    }),
  },

  // Native procedures (called FROM web TO native)
  native: {
    share: procedure(z.object({
      title: z.string(),
      message: z.string(),
      url: z.string().url().optional(),
    })).returns(z.object({
      success: z.boolean(),
    })),

    getDeviceInfo: procedure(z.object({})).returns(z.object({
      platform: z.string(),
      version: z.string(),
    })),

    // Events emitted FROM native TO web
    appStateChanged: z.object({
      state: z.enum(['active', 'background', 'inactive']),
    }),
  },
})

export type Contract = typeof contract
```

### 2. Native Side (React Native + Expo)

```typescript
// app/index.tsx
import { useNativeClient, useEvent } from '@webviewrpc/native'
import { contract } from '@example/contract'
import { useRef, useState, useEffect } from 'react'
import { Platform, Alert } from 'react-native'
import WebView from 'react-native-webview'

export default function App() {
  const webViewRef = useRef<WebView>(null)
  const [counter, setCounter] = useState(0)

  // Create RPC client
  const client = useNativeClient({
    webViewRef,
    contract,
    timeout: 5000,
    onError: (error) => console.error('[Native] RPC Error:', error),
  })

  // Register handlers for web → native calls
  useEffect(() => {
    client.native.handle('share', async ({ title, message, url }) => {
      Alert.alert('Share', `${title}\n${message}\n${url || ''}`)
      return { success: true }
    })

    client.native.handle('getDeviceInfo', async () => ({
      platform: Platform.OS,
      version: Platform.Version.toString(),
    }))
  }, [client])

  // Listen to events from web
  useEvent(client, 'web', 'counterChanged', ({ count }) => {
    console.log('[Native] Counter changed:', count)
    setCounter(count)
  })

  useEvent(client, 'web', 'themeChanged', ({ theme }) => {
    console.log('[Native] Theme changed:', theme)
  })

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text>Counter: {counter}</Text>

        <Button
          title="Call Web (Toast)"
          onPress={async () => {
            try {
              await client.web.call('showToast', {
                message: 'Hello from Native!',
                duration: 3000,
              })
            } catch (error) {
              console.error('Failed:', error)
            }
          }}
        />

        <Button
          title="Call Web (Counter)"
          onPress={async () => {
            try {
              const newValue = counter + 1
              await client.web.call('updateCounter', { value: newValue })
              setCounter(newValue)
            } catch (error) {
              console.error('Failed:', error)
            }
          }}
        />
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: 'http://localhost:3000' }}
        onMessage={client.handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  )
}
```

### 3. Web Side (Next.js App Router)

**Root Layout** (app/layout.tsx):

```typescript
'use client'

import { WebViewRPCProvider } from '@webviewrpc/web'
import { contract } from '@example/contract'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WebViewRPCProvider contract={contract}>
          {children}
        </WebViewRPCProvider>
      </body>
    </html>
  )
}
```

**Page Component** (app/page.tsx):

```typescript
'use client'

import { useClient, useEvent, useProcedure } from '@webviewrpc/web'
import { contract } from '@example/contract'
import { useState, useEffect } from 'react'

type Contract = typeof contract

export default function Home() {
  const client = useClient<Contract>()
  const [counter, setCounter] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  // Register handlers for native → web calls
  useEffect(() => {
    client.web.handle('showToast', async (data) => {
      setToast(data.message)
      setTimeout(() => setToast(null), data.duration || 3000)
    })

    client.web.handle('updateCounter', async (data) => {
      setCounter(data.value)
    })
  }, [client])

  // Listen to native events
  useEvent<Contract, 'native', 'appStateChanged'>(
    'native',
    'appStateChanged',
    (data) => {
      console.log('[Web] App state:', data.state)
    }
  )

  // Use the useProcedure hook for easier state management
  const { mutate: share, isPending } = useProcedure<Contract, 'native', 'share'>(
    'native',
    'share'
  )

  const handleShare = () => {
    share({
      title: 'Check this out!',
      message: 'WebView RPC is awesome',
      url: 'https://github.com',
    })
  }

  const handleCounterIncrement = () => {
    const newCount = counter + 1
    setCounter(newCount)
    client.web.emit('counterChanged', { count: newCount })
  }

  return (
    <div>
      <h1>Counter: {counter}</h1>
      <button onClick={handleCounterIncrement}>Increment</button>

      <button onClick={handleShare} disabled={isPending}>
        {isPending ? 'Sharing...' : 'Share'}
      </button>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
```

## Core Concepts

### Contracts

Contracts define the RPC interface between native and web:

```typescript
const contract = defineContract({
  web: {
    // Procedures that can be called on the web side
    procedureName: procedure(inputSchema).returns(outputSchema),

    // Events that the web can emit
    eventName: eventSchema,
  },
  native: {
    // Procedures that can be called on the native side
    procedureName: procedure(inputSchema).returns(outputSchema),

    // Events that native can emit
    eventName: eventSchema,
  },
})
```

### Procedures vs Events

**Procedures (Request-Response):**
- Wait for a response
- Can return data
- Automatically correlated with unique IDs
- Support timeout handling
- Throw errors if handler fails

```typescript
// Call a procedure
const result = await client.native.call('share', { url: '...' })
```

**Events (Fire-and-Forget):**
- Don't wait for a response
- No return value
- Multiple handlers can listen to same event
- Used for notifications and broadcasts

```typescript
// Emit an event
client.web.emit('counterChanged', { count: 5 })

// Listen to an event
useEvent(client, 'native', 'appStateChanged', (data) => {
  console.log('State:', data.state)
})
```

### Standard Schema

webview-rpc works with any validation library that implements the Standard Schema spec:

```typescript
import { z } from 'zod'           // Zod
import * as v from 'valibot'      // Valibot
import { type } from 'arktype'    // ArkType

// All of these work:
procedure(z.object({ name: z.string() }))
procedure(v.object({ name: v.string() }))
procedure(type({ name: 'string' }))
```

### Serialization

By default, JSON is used. For complex types (Date, Map, Set, etc.), use SuperJSON:

```typescript
import superjson from 'superjson'

const client = useNativeClient({
  contract,
  webViewRef,
  serializer: superjson.stringify,
  deserializer: superjson.parse,
})
```

## API Reference

### Native Client

**`useNativeClient(options)`**

Creates a native client instance.

**Options:**
- `webViewRef` - React ref to the WebView component
- `contract` - Shared contract definition
- `timeout?` - Request timeout in ms (default: 5000)
- `serializer?` - Custom serializer function
- `deserializer?` - Custom deserializer function
- `onError?` - Error handler callback

**Returns:**
- `client.web.call(procedure, data)` - Call web procedure
- `client.web.emit(event, data)` - Emit event to web
- `client.native.handle(procedure, handler)` - Register native procedure handler
- `client.native.emit(event, data)` - Emit event to web
- `client.handleMessage` - Message handler for WebView `onMessage` prop

**`useEvent(client, side, event, handler)`**

React hook to listen to events.

### Web Client

**`<WebViewRPCProvider contract={contract} options?>`**

Provider component that creates the web client.

**`useClient<Contract>()`**

Hook to access the client instance.

**Returns:**
- `client.native.call(procedure, data)` - Call native procedure
- `client.native.handle(event, handler)` - Listen to native events
- `client.web.emit(event, data)` - Emit event to native
- `client.web.handle(procedure, handler)` - Register web procedure handler
- `client.isWebView` - Boolean indicating if running in WebView

**`useEvent<Contract, Side, Event>(side, event, handler)`**

React hook to listen to events (auto-cleanup on unmount).

**`useProcedure<Contract, Side, Procedure>(side, procedure)`**

React hook for calling procedures with loading/error state.

**Returns:**
- `mutate(data)` - Function to call the procedure
- `isPending` - Boolean loading state
- `error` - Error from last call
- `data` - Result from last successful call
- `reset()` - Reset state

## Advanced Usage

### Error Handling

```typescript
try {
  await client.native.call('share', { url: '...' })
} catch (error) {
  if (error instanceof WebViewRPCError) {
    console.error('RPC Error:', error.code, error.message)
  } else if (error instanceof WebViewRPCTimeoutError) {
    console.error('Timeout after', error.timeout, 'ms')
  }
}
```

### Custom Timeout

```typescript
const client = useNativeClient({
  contract,
  webViewRef,
  timeout: 10000, // 10 seconds
})
```

### WebView Detection

```typescript
const client = useClient()

if (!client.isWebView) {
  // Running in browser, not WebView
  return <div>Not in WebView</div>
}
```

## Examples

See the [example](./example) directory for a complete working example with:
- Expo mobile app (`example/apps/mobile`)
- Next.js web app (`example/apps/web`)
- Shared contract (`example/packages/contract`)

## Architecture

### Message Flow

1. **Request sent**: Caller generates UUID correlation ID
2. **Message serialized**: JSON or custom serializer
3. **Posted via postMessage**: React Native WebView API
4. **Receiver deserializes**: Parses and validates message
5. **Handler executed**: Async handler function runs
6. **Response serialized**: Result or error
7. **Posted back**: Same correlation ID
8. **Promise resolved**: Original caller gets result

### Packages

- **`@webviewrpc/core`** - Framework-agnostic message protocol
- **`@webviewrpc/native`** - React Native client
- **`@webviewrpc/web`** - Web/React client

## Performance

- **Bundle size**: ~5KB gzipped (core + native)
- **Overhead**: <1ms per message (serialization + correlation)
- **Memory**: Pending requests map cleared after resolution/timeout

## Contributing

Contributions welcome! I built this because I needed a better way to handle WebView communication in my React Native projects.

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

MIT

## Credits

Inspired by [tRPC](https://trpc.io) and built for the React Native ecosystem.
