# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**webview-rpc** is a type-safe, bidirectional RPC library for React Native WebView communication. It enables React Native apps to communicate with embedded Next.js/React web content using a tRPC-inspired API with full TypeScript inference.

**Critical:** Always refer to `PLAN.md` for architectural decisions, API design, and implementation strategy.

## Tech Stack

### Build & Development Tools
- **pnpm** (10.21.0) - Monorepo package manager
- **TypeScript** (5.9.2) - Strict mode enabled
- **tsdown** - TypeScript bundler (Rolldown-based)
- **Biome** - Linting + formatting (single tool, replaces ESLint + Prettier)
- **TypeDoc** - Documentation generation from TSDoc comments

### Runtime Environment
- **React** (19.1.0) - UI library
- **React Native** (0.81.5) - Mobile framework
- **Expo** (54.0.23) - React Native tooling
- **Next.js** (15.5.3+) - Web framework
- **react-native-webview** (13.15.0) - WebView component

### Schema & Serialization
- **Standard Schema** - Interface for validation libraries (library-agnostic)
- **Zod** (4.1.5+) - Example validation library (user-provided peer dep)
- **superjson** (2.2.1+) - Recommended serializer (user-provided peer dep)

## MCP Tools Usage

### Serena MCP (Codebase Navigation)

**Use Serena when available** for:
- Finding symbols/functions/classes: `mcp__serena__find_symbol`
- Getting file overviews: `mcp__serena__get_symbols_overview`
- Finding references: `mcp__serena__find_referencing_symbols`
- Searching patterns: `mcp__serena__search_for_pattern`
- Refactoring operations: `mcp__serena__rename_symbol`, `mcp__serena__replace_symbol_body`

**Always prefer Serena over manual file reading** when navigating this codebase.

### context7 MCP (Library Documentation)

**Use context7 when available** for external libraries:
1. Resolve library ID: `mcp__context7__resolve-library-id`
2. Get docs: `mcp__context7__get-library-docs`

**Use for:**
- Standard Schema specification details
- React Native WebView API reference
- Zod/validation library patterns
- TypeScript advanced patterns

### Web Search

Use `WebSearch` when:
- context7 doesn't have recent docs
- Need community best practices
- Troubleshooting specific errors
- Checking latest API changes

**Stay grounded:** Always verify with official docs, don't hallucinate APIs.

## Development Workflow

### Essential Commands

```bash
# Install dependencies (monorepo root)
pnpm install

# Build all packages
pnpm build

# Build specific package
pnpm --filter @webviewrpc/core build
pnpm --filter @webviewrpc/native build
pnpm --filter @webviewrpc/web build

# Run tests (all packages)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for specific package
pnpm --filter @webviewrpc/core test

# Lint and format (all packages)
pnpm lint
pnpm format

# Type check (all packages)
pnpm typecheck

# Generate documentation
pnpm docs

# Generate changelog
pnpm changelog

# Run example app (mobile)
cd example/apps/mobile
pnpm dev

# Run example app (web)
cd example/apps/web
pnpm dev
```

### Incremental Development Practice

**CRITICAL:** After every code change, run this sequence:

```bash
# 1. Run tests
pnpm test

# 2. Type check
pnpm typecheck

# 3. Lint and format
pnpm lint
pnpm format

# 4. Build
pnpm build

# 5. Test in example app (integration)
cd example/apps/mobile && pnpm dev
# OR
cd example/apps/web && pnpm dev
```

**Why:** Catch test failures, type errors, style issues, and build failures immediately. The library is small (~500 LOC), so tests and rebuilds are fast.

### Test-Driven Development (TDD)

**Required approach for this project:**

1. **Define API shape** - Create stub implementation with `NotImplementedError`
2. **Write thorough tests** - Describe expected behavior in detail
3. **Run tests** - Verify they fail with NotImplementedError
4. **Implement** - Write actual code
5. **Run tests** - Verify they pass
6. **Refactor** - Improve code while tests stay green

**Example workflow:**

```typescript
// 1. Define API (stub)
export function createNativeClient() {
  throw new NotImplementedError('createNativeClient not implemented')
}

// 2. Write test with detailed description
describe('createNativeClient', () => {
  it('should create a bridge with call, emit, useEvent, and handler methods', () => {
    // Test validates API shape, types, and behavior
  })
})

// 3. Run test -> fails with NotImplementedError ✓
// 4. Implement actual code
// 5. Run test -> passes ✓
```

**Benefits:** Eliminates ambiguity, provides clear specification, catches regressions.

### When Making Changes

