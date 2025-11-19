# WebView RPC Example

This is a complete example demonstrating the webview-rpc library in action with:
- **Mobile App**: Expo/React Native app with WebView
- **Web App**: Next.js app running inside the WebView
- **Shared Contract**: Type-safe RPC contract shared between both

## Features Demonstrated

### Bidirectional Communication
- **Native → Web**: Call procedures and emit events from React Native to Next.js
- **Web → Native**: Call procedures and emit events from Next.js to React Native

### Request-Response (Procedures)
- `showToast` - Web displays a toast notification
- `updateCounter` - Web updates counter state
- `navigate` - Native navigation
- `share` - Native share dialog
- `getDeviceInfo` - Get device platform and version

### Fire-and-Forget (Events)
- `counterChanged` - Counter value changed in web
- `themeChanged` - Theme changed in web
- `appStateChanged` - App state changed in native

### Type Safety
- Full TypeScript inference from contract to handlers
- Zod schema validation
- No manual type annotations needed

## Project Structure

```
example/
├── packages/
│   └── contract/          # Shared type-safe contract
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts   # Contract definition with Zod schemas
├── apps/
│   ├── mobile/            # Expo/React Native app
│   │   ├── package.json
│   │   ├── app.json
│   │   ├── tsconfig.json
│   │   └── app/
│   │       └── index.tsx  # Main app with WebView
│   └── web/               # Next.js app
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── app/
│           ├── layout.tsx # Root layout with RPC Provider
│           └── page.tsx   # Main page with RPC client
└── README.md              # This file
```

## Prerequisites

- **Node.js**: 20 or higher
- **pnpm**: 10 or higher
- **Expo CLI**: For running mobile app
- **iOS Simulator** or **Android Emulator**: For testing mobile app

## Installation

### 1. Install Root Dependencies

From the repository root (`webview-rpc/`):

```bash
pnpm install
pnpm build
```

This builds all the library packages (`@webviewrpc/core`, `@webviewrpc/native`, `@webviewrpc/web`).

### 2. Install Example Dependencies

From the example directory:

```bash
cd example
pnpm install
```

This installs dependencies for all example packages using workspace protocol.

## Running the Example

You need to run both the web app and mobile app simultaneously.

### Terminal 1: Start the Web App

```bash
cd example/apps/web
pnpm dev
```

The Next.js app will start at `http://localhost:3000`.

### Terminal 2: Start the Mobile App

```bash
cd example/apps/mobile
pnpm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser (for testing only, RPC features won't work)

**Important**: Make sure the web app is running at `http://localhost:3000` before loading the mobile app, as the WebView will try to connect to that URL.

## Usage Guide

### Mobile App Features

Once both apps are running, you'll see:

**Top Section (Native UI)**:
- Current counter value (synced from web)
- "Call Web: Show Toast" - Calls web procedure to show a toast
- "Call Web: Update Counter" - Calls web procedure to increment counter

**Bottom Section (WebView)**:
- The Next.js app rendered inside the WebView

### Web App Features

Inside the WebView, you'll see:

**Counter Section**:
- Current counter value
- "Increment & Emit Event" - Increments counter and emits event to native

**Call Native Procedures Section**:
- "Navigate to Settings" - Calls native navigation (shows alert)
- "Share Content" - Calls native share API (shows alert)
- "Get Device Info" - Gets platform and OS version from native

**Emit Events Section**:
- "Emit Theme Changed" - Emits theme change event to native

## How It Works

### 1. Define Contract (Shared)

The contract defines all available procedures and events:

```typescript
// example/packages/contract/src/index.ts
import { defineContract } from '@webviewrpc/core'
import { z } from 'zod'

export const contract = defineContract({
  web: {
    // Procedures (have .returns())
    showToast: z.object({ message: z.string() }).returns(z.void()),

    // Events (no .returns())
    counterChanged: z.object({ count: z.number() }),
  },
  native: {
    share: z.object({
      title: z.string(),
      message: z.string()
    }).returns(z.object({ success: z.boolean() })),

    appStateChanged: z.object({
      state: z.enum(['active', 'background'])
    }),
  },
})
```

### 2. Mobile Side (React Native)

