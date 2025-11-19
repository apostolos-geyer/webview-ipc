# Expo Mobile App Example

> A complete example demonstrating `@webview-rpc` for type-safe, bidirectional communication between React Native and embedded web content.

## Overview

This Expo app demonstrates how to use `@webviewrpc/native` to communicate with a Next.js web app running inside a React Native WebView. It showcases:

- **Bidirectional RPC calls**: Native calls web procedures, web calls native procedures
- **Type-safe events**: Fire-and-forget event emissions with full TypeScript inference
- **Contract-based API**: Shared contract ensures type safety across the WebView boundary
- **Error handling**: Timeout handling, error propagation, and debugging
- **Monorepo setup**: Proper configuration for pnpm workspace with Expo SDK 54

## Prerequisites

- **Node.js**: 18.x or later
- **pnpm**: 10.21.0 or later
- **Expo CLI**: Installed via dependencies (SDK 54.0.23)
- **React Native**: 0.81.5 (via Expo)
- **iOS Simulator** or **Android Emulator** (or physical device)

## Configuration Files Required

This Expo app requires specific configuration files to work properly in a monorepo setup. Each file serves a critical purpose:

### 1. `metro.config.js` - Metro Bundler Configuration

**Purpose**: Configure Metro bundler for monorepo support and module resolution.

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

// Configure for monorepo
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
```

**Why needed**:
- **`watchFolders`**: Tells Metro to watch the entire workspace root, not just the app directory. This allows Metro to detect changes in workspace packages (`@webviewrpc/*`, `@example/contract`).
- **`nodeModulesPaths`**: Configures module resolution to look in both local and workspace root `node_modules`. Critical for finding dependencies installed at the workspace root via pnpm.

**Without this**: Metro won't find workspace packages, resulting in "Cannot find module" errors.

### 2. `babel.config.js` - Babel Transpilation

**Purpose**: Configure Babel to transform TypeScript and JSX for Expo SDK 54.

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

**Why needed**:
- **`babel-preset-expo`**: Official Expo preset that configures Babel for React Native, including:
  - TypeScript transformation
  - JSX/React transformation
  - Platform-specific code stripping
  - Modern JavaScript features (async/await, spread, etc.)
  - Expo SDK-specific transformations

**Without this**: Babel won't know how to transform TypeScript or JSX, causing syntax errors.

### 3. `expo-env.d.ts` - TypeScript Type Definitions

**Purpose**: Provide TypeScript type definitions for Expo-specific globals and modules.

```typescript
/// <reference types="expo/types" />
```

**Why needed**:
- Adds type definitions for Expo-specific globals (e.g., `__DEV__`)
- Adds module declarations for Expo assets (images, fonts, etc.)
- Ensures TypeScript understands Expo's module resolution

**Without this**: TypeScript will show errors for Expo-specific types and globals.

### 4. `app.json` - Expo Configuration

**Purpose**: Configure Expo app settings, plugins, and experiments.

```json
{
  "expo": {
    "name": "webview-rpc-example",
    "slug": "webview-rpc-example",
    "version": "0.1.0",
    "orientation": "portrait",
    "platforms": ["ios", "android"],
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "plugins": [
      "expo-router"
    ],
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

**Why needed**:
- **`plugins: ["expo-router"]`**: Enables Expo Router 6.x (file-based routing)
- **`newArchEnabled: true`**: Enables React Native's new architecture (optional but recommended)
- **Platform configs**: iOS and Android-specific settings

**Without this**: Expo won't know how to configure the app, and expo-router won't work.

### 5. `tsconfig.json` - TypeScript Configuration

**Purpose**: Configure TypeScript compiler for Expo and strict type checking.

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-native",
    "moduleResolution": "bundler"
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": [
    "node_modules",
    "**/*.test.ts",
    "**/*.test.tsx"
  ]
}
```

**Why needed**:
- **`extends: "expo/tsconfig.base"`**: Inherits Expo's recommended TypeScript settings
- **`strict: true`**: Enables all strict type checking (matches library's requirements)
- **`moduleResolution: "bundler"`**: Modern module resolution for Expo SDK 54+
- **`jsx: "react-native"`**: Configures JSX transformation for React Native

**Without this**: TypeScript will use default settings that don't work with React Native.

### 6. `app/_layout.tsx` - Root Layout for Expo Router

**Purpose**: Define root layout and navigation structure for Expo Router 6.x.

```typescript
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  )
}
```

**Why needed**:
- **Expo Router 6.x requirement**: Every app needs a `_layout.tsx` file in the `app/` directory
- **Navigation structure**: Defines the navigation stack and screen configurations
- **Entry point**: Expo Router uses this as the root of the navigation tree

**Without this**: Expo Router won't work, app will fail to start with "No routes found" error.

## Monorepo-Specific Setup

### Why pnpm Overrides Are Needed

In the **workspace root** `package.json`, the following overrides are critical:

```json
{
  "pnpm": {
    "overrides": {
      "@expo/metro-runtime": "6.1.2",
      "react": "19.1.0",
      "react-dom": "19.1.0"
    }
  }
}
```

**Why each override is needed**:

#### `@expo/metro-runtime: 6.1.2`

**Problem**: Expo SDK 54 has a peer dependency mismatch with Metro's runtime. Different versions of `@expo/metro-runtime` can cause the infamous error:

```
Error: getDevServer is not a function
```

**Solution**: Pin to `6.1.2` which is compatible with Expo SDK 54.0.23 and Metro 0.83.x.

**Without this**: Metro bundler will fail to start or crash during development.

#### `react: 19.1.0` and `react-dom: 19.1.0`

**Problem**: Expo SDK 54 requires React 19.x, but some dependencies might pull in older versions.

**Solution**: Force React 19.1.0 across all workspace packages.

**Without this**: React version conflicts, hooks errors, or runtime crashes.

### Metro Configuration for Monorepos

The `metro.config.js` settings are critical for monorepo support:

```javascript
// Watch entire workspace for changes
config.watchFolders = [workspaceRoot];