1. **Read PLAN.md first** - Understand the architecture and API design
2. **Check affected packages** - Changes to core affect native and web
3. **Update types** - Maintain full type inference (no `any` types)
4. **Add JSDoc comments** - Documentation generation depends on them
5. **Test both sides** - Verify native → web and web → native communication
6. **Rebuild and verify** - Run typecheck, lint, build after each logical unit

## Architecture Overview

### Package Structure

```
packages/
├── core/          # Framework-agnostic message protocol
├── native/        # React Native client
├── web/           # Web/React client
└── webview-rpc/   # Root package (re-exports)

example/
├── apps/
│   ├── mobile/    # Expo app consuming native client
│   └── web/       # Next.js app consuming web client
└── packages/
    └── contract/  # Shared type-safe contract
```

### Message Flow Architecture

**Request-Response Pattern:**
1. Caller invokes `bridge.call(procedure, data)`
2. Bridge generates UUID correlation ID
3. Message serialized with type='request', id, procedure, data
4. Posted via WebView postMessage API
5. Receiver deserializes, routes to handler, executes
6. Response serialized with type='response', same id, result/error
7. Posted back via postMessage
8. Original caller's promise resolved with result

**Event Pattern:**
1. Caller invokes `bridge.emit(event, data)`
2. Message serialized with type='event', event name, data
3. Posted via postMessage (no correlation needed)
4. Receiver deserializes, finds all listeners, executes synchronously

**Correlation ID Management:**
- Use UUIDs for request-response correlation
- `pendingRequests` map stores promise resolvers
- Timeout mechanism clears pending after 5000ms (configurable)
- Cleanup on resolution/rejection/timeout

### Key Design Principles

1. **User-Defined Everything**
   - Schema validation: Users provide Standard Schema-compliant library
   - Serialization: Users provide stringify/deserialize functions
   - No hardcoded dependencies (except React/RN ecosystem)

2. **Type Safety First**
   - Full inference from contract to handler parameters
   - No manual type annotations needed
   - TypeScript strict mode enforced

3. **Minimal API Surface**
   - `defineContract()` - Define RPC contract
   - `createNativeClient()` - Native-side bridge
   - `createWebClient()` - Web-side bridge
   - That's it for v1

4. **Standard Schema Integration**
   - Use `~standard` property for validation
   - Support any library (Zod, Valibot, ArkType)
   - See PLAN.md for Standard Schema details

## Code Organization

### packages/core/

**Purpose:** Framework-agnostic message protocol and utilities.

**Key Files:**
- `contract.ts` - `defineContract()` implementation, schema helpers
- `message.ts` - Message types, correlation ID generation
- `transport.ts` - Default serialization (JSON)
- `errors.ts` - `WebViewRPCError`, `WebViewRPCTimeoutError`

**No dependencies on React/React Native.**

### packages/native/

**Purpose:** React Native-specific client.

**Key Files:**
- `client.ts` - `createNativeClient()` implementation

**Dependencies:** react-native-webview

**Key Responsibilities:**
- Manage `pendingRequests` map
- Handle WebView `onMessage`
- Provide `useEvent` React hook
- Call/emit API

### packages/web/

**Purpose:** Web/React-specific client.

**Key Files:**
- `client.ts` - `createWebClient()` implementation
- `provider.tsx` - React context provider
- `detection.ts` - Detect `window.ReactNativeWebView`

**Dependencies:** react

**Key Responsibilities:**
- Detect WebView environment
- Listen to `window.addEventListener('message')`
- Provide React context and hooks
- Call/emit API

### example/

**Purpose:** Full working demonstration of library usage.

**Important:**
- Uses exact versions from PLAN.md
- Demonstrates both request-response and events
- Shows error handling, timeouts
- Must stay in sync with package API changes

## Documentation Standards

### TSDoc Comments

Use TSDoc format for all public APIs:

```typescript
/**
 * Creates a type-safe RPC client for React Native WebView communication.
 *
 * @example
 * ```typescript
 * import { createNativeClient } from 'webview-rpc/native'
 * import { contract } from './contract'
 *
 * const bridge = createNativeClient(contract, {
 *   handlers: {
 *     share: async ({ url, title }) => {
 *       await Share.share({ url, title })
 *       return { success: true }
 *     }
 *   }
 * })
 * ```
 *
 * @param contract - The shared RPC contract defining procedures and events
 * @param options - Configuration options including handlers and serialization
 * @returns Bridge object with call, emit, useEvent, and handler methods
 *
 * @see {@link https://github.com/user/webview-rpc#native-client | Native Client Docs}
 */
export function createNativeClient<TContract extends Contract>(
  contract: TContract,
  options: NativeClientOptions<TContract>
): NativeClient<TContract>
```

