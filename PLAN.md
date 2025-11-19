# webview-rpc - Project Plan

> **A type-safe, bidirectional RPC library for React Native WebView communication**

## Table of Contents

1. [Project Vision](#project-vision)
2. [Discussion Summary](#discussion-summary)
3. [Core Decisions](#core-decisions)
4. [Technical Architecture](#technical-architecture)
5. [API Design](#api-design)
6. [Package Structure](#package-structure)
7. [Implementation Plan](#implementation-plan)
8. [Tech Stack](#tech-stack)
9. [Non-Goals (v1)](#non-goals-v1)
10. [Success Criteria](#success-criteria)

---

## Project Vision

Create a minimal, type-safe, and elegant library for bidirectional communication between React Native apps and embedded Next.js/React web applications via WebView. The library should feel as natural as calling local functions while providing full TypeScript inference across the network boundary.

**Inspiration:** tRPC's type-safe RPC model + Electron's IPC patterns

**Target Audience:** Developers building React Native apps with embedded web content who want type-safe, reliable communication without manual type definitions or callback hell.

---

## Discussion Summary

### Initial Inspiration
The project was inspired by an existing `@UnknownCreatives/webview-bridge` implementation that provides basic bidirectional communication between a React Native mobile app (Expo) and a Next.js web app. While functional, it has hardcoded message types and lacks the elegance and reusability needed for a standalone library.

### Key Realizations

1. **Type Safety First:** Like tRPC, the library should provide end-to-end type inference without manual type annotations
2. **Request-Response Pattern:** Critical for async operations (e.g., native requests navigation, web responds when complete)
3. **Fire-and-Forget Events:** Simple event emitter pattern for notifications that don't need responses
4. **User-Defined Schemas:** Don't dictate Zod/Valibot/etc - use Standard Schema interface for flexibility
5. **Simple is Better:** Start minimal (~500 LOC), ship v1, iterate based on usage

### Scope Refinement

**Originally Considered:**
- Shared state synchronization
- Middleware system
- DevTools integration
- Framework-agnostic core

**Final v1 Scope:**
- Request-response procedures (with correlation IDs, timeouts, error handling)
- Fire-and-forget events
- Type-safe contract definition
- User-defined serialization (recommend superjson)
- React Native + React/Next.js support only
- Clear documentation + working example

**Deferred to v2+:**
- Shared state (users can build with our primitives)
- Middleware (add if users request it)
- DevTools (nice-to-have)
- Vue/Svelte/other framework support

---

## Core Decisions

### 1. **Standard Schema Instead of Zod**
- **Decision:** Use Standard Schema interface for validation
- **Rationale:**
  - Library-agnostic - works with Zod, Valibot, ArkType, etc.
  - Designed by creators of major validation libraries
  - Minimal overhead - just an interface
  - Future-proof as ecosystem adopts standard
- **Impact:** Users bring their own validation library

### 2. **Biome for Linting + Formatting**
- **Decision:** Use Biome instead of ESLint + Prettier
- **Rationale:**
  - All-in-one toolchain (faster, simpler)
  - Written in Rust (blazing fast)
  - Zero config out of box
  - Good Prettier compatibility
- **Impact:** Single tool, faster CI/CD

### 3. **tsdown for Bundling**
- **Decision:** Use tsdown instead of tsup/rollup/esbuild directly
- **Rationale:**
  - Built on Rolldown (Rust-based, fast)
  - Auto-generates declaration files
  - Simple config
  - Modern, actively maintained
- **Impact:** Clean build pipeline, faster builds

### 4. **User-Defined Serialization**
- **Decision:** Make serialization pluggable, recommend superjson
- **Rationale:**
  - superjson handles Dates, Maps, Sets, etc.
  - Users might have specific needs (e.g., custom classes)
  - Keeps library size down
- **Impact:** Users provide `serialize`/`deserialize` functions

### 5. **React Native WebView Patch Documentation**
- **Decision:** Document + provide script, don't bundle patched version
- **Rationale:**
  - Transparency - users see exactly what's happening
  - Automation - `npx webview-rpc patch-webview` does it for them
  - No licensing concerns
- **Impact:** Clear README section explaining RN 0.76+ compatibility

### 6. **Target Versions from Reference Project**
- **Decision:** Support React 19, RN 0.81.5, Expo 54, Next.js 15.5+
- **Rationale:**
  - Known working configuration
  - Latest stable versions
  - Easier to build example app
- **Impact:** Clear peer dependencies, no legacy support burden

### 7. **Monorepo Structure**
- **Decision:** Single repo with core + native + web packages
- **Rationale:**
  - Easier to develop and test
  - Single version for all packages
  - Simpler CI/CD
- **Impact:** Users install `webview-rpc/native` or `webview-rpc/web`

---

## Technical Architecture

### Message Flow

```
┌─────────────────┐                    ┌─────────────────┐
│  React Native   │                    │   Next.js Web   │
│      App        │                    │       App       │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
    ┌────▼─────┐                          ┌────▼─────┐
    │  Client  │                          │  Client  │
    │  Bridge  │                          │  Bridge  │
    └────┬─────┘                          └────┬─────┘
         │                                      │
         │  1. call('navigate', {path})         │
         │  ───────────────────────────────────>│
         │     (correlation ID: abc123)         │
         │                                      │
         │                            2. handler executes
         │                               router.push()
         │                                      │
         │  3. response {success: true}         │
         │  <───────────────────────────────────│
         │     (correlation ID: abc123)         │
         │                                      │
         │  4. emit('stateChange', {...})       │
         │  ───────────────────────────────────>│
         │     (no response expected)           │
         │                                      │
```

### Message Types

```typescript
type Message = {
  id: string                    // UUID for correlation
  type: 'request' | 'response' | 'event'
  procedure?: string            // For request/response
  event?: string                // For events
  data: unknown                 // Serialized payload
  error?: {                     // For error responses
    message: string
    code: string
  }
  timestamp: number
}
```

### Correlation Strategy

**Request-Response:**
1. Native calls `bridge.call('navigate', {path: '/home'})`
2. Bridge generates UUID, stores promise resolver in `pendingRequests` map
3. Serializes message with type='request', id=uuid, procedure='navigate', data={path}
4. Posts via `webViewRef.postMessage(serialized)`
5. Web receives, deserializes, routes to handler
6. Web handler executes, returns result
7. Web serializes response with type='response', id=uuid (same), data=result
8. Web posts response back
9. Native receives, deserializes, finds pending request by ID
10. Resolves promise with result, clears timeout, removes from map

**Events:**
1. Web calls `bridge.emit('pathChanged', {path: '/home'})`
2. Bridge serializes message with type='event', event='pathChanged', data={path}
3. Posts via `window.ReactNativeWebView.postMessage(serialized)`
4. Native receives, deserializes, finds event listeners
5. Executes all registered listeners synchronously

### Error Handling

**Timeout:**
- Default: 5000ms per request
- Configurable per client
- Rejects promise with `WebViewRPCTimeoutError`

**Handler Errors:**
- Try-catch in handler execution
- Serialize error as response with error field
- Remote side rejects promise with `WebViewRPCError`

**Serialization Errors:**
- Log warning, ignore message
- User-provided serializers can throw, we catch

---

## API Design

### Contract Definition (Shared Package)

```typescript
import { defineContract } from 'webview-rpc'
import { z } from 'zod'

export const contract = defineContract({
  // Things native can call on web
  web: {
    // Request-response (has .returns())
    navigate: z.object({ path: z.string() })
      .returns(z.object({ success: z.boolean() })),

    getUserData: z.object({ userId: z.string() })
      .returns(z.object({ name: z.string(), email: z.string() })),

    // Fire-and-forget event (no .returns())
    pathChanged: z.object({ path: z.string() }),
  },

  // Things web can call on native
  native: {
    // Request-response
    share: z.object({ url: z.string(), title: z.string() })
      .returns(z.object({ success: z.boolean() })),

    // Fire-and-forget event
    appStateChange: z.object({ state: z.enum(['active', 'background']) }),
  }
})

export type AppContract = typeof contract
```

**Key Points:**
- Schema definitions use Standard Schema interface
- Example shows Zod, but works with any Standard Schema-compliant library
- `.returns()` is a helper that marks it as a procedure (request-response)
- No `.returns()` means it's an event (fire-and-forget)

### Native Side (React Native)

```typescript
import { createNativeClient } from 'webview-rpc/native'
import { contract } from './contract'

const bridge = createNativeClient(contract, {
  // Implement handlers for things web can call
  handlers: {
    share: async ({ url, title }) => {
      await Share.share({ url, title })
      return { success: true }
    },
    appStateChange: ({ state }) => {
      console.log('App state:', state)
    }
  },

  // Optional config
  timeout: 5000,
  serialize: superjson.stringify,
  deserialize: superjson.parse,
})

// In component
function App() {
  const webViewRef = useRef<WebView>(null)

  // Listen to events from web
  bridge.useEvent('pathChanged', ({ path }) => {
    console.log('Web navigated to:', path)
  })

  // Call procedure on web
  const handleNavigate = async () => {
    const result = await bridge.call('navigate', { path: '/dashboard' })
    if (result.success) {
      console.log('Navigation complete!')
    }
  }

  // Emit event to web
  const notifyAppState = () => {
    bridge.emit('appStateChange', { state: 'active' })
  }

  return (
    <WebView
      ref={webViewRef}
      onMessage={bridge.handler(webViewRef)}
      source={{ uri: 'https://app.com' }}
    />
  )
}
```

**API:**
- `createNativeClient(contract, options)` → bridge object
- `bridge.handler(webViewRef)` → onMessage handler function
- `bridge.call(procedure, data)` → Promise<result>
- `bridge.emit(event, data)` → void
- `bridge.useEvent(event, callback)` → React hook for listening

### Web Side (Next.js/React)

```typescript
import { createWebClient } from 'webview-rpc/web'
import { contract } from './contract'

const bridge = createWebClient(contract, {
  // Implement handlers for things native can call
  handlers: {
    navigate: async ({ path }) => {
      router.push(path)
      return { success: true }
    },
    pathChanged: ({ path }) => {
      console.log('Path changed:', path)
    }
  },

  // Optional config
  timeout: 5000,
  serialize: superjson.stringify,
  deserialize: superjson.parse,
})

// Provider wrapper
export function BridgeProvider({ children }) {
  return <bridge.Provider>{children}</bridge.Provider>
}

// In component
function Component() {
  const { isWebView, call, emit, useEvent } = bridge.useClient()

  // Listen to native events
  useEvent('appStateChange', ({ state }) => {
    console.log('Native app state:', state)
  })

  // Call procedure on native
  const handleShare = async () => {
    if (!isWebView) return

    const result = await call('share', {
      url: window.location.href,
      title: document.title
    })

    if (result.success) {
      toast.success('Shared!')
    }
  }

  // Emit event to native
  useEffect(() => {
    if (isWebView) {
      emit('pathChanged', { path: pathname })
    }
  }, [pathname, isWebView, emit])

  return <button onClick={handleShare}>Share</button>
}
```

**API:**
- `createWebClient(contract, options)` → bridge object + Provider
- `bridge.Provider` → React context provider
- `bridge.useClient()` → { isWebView, call, emit, useEvent }
- `call(procedure, data)` → Promise<result>
- `emit(event, data)` → void
- `useEvent(event, callback)` → React hook for listening
- `isWebView` → boolean (detects `window.ReactNativeWebView`)

---

## Package Structure

```
webview-rpc/
├── packages/
│   ├── core/                     # Framework-agnostic core (~200 lines)
│   │   ├── src/
│   │   │   ├── contract.ts       # defineContract, schema helpers
│   │   │   ├── message.ts        # Message types, correlation
│   │   │   ├── transport.ts      # Serialization defaults
│   │   │   ├── errors.ts         # Custom error classes
│   │   │   └── index.ts          # Public exports
│   │   ├── package.json
│   │   └── tsdown.config.ts
│   │
│   ├── native/                   # React Native client (~150 lines)
│   │   ├── src/
│   │   │   ├── client.ts         # createNativeClient
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsdown.config.ts
│   │
│   ├── web/                      # Web/React client (~150 lines)
│   │   ├── src/
│   │   │   ├── client.ts         # createWebClient
│   │   │   ├── provider.tsx      # React context
│   │   │   ├── detection.ts      # WebView detection
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsdown.config.ts
│   │
│   └── webview-rpc/              # Root package (re-exports)
│       ├── package.json
│       └── README.md
│
├── scripts/
│   └── patch-webview.js          # Automated RN WebView patch
│
├── example/                      # Full working monorepo app
│   ├── apps/
│   │   ├── mobile/               # Expo app
│   │   │   ├── app/
│   │   │   │   └── index.tsx
│   │   │   ├── package.json
│   │   │   └── app.config.ts
│   │   │
│   │   └── web/                  # Next.js 15 app
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   └── page.tsx
│   │       ├── package.json
│   │       └── next.config.ts
│   │
│   ├── packages/
│   │   └── contract/             # Shared contract
│   │       ├── src/
│   │       │   └── index.ts
│   │       └── package.json
│   │
│   ├── package.json              # Workspace root
│   └── pnpm-workspace.yaml
│
├── biome.json                    # Biome config
├── tsconfig.json                 # Base TS config
├── package.json                  # Monorepo root
├── pnpm-workspace.yaml           # pnpm workspaces
├── README.md                     # Main documentation
└── PLAN.md                       # This file
```

**Package Exports:**

```json
// packages/webview-rpc/package.json
{
  "name": "webview-rpc",
  "exports": {
    "./core": "./packages/core/dist/index.js",
    "./native": "./packages/native/dist/index.js",
    "./web": "./packages/web/dist/index.js"
  }
}
```

**Usage:**
```typescript
// Mobile app
import { createNativeClient } from 'webview-rpc/native'

// Web app
import { createWebClient } from 'webview-rpc/web'

// Shared
import { defineContract } from 'webview-rpc/core'
```

---

## Implementation Plan

### Phase 1: Core Foundation
1. ✅ **Project Setup**
   - Initialize monorepo with pnpm workspaces
   - Configure Biome (biome.json)
   - Configure tsdown for all packages
   - Setup TypeScript with strict mode
   - Create package structure

2. ✅ **Core Package**
   - Implement `defineContract()` helper
   - Create message types (Request, Response, Event)
   - Implement correlation ID generation (UUID)
   - Create custom error classes
   - Add default serialization (JSON.stringify/parse)
   - Export Standard Schema type utilities

3. ✅ **Testing Strategy**
   - Unit tests for core utilities
   - Integration tests via example app
   - Type tests for inference

### Phase 2: Native Client
1. ✅ **Native Client Implementation**
   - Implement `createNativeClient()`
   - Build request-response mechanism
   - Build event emission/listening
   - Create `useEvent` React hook
   - Handle timeout logic
   - Integrate with WebView onMessage

2. ✅ **Error Handling**
   - Timeout errors
   - Handler execution errors
   - Serialization errors

### Phase 3: Web Client
1. ✅ **Web Client Implementation**
   - Implement `createWebClient()`
   - Build React context provider
   - Implement `useClient()` hook
   - WebView detection logic
   - Request-response mechanism
   - Event emission/listening

2. ✅ **Window Integration**
   - Listen to `window.addEventListener('message')`
   - Post via `window.ReactNativeWebView.postMessage()`
   - Handle missing ReactNativeWebView gracefully

### Phase 4: Example App
1. ✅ **Shared Contract Package**
   - Define example contract
   - Export TypeScript types

2. ✅ **Mobile App**
   - Setup Expo + React Native
   - Install webview-rpc/native
   - Implement contract handlers
   - Create example screens with RPC calls

3. ✅ **Web App**
   - Setup Next.js 15
   - Install webview-rpc/web
   - Implement contract handlers
   - Create example pages with RPC calls

4. ✅ **Integration Testing**
   - Run both apps
   - Test request-response flow
   - Test event emission
   - Test error handling
   - Test timeout behavior

### Phase 5: Documentation & Polish
1. ✅ **README.md**
   - Installation instructions
   - Quick start guide
   - API reference
   - Example code snippets
   - Troubleshooting section
   - WebView patch explanation

2. ✅ **WebView Patch Script**
   - Implement `patch-webview.js`
   - Test on RN 0.76+
   - Document what it does
   - Add to postinstall option

3. ✅ **TypeScript Declarations**
   - Generate .d.ts files via tsdown
   - Ensure full type inference
   - Test in consumer projects

4. ✅ **Package Publishing Prep**
   - Set proper package.json fields
   - Add LICENSE (MIT)
   - Add CHANGELOG.md
   - Configure npm/yarn publish

---

## Tech Stack

### Build Tools
- **pnpm** (v10.21.0) - Package manager, workspace support
- **tsdown** (latest) - TypeScript bundler (Rolldown-based)
- **Biome** (latest) - Linting + formatting
- **TypeScript** (5.9.2) - Type system

### Runtime Dependencies
- **React** (19.1.0) - UI library (both native and web)
- **React Native** (0.81.5) - Mobile framework
- **react-native-webview** (13.15.0) - WebView component
- **Expo** (54.0.23) - React Native framework
- **Next.js** (15.5.3+) - Web framework

### User-Provided (Peer Dependencies)
- **Validation Library** - Any Standard Schema-compliant library:
  - Zod (4.1.5+)
  - Valibot
  - ArkType
  - etc.
- **Serialization** - Any serializer with stringify/parse:
  - superjson (2.2.1+) - Recommended
  - JSON (built-in)
  - Custom serializers

### Development
- **tsx** - TypeScript execution for scripts
- **@standard-schema/spec** - Standard Schema types

---

## Non-Goals (v1)

### Explicitly Out of Scope

1. **Shared State Synchronization**
   - **Why:** Complex (race conditions, conflict resolution, initial sync)
   - **Alternative:** Users can build using our primitives:
     ```typescript
     // User implementation
     const [state, setState] = useState(initial)
     useEvent('stateUpdate', (newState) => setState(newState))
     const updateState = (newState) => {
       setState(newState)
       emit('stateUpdate', newState)
     }
     ```
   - **Future:** Could be v2 feature if demand exists

2. **Middleware System**
   - **Why:** Adds complexity, unclear if needed
   - **Alternative:** Users can wrap handlers
   - **Future:** Add if users request it

3. **DevTools Integration**
   - **Why:** Nice-to-have, not critical for v1
   - **Alternative:** Users can log in handlers
   - **Future:** Chrome extension could be v2

4. **Framework-Agnostic Core**
   - **Why:** Requires abstraction layer, more testing
   - **Alternative:** Focus on React/RN ecosystem first
   - **Future:** Vue/Svelte support later if demand exists

5. **Message Batching**
   - **Why:** Optimization not needed for typical usage
   - **Alternative:** Users can batch at app level if needed
   - **Future:** Add if performance issues arise

6. **React Query Integration**
   - **Why:** Users can wrap our calls in useQuery
   - **Future:** Could provide adapters later

7. **Optimistic Updates**
   - **Why:** App-level concern, not library concern
   - **Alternative:** Users implement in their apps

8. **Connection State Management**
   - **Why:** WebView is always "connected" or app crashes
   - **Alternative:** Users can ping if needed

---

## Success Criteria

### v1.0.0 Release Checklist

**Code Quality:**
- [ ] All packages build without errors
- [ ] Full TypeScript strict mode compliance
- [ ] Biome linting passes (0 errors)
- [ ] Total code size ~500 lines
- [ ] All exports have JSDoc comments

**Functionality:**
- [ ] Request-response works both directions
- [ ] Events work both directions
- [ ] Timeout mechanism works
- [ ] Error handling works (handler errors, timeouts, serialization)
- [ ] Type inference works perfectly (no manual types needed)
- [ ] WebView detection works
- [ ] React hooks work correctly

**Documentation:**
- [ ] README.md complete with all sections
- [ ] API reference documented
- [ ] Example app runs successfully
- [ ] WebView patch script documented
- [ ] Troubleshooting guide included

**Example App:**
- [ ] Mobile app runs on iOS
- [ ] Mobile app runs on Android
- [ ] Web app runs in browser
- [ ] Web app runs in WebView
- [ ] All example interactions work
- [ ] Example demonstrates both procedures and events

**Publishing:**
- [ ] package.json metadata correct
- [ ] LICENSE file included (MIT)
- [ ] CHANGELOG.md created
- [ ] Packages published to npm
- [ ] GitHub repo public
- [ ] README has badges (npm version, downloads, license)

**Portfolio Readiness:**
- [ ] Clean, professional codebase
- [ ] Comprehensive documentation
- [ ] Working live demo (deployed web app + TestFlight)
- [ ] Blog post or detailed README
- [ ] GitHub social preview configured

---

## Future Considerations (v2+)

### Potential Features
1. **Shared State** - If users consistently request it
2. **Middleware** - For auth, logging, transforms
3. **DevTools** - Chrome extension for debugging
4. **React Query Adapters** - `useRpcQuery()`, `useRpcMutation()`
5. **Vue/Svelte Support** - If demand exists outside React ecosystem
6. **Connection State** - `isConnected`, reconnection logic
7. **Message Batching** - Performance optimization
8. **Typed Errors** - Contract-defined error types
9. **Streaming** - For large data transfers
10. **File Transfers** - Base64 or blob handling

### Community Growth
- **Documentation Site** - Dedicated docs with search
- **Example Gallery** - Common patterns (auth, navigation, state)
- **Video Tutorial** - YouTube walkthrough
- **Blog Posts** - Write-ups on Dev.to, Medium
- **Conference Talk** - React Native EU, App.js Conf

---

## Notes & Considerations

### Why This Will Succeed
1. **Real Pain Point** - Many RN+WebView apps need this
2. **Simple API** - Easy to learn, hard to misuse
3. **Type Safety** - Catches errors at compile time
4. **Zero Config** - Works out of box
5. **Well Documented** - Clear examples
6. **Small Bundle** - ~500 lines, minimal overhead

### Risk Mitigation
1. **Standard Schema Adoption** - Risk: low adoption
   - Mitigation: Works with Zod (most popular), which already implements it
2. **React Native Updates** - Risk: breaking changes
   - Mitigation: Pin to known working versions, document compatibility
3. **WebView API Changes** - Risk: postMessage changes
   - Mitigation: Core API stable, patch script for known issues

### Competitive Analysis
**Similar Libraries:**
- `react-native-webview-bridge` - Outdated, no types
- Custom implementations - Every app rolls their own
- **webview-rpc (ours)** - Type-safe, modern, minimal

**Unique Selling Points:**
1. Full type inference (like tRPC)
2. Request-response + events
3. Standard Schema (library-agnostic)
4. Modern stack (React 19, RN 0.76+, Next.js 15)
5. Professional documentation

---

## Timeline Estimate

**Total Time:** ~2-3 days full-time development

- **Day 1:** Core + Native (setup, core package, native client)
- **Day 2:** Web + Example (web client, example app)
- **Day 3:** Docs + Polish (README, testing, patch script, publish)

---

## License

MIT - Permissive, popular, portfolio-friendly

---

## Contact & Links

**Repository:** https://github.com/[username]/webview-rpc (TBD)
**NPM:** https://npmjs.com/package/webview-rpc (TBD)
**Author:** [Your Name]

---

*Last Updated: 2025-01-18*
*Version: 1.0.0-planning*