// Resolve modules from both local and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
```

**How it works**:
1. **`watchFolders`**: Metro watches `../../..` (workspace root), so changes in `packages/` trigger rebuilds
2. **`nodeModulesPaths`**: Metro looks for modules in:
   - `example/apps/mobile/node_modules` (hoisted by pnpm)
   - `<workspace-root>/node_modules` (workspace dependencies)

**Result**: You can import `@webviewrpc/native`, `@example/contract` and they hot-reload during development.

## Development Workflow

### Installation

From the **workspace root** (not the mobile app directory):

```bash
pnpm install
```

This installs all dependencies for the entire monorepo, including workspace packages.

### Start Development Server

Navigate to the mobile app directory:

```bash
cd example/apps/mobile
pnpm start
```

This starts the Expo development server. You'll see:

```
› Metro waiting on exp://<ip>:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

**Platform-specific commands**:

```bash
# iOS Simulator
pnpm ios

# Android Emulator
pnpm android

# Web browser (experimental)
pnpm web
```

### Clear Cache

If you encounter bundler issues or stale modules:

```bash
npx expo start --clear
```

This clears Metro's cache and restarts fresh.

### Development Tips

1. **Hot reload**: Edit files and see changes instantly (no restart needed)
2. **Debugging**: Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android) for dev menu
3. **Console logs**: Run `npx react-native log-ios` or `npx react-native log-android` for native logs
4. **Metro logs**: Metro output shows bundling progress and errors

## Troubleshooting

### "getDevServer is not a function"

**Error**:
```
Error: getDevServer is not a function
TypeError: getDevServer is not a function
```

**Cause**: `@expo/metro-runtime` version mismatch between Expo SDK 54 and Metro.

**Solution**:
1. Ensure workspace root `package.json` has the override:
   ```json
   {
     "pnpm": {
       "overrides": {
         "@expo/metro-runtime": "6.1.2"
       }
     }
   }
   ```