### Documentation Generation

Run `pnpm docs` to generate TypeDoc documentation from TSDoc comments. Output goes to `docs/` directory.

**Include:**
- Description of what the function/type does
- `@example` with real, working code
- `@param` for all parameters
- `@returns` for return values
- `@see` for related documentation

## Common Patterns

### Adding a New Message Type

1. Update `packages/core/src/message.ts` types
2. Update both client implementations (native + web)
3. Update example contract
4. Rebuild all packages
5. Test in example app

### Debugging Message Flow

Enable debug logging in both clients:

```typescript
// Native
const bridge = createNativeClient(contract, {
  debug: __DEV__,
  // ...
})

// Web
const bridge = createWebClient(contract, {
  debug: process.env.NODE_ENV === 'development',
  // ...
})
```

### Type Inference Issues

If type inference breaks:
1. Check contract definition uses `.returns()` correctly
2. Verify Standard Schema implementation has `types` property
3. Ensure no `any` types in chain
4. Check TypeScript version (should be 5.9.2)

## React Native WebView Compatibility

### RN 0.76+ Patch

The library includes `scripts/patch-webview.js` to fix compatibility with React Native 0.76+.

**Issue:** `Image.resolveAssetSource` was removed, breaking react-native-webview

**Solution:** Patch replaces destructuring with safe fallback:

```javascript
// Before
const { resolveAssetSource } = Image;

// After
const resolveAssetSource = (source) => {
  if (!source) return null;
  if (typeof source === 'number') {
    return Image.resolveAssetSource ? Image.resolveAssetSource(source) : source;
  }
  return source;
};
```

**Usage:**
```bash
npx webview-rpc patch-webview
# OR add to package.json postinstall
```

**Document clearly in README** - users need to understand why and how.

## Testing Strategy

### Unit Tests with Vitest

**Test framework:** Vitest (fast, ESM-native, TypeScript support)

**Test structure:**
```
packages/
├── core/
│   ├── src/
│   │   ├── contract.ts
│   │   └── contract.test.ts    # Co-located with implementation
│   └── tests/
│       └── integration/          # Integration tests
```

**Running tests:**

```bash
# All tests
pnpm test

# Watch mode (for TDD)
pnpm test:watch

# Specific package
pnpm --filter @webviewrpc/core test

# With coverage
pnpm test:coverage
```

### Test-Driven Development Process

**REQUIRED for this project to eliminate ambiguity:**

1. **Define API** - Create function/class with `NotImplementedError`
2. **Write comprehensive tests** - Include:
   - What it does (behavior)
   - Input validation
   - Output format
   - Error cases
   - Edge cases
   - Type safety
3. **Run tests** - Should fail with `NotImplementedError`
4. **Implement** - Write actual code
5. **Run tests** - Should pass
6. **Refactor** - Maintain passing tests

**Test description format:**

```typescript
describe('createNativeClient', () => {
  describe('initialization', () => {
    it('should accept a contract and options object', () => {
      // Tests API shape
    })

    it('should validate that all contract procedures have handlers', () => {
      // Tests validation
    })

    it('should throw if required handlers are missing', () => {
      // Tests error case
    })
  })

  describe('call method', () => {
    it('should generate unique correlation ID for each call', () => {
      // Tests correlation ID generation
    })

    it('should serialize message with type="request"', () => {
      // Tests message format
    })

    it('should return promise that resolves with response', async () => {
      // Tests async behavior
    })

    it('should reject promise after timeout (default 5000ms)', async () => {
      // Tests timeout
    })

    it('should clean up pending request after resolution', () => {
      // Tests cleanup
    })
  })

  // ... more describe blocks for emit, useEvent, handler
})
```

### Integration Tests via Example App

After unit tests pass:
1. Test in example app (real environment)
2. Verify end-to-end flows
3. Test on real devices (iOS/Android)

**Test Scenarios:**
- [ ] Native → Web request-response
- [ ] Web → Native request-response
- [ ] Native → Web events
- [ ] Web → Native events
- [ ] Timeout handling
- [ ] Handler errors
- [ ] Serialization errors
- [ ] Type inference
- [ ] WebView detection

### Test Coverage Goals

- **Unit tests:** 90%+ coverage
- **Critical paths:** 100% coverage (message correlation, error handling)
- **Happy path:** 100% coverage
- **Error paths:** 100% coverage

## Common Issues

### "Cannot find module 'webview-rpc/native'"

**Cause:** Packages not built or not linked in monorepo