```typescript
// example/apps/mobile/app/index.tsx
import { useNativeClient, useEvent } from '@webviewrpc/native'
import { contract } from '@example/contract'

const client = useNativeClient({
  webViewRef,
  contract,
  timeout: 5000,
})

// Handle incoming calls from web
client.native.handle('share', async ({ title, message }) => {
  await Share.share({ title, message })
  return { success: true }
})

// Listen to events from web
useEvent(client, 'web', 'counterChanged', ({ count }) => {
  console.log('Counter changed:', count)
})

// Call web procedures
await client.web.call('showToast', { message: 'Hello!' })

// Emit events to web
client.native.emit('appStateChanged', { state: 'active' })
```

### 3. Web Side (Next.js)

```typescript
// example/apps/web/app/page.tsx
'use client'
import { useClient, useEvent, useProcedure } from '@webviewrpc/web'

const client = useClient()

// Handle incoming calls from native
useEffect(() => {
  client.web.handle('showToast', async ({ message }) => {
    showToast(message)
  })
}, [client])

// Listen to events from native
useEvent('native', 'appStateChanged', ({ state }) => {
  console.log('App state:', state)
})

// Call native procedures
await client.native.call('share', {
  title: 'Check this out!',
  message: 'WebView RPC is awesome'
})

// Or use the procedure hook
const { mutate: share, isPending } = useProcedure('native', 'share')
share({ title: 'Hello', message: 'World' })

// Emit events to native
client.web.emit('counterChanged', { count: 42 })
```

## Key Concepts

### Procedures vs Events

**Procedures** (Request-Response):
- Defined with `.returns()` in the schema
- Return a promise that resolves with the result
- Can fail with errors
- Use for operations that need confirmation

**Events** (Fire-and-Forget):
- No `.returns()` in the schema
- Don't return a value
- Fire and forget (no confirmation)
- Use for notifications and broadcasts

### Type Safety

The contract provides full type inference:

```typescript
// TypeScript knows the exact parameter and return types
const result = await client.native.call('share', {
  title: 'Hello',    // ✓ Type-safe
  message: 'World',  // ✓ Type-safe
  // extra: 'field'  // ✗ TypeScript error!
})

// result is typed as { success: boolean }
console.log(result.success)
```

### Error Handling

```typescript
try {
  const result = await client.native.call('share', { ... })
} catch (error) {
  if (error instanceof WebViewRPCTimeoutError) {
    console.error('Request timed out')
  } else if (error instanceof WebViewRPCError) {
    console.error('RPC error:', error.message)
  }
}
```

## Troubleshooting

### Mobile app shows white screen
- Ensure web app is running at `http://localhost:3000`
- Check WebView console for errors
- Verify network connectivity

### "Cannot call procedure" errors
- Ensure handlers are registered before calls
- Check contract matches on both sides
- Verify procedure names are correct

### Type errors in TypeScript
- Rebuild library packages: `cd ../.. && pnpm build`
- Restart TypeScript server in your editor
- Check that versions match VERSION_REQUIREMENTS.md

### WebView not loading
- Check `originWhitelist` is set to `['*']`
- Verify `javaScriptEnabled` is true
- Check network permissions on Android

## Next Steps

### Customize the Example

1. **Add new procedures**: Define in contract, add handlers, call from either side
2. **Add new events**: Define in contract, emit from one side, listen on the other
3. **Add validation**: Enhance Zod schemas with custom validation
4. **Add serialization**: Use superjson for complex types (Dates, Maps, Sets, etc.)

### Use in Your Project

1. **Install packages**:
   ```bash
   pnpm add @webviewrpc/native @webviewrpc/core zod @standard-schema/spec
   pnpm add @webviewrpc/web @webviewrpc/core zod @standard-schema/spec
   ```

2. **Create contract**: Define your RPC interface in a shared package

3. **Set up native client**: Use `useNativeClient` hook in your React Native app

4. **Set up web client**: Wrap your Next.js app with `WebViewRPCProvider`

5. **Start calling**: Use fully type-safe procedures and events!

## Learn More

- [Main README](../README.md) - Library overview and installation
- [API Documentation](../docs/) - Detailed API reference
- [TDD Guide](../TDD_GUIDE.md) - Test-driven development approach

## Version Requirements

This example uses exact versions specified in VERSION_REQUIREMENTS.md:

- React: 19.1.0 (native) / 19.2.0 (web)
- React Native: 0.81.5
- Expo: 54.0.23
- Next.js: 15.5.3+
- react-native-webview: 13.15.0
- Zod: 4.1.5+
- TypeScript: 5.9.2

## License

Same as webview-rpc library.