2. Delete all `node_modules` and reinstall:
   ```bash
   pnpm clean  # or rm -rf node_modules packages/*/node_modules example/node_modules
   pnpm install
   ```
3. Clear Metro cache:
   ```bash
   npx expo start --clear
   ```

### Metro Bundler Issues

**Error**:
```
Error: Cannot find module '@webviewrpc/native'
Error: Unable to resolve module @example/contract
```

**Cause**: Missing `metro.config.js` or incorrect configuration.

**Solution**:
1. Ensure `metro.config.js` exists with correct `watchFolders` and `nodeModulesPaths`
2. Rebuild workspace packages:
   ```bash
   cd ../../..  # workspace root
   pnpm build
   ```
3. Restart Metro:
   ```bash
   cd example/apps/mobile
   npx expo start --clear
   ```

### TypeScript Type Errors

**Error**:
```
Cannot find type definition file for 'expo'
Cannot find name '__DEV__'
```

**Cause**: Missing `expo-env.d.ts` or TypeScript not finding Expo types.

**Solution**:
1. Ensure `expo-env.d.ts` exists:
   ```typescript
   /// <reference types="expo/types" />
   ```
2. Restart TypeScript server in your editor (VS Code: `Cmd+Shift+P` → "Restart TypeScript Server")
3. Check `tsconfig.json` includes `expo-env.d.ts`:
   ```json
   {
     "include": ["**/*.ts", "**/*.tsx"]
   }
   ```

### Expo Router Not Working

**Error**:
```
Error: No routes found
Error: expo-router is not configured
```

**Cause**: Missing `app/_layout.tsx` or missing `expo-router` plugin in `app.json`.

**Solution**:
1. Ensure `app/_layout.tsx` exists (see configuration section above)
2. Ensure `app.json` has the plugin:
   ```json
   {
     "expo": {
       "plugins": ["expo-router"]
     }
   }
   ```
3. Rebuild:
   ```bash
   npx expo start --clear
   ```

### WebView Not Loading

**Error**:
- WebView shows blank screen
- Console error: "Unable to connect to http://localhost:3000"

**Cause**: Web dev server not running or incorrect URL.

**Solution**:
1. Start the web dev server in a separate terminal:
   ```bash
   cd ../web
   pnpm dev
   ```
2. Ensure WebView source matches the web server URL:
   ```typescript
   <WebView
     source={{ uri: 'http://localhost:3000' }}  // Must match web dev server
     // ...
   />
   ```
3. For physical devices, use your computer's IP instead of `localhost`:
   ```typescript
   source={{ uri: 'http://192.168.1.x:3000' }}
   ```

### React 19 Warnings

**Warning**:
```
Warning: ReactDOM.render is no longer supported in React 19
```

**Cause**: Some dependencies haven't updated to React 19 yet.

**Solution**: These are usually safe to ignore during development. The overrides in `package.json` ensure runtime compatibility.

## Architecture

### RPC Communication Flow

This example demonstrates the complete RPC communication pattern:

```
┌─────────────────┐                  ┌─────────────────┐
│   React Native  │                  │   Next.js Web   │
│                 │                  │                 │
│  useNativeClient│◄────────────────►│  useWebClient   │
│                 │   postMessage    │                 │
│  - call()       │                  │  - call()       │
│  - emit()       │                  │  - emit()       │
│  - handle()     │                  │  - handle()     │
│  - useEvent()   │                  │  - useEvent()   │
└─────────────────┘                  └─────────────────┘
        │                                    │
        └────────────────┬───────────────────┘
                         │
                    ┌────▼────┐
                    │ Contract│
                    │         │
                    │ - web   │
                    │ - native│
                    └─────────┘
```

### Contract-Based Type Safety

The shared `@example/contract` package defines the RPC contract:

```typescript
import { defineContract, procedure } from '@webviewrpc/core'
import { z } from 'zod'

export const contract = defineContract({
  web: {
    // Procedures (request-response)
    showToast: procedure(z.object({
      message: z.string(),
      duration: z.number().optional(),
    })).returns(z.void()),

    // Events (fire-and-forget)
    counterChanged: z.object({
      count: z.number(),
    }),
  },
  native: {
    share: procedure(z.object({
      title: z.string(),
      message: z.string(),
    })).returns(z.object({
      success: z.boolean(),
    })),

    appStateChanged: z.object({
      state: z.enum(['active', 'background', 'inactive']),
    }),
  },
})
```

**Type safety guarantees**:
- Native can only call procedures defined in `contract.web`
- Web can only call procedures defined in `contract.native`
- Parameter types are inferred from Zod schemas (no manual typing needed)
- Return types are enforced
- Event payloads are type-checked

### WebView Integration

The native side integrates `@webviewrpc/native` with React Native WebView:

```typescript
import { useNativeClient, useEvent } from '@webviewrpc/native'
import WebView from 'react-native-webview'
import { contract } from '@example/contract'

function App() {
  const webViewRef = useRef<WebView>(null)

  // Create RPC client
  const client = useNativeClient({
    webViewRef,
    contract,
    timeout: 5000,
    onError: (error) => console.error('RPC Error:', error),
  })

  // Register handlers for web → native calls
  useEffect(() => {
    client.native.handle('share', async ({ title, message }) => {
      await Share.share({ title, message })
      return { success: true }
    })
  }, [client])

  // Listen to web events
  useEvent(client, 'web', 'counterChanged', ({ count }) => {
    console.log('Counter changed:', count)
  })

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'http://localhost:3000' }}
      onMessage={client.handleMessage}  // Connect to RPC
      originWhitelist={['*']}
      javaScriptEnabled
    />
  )
}
```

**Key integration points**:
1. **`webViewRef`**: Reference to WebView component for posting messages
2. **`onMessage={client.handleMessage}`**: Routes WebView messages to RPC handlers
3. **`client.web.call()`**: Call procedures on web side
4. **`client.native.handle()`**: Register handlers for web → native calls
5. **`useEvent()`**: Listen to events from web side

### Example Use Cases

**Native → Web: Show Toast Notification**
```typescript
// Native side
await client.web.call('showToast', {
  message: 'Hello from Native!',
  duration: 3000,
})

// Web side
client.web.handle('showToast', async ({ message, duration }) => {
  toast.success(message, { duration })
})
```

**Web → Native: Share Content**
```typescript
// Web side
const result = await client.native.call('share', {
  title: 'Check this out!',
  message: 'Cool content',
})
console.log('Share result:', result.success)

// Native side
client.native.handle('share', async ({ title, message }) => {
  await Share.share({ title, message })
  return { success: true }
})
```

**Events: Counter Updates**
```typescript
// Web side (emit)
client.web.emit('counterChanged', { count: 42 })

// Native side (listen)
useEvent(client, 'web', 'counterChanged', ({ count }) => {
  setCounter(count)
})
```

## Key Files

- **`app/index.tsx`**: Main application screen with WebView and RPC demo
- **`app/_layout.tsx`**: Root layout for Expo Router (required)
- **`metro.config.js`**: Metro bundler configuration for monorepo
- **`babel.config.js`**: Babel configuration for Expo SDK 54
- **`app.json`**: Expo configuration and plugins
- **`tsconfig.json`**: TypeScript compiler configuration
- **`expo-env.d.ts`**: Expo TypeScript type definitions

## Next Steps

1. **Explore the code**: Read `app/index.tsx` to see RPC usage examples
2. **Run the app**: Start both web and mobile dev servers
3. **Modify the contract**: Add your own procedures/events in `@example/contract`
4. **Build for production**: Use `expo build` or EAS Build for production builds

## Resources

- [Expo SDK 54 Documentation](https://docs.expo.dev/)
- [Expo Router 6.x Documentation](https://docs.expo.dev/router/introduction/)
- [React Native WebView Documentation](https://github.com/react-native-webview/react-native-webview)
- [webview-rpc Documentation](../../../README.md)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## License

MIT (see workspace root LICENSE file)