**Fix:**
```bash
pnpm build
pnpm install
```

### Type inference not working

**Cause:** Circular dependency or incomplete types

**Fix:**
1. Rebuild packages: `pnpm build`
2. Restart TypeScript server in editor
3. Check for `any` types leaking through

### WebView not receiving messages

**Cause:** Missing `onMessage` handler or incorrect ref

**Fix:**
```typescript
// Native side
<WebView
  ref={webViewRef}
  onMessage={bridge.handler(webViewRef)}  // Must pass ref
  source={{ uri: '...' }}
/>
```

### Web not detecting WebView

**Cause:** `window.ReactNativeWebView` not injected

**Fix:**
- Ensure WebView is being used (not regular browser)
- Check `originWhitelist` is set to `['*']`
- Verify WebView version supports postMessage

## Expo Mobile App Configuration Requirements

When working with the example Expo mobile app (or creating new Expo apps using this library), you MUST understand and configure several critical files. Missing or incorrectly configured files will cause hard-to-debug errors.

### Required Configuration Files

The Expo app requires these files to work properly in a monorepo:

1. **`metro.config.js`** - Metro bundler configuration for monorepo support
2. **`babel.config.js`** - Babel preset for Expo SDK 54 transformations
3. **`expo-env.d.ts`** - TypeScript type definitions for Expo globals
4. **`app.json`** - Expo configuration with plugins and experiments
5. **`tsconfig.json`** - TypeScript compiler configuration
6. **`app/_layout.tsx`** - Root layout for Expo Router 6.x (REQUIRED)

### Critical pnpm Overrides

In the **workspace root** `package.json`, these overrides are REQUIRED:

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

**Why each is critical:**

- **`@expo/metro-runtime: 6.1.2`**: Fixes the infamous "getDevServer is not a function" error with Expo SDK 54. Without this exact version, Metro will crash during development.
- **`react: 19.1.0`**: Expo SDK 54 requires React 19.x. Forces consistent React version across all workspace packages.
- **`react-dom: 19.1.0`**: Required for web compatibility and some Expo internals.

### Metro Config Requirements for Monorepos

The `metro.config.js` MUST include monorepo-specific configuration:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

// CRITICAL: Configure for monorepo
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
```

**Why this is critical:**

- **`watchFolders`**: Tells Metro to watch the entire workspace. Without this, changes to workspace packages (@webviewrpc/*, @example/contract) won't trigger hot reload.
- **`nodeModulesPaths`**: Configures module resolution for pnpm workspaces. Without this, Metro won't find workspace dependencies, causing "Cannot find module" errors.

### Expo Router 6.x Setup Requirements

Expo Router 6.x (used in SDK 54) has strict requirements:

1. **`app/_layout.tsx` is REQUIRED**: Every Expo Router app must have a root layout file. Missing this causes "No routes found" error.

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

2. **`app.json` must include the plugin**:

```json
{
  "expo": {
    "plugins": ["expo-router"]
  }
}
```

Without the plugin, Expo Router won't be configured and the app will fail to start.

### Common Pitfalls to Avoid

When working with AI agents or making changes to the Expo app:

1. **Never delete `metro.config.js`**: Thinking "Expo has defaults" will break monorepo support. The defaults don't know about pnpm workspaces.

2. **Never remove pnpm overrides**: These aren't optional. They fix critical version conflicts that will crash Metro.

3. **Never skip `app/_layout.tsx`**: Expo Router 6.x requires this file. It's not optional like in older versions.

4. **Don't use npm/yarn**: This project uses pnpm. Switching package managers will break workspace dependencies.

5. **Don't manually add `@expo/metro-runtime`**: The override handles this. Adding it as a direct dependency can cause version conflicts.

6. **Clear cache when config changes**: After changing Metro config, ALWAYS run:
   ```bash
   npx expo start --clear
   ```

### Common Error Messages and Fixes

**"getDevServer is not a function"**
- **Cause**: Wrong `@expo/metro-runtime` version
- **Fix**: Verify pnpm override is `6.1.2`, delete all `node_modules`, reinstall

**"Cannot find module '@webviewrpc/native'"**
- **Cause**: Missing Metro monorepo config
- **Fix**: Verify `metro.config.js` has `watchFolders` and `nodeModulesPaths`

**"No routes found"**
- **Cause**: Missing `app/_layout.tsx` or missing expo-router plugin
- **Fix**: Create `app/_layout.tsx` and verify `app.json` has plugin

**"Cannot find name '__DEV__'"**
- **Cause**: Missing `expo-env.d.ts`
- **Fix**: Create file with `/// <reference types="expo/types" />`

### Complete Example Reference

For a fully working example with all configuration files, see:

**`example/apps/mobile/README.md`** - Comprehensive documentation including:
- All required configuration files with explanations
- Why each file is needed
- What happens without each file
- Troubleshooting guide
- Development workflow

**DO NOT** attempt to create an Expo app in this monorepo without reading that documentation first.

## File Naming Conventions

- Source files: `kebab-case.ts` or `camelCase.ts` (prefer camelCase for primary files)
- Test files: `*.test.ts` (if added)
- Config files: `lowercase.config.ts`
- React components: `PascalCase.tsx`

## Import Rules

- Use relative imports within a package
- Use package imports across packages: `webview-rpc/core`
- No circular dependencies between packages
- Core cannot import from native or web

## Git Workflow

### Branching Strategy

- `main` - Production-ready code, protected
- `develop` - Integration branch, default branch
- `feature/*` - New features (e.g., `feature/core-contract`)
- `fix/*` - Bug fixes (e.g., `fix/timeout-race-condition`)
- `docs/*` - Documentation updates (e.g., `docs/api-reference`)

**Branch naming:**
- Use kebab-case: `feature/request-response-correlation`
- Be descriptive: `fix/web-detection-ssr-issue`
- Keep short but clear

### Commit Messages

Follow Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, no logic change)
- `refactor` - Code change that neither fixes bug nor adds feature
- `test` - Adding or updating tests
- `chore` - Build process, tooling, dependencies

**Scopes:**
- `core` - Core package changes
- `native` - Native client changes
- `web` - Web client changes
- `example` - Example app changes
- `deps` - Dependency updates
- `*` - Multiple scopes

**Examples:**

```bash
# Good
feat(core): implement defineContract with Standard Schema support
fix(native): resolve race condition in pending requests cleanup
docs(readme): add installation instructions for RN 0.76+
test(web): add unit tests for WebView detection
chore(deps): upgrade TypeScript to 5.9.3

# Bad (too vague)
fix: bug
feat: add stuff
update readme
```

**Body (optional):**
- Explain what and why, not how
- Reference issues: "Fixes #123"
- Breaking changes: "BREAKING CHANGE: removed deprecated API"

### Changelog Generation

**Automatic changelog from commits:**

```bash
# Generate changelog for next release
pnpm changelog

# Preview without writing
pnpm changelog --dry-run
```

Uses conventional-changelog to generate from commit messages.

**Manual changelog updates** when needed:
- Add to `CHANGELOG.md`
- Follow Keep a Changelog format
- Group by version, then by type (Added, Changed, Fixed, etc.)

## Version Strategy

- All packages share same version number
- Bump together on every release
- Use semantic versioning: `MAJOR.MINOR.PATCH`
- v1.0.0 when feature-complete per PLAN.md

**Version bumping:**

```bash
# Bump version (updates all package.json files)
pnpm version:patch  # 0.1.0 -> 0.1.1
pnpm version:minor  # 0.1.0 -> 0.2.0
pnpm version:major  # 0.1.0 -> 1.0.0

# Generate changelog, commit, and tag
pnpm release
```

## Publishing Checklist

Before publishing to npm:

1. [ ] All packages build successfully
2. [ ] TypeCheck passes with no errors
3. [ ] Biome lint passes
4. [ ] Example app runs on iOS
5. [ ] Example app runs on Android
6. [ ] Example app runs in browser
7. [ ] Documentation generated
8. [ ] README.md complete
9. [ ] CHANGELOG.md updated
10. [ ] Version bumped in all packages
11. [ ] Git tags created
12. [ ] npm publish (dry-run first)

## Quick Reference

**Most important files:**
- `PLAN.md` - Complete project specification
- `packages/core/src/contract.ts` - Contract definition API
- `packages/native/src/client.ts` - Native RPC client
- `packages/web/src/client.ts` - Web RPC client
- `example/packages/contract/src/index.ts` - Example contract

**Rebuild everything:**
```bash
pnpm clean && pnpm install && pnpm build
```

**Clean slate:**
```bash
pnpm clean
rm -rf node_modules packages/*/node_modules example/node_modules
pnpm install
pnpm build
```

## Non-Goals (Don't Build)

See PLAN.md section "Non-Goals (v1)" for complete list. Key ones:
- ❌ Shared state synchronization
- ❌ Middleware system
- ❌ DevTools
- ❌ Framework-agnostic (focus on React ecosystem)
- ❌ Message batching
- ❌ React Query integration (users can wrap)

Keep it simple. ~500 lines total.
