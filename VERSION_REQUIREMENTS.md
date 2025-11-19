# Version Requirements

This document specifies exact versions for all dependencies. **Agents must use these exact versions.**

## Runtime Environment

### Core Runtime
- **Node.js**: `>=20` (engines requirement)
- **pnpm**: `>=10` (package manager, specifically `10.21.0`)

### React Ecosystem
- **React**: `19.1.0` (native) / `19.2.0` (web)
- **React DOM**: `19.2.0` (web only)
- **React Native**: `0.81.5`
- **Expo**: `54.0.23`
- **Next.js**: `15.5.3+`

### WebView
- **react-native-webview**: `13.15.0`

## Development Tools

### Build Tools
- **TypeScript**: `~5.9.2` (strict mode enabled)
- **tsdown**: `^0.4.0` (bundler, Rolldown-based)

### Testing
- **Vitest**: `^4.0.10`
- **@vitest/coverage-v8**: `^4.0.10`
- **@vitest/ui**: `^4.0.10`

### React Testing
- **@testing-library/react**: `^16.3.0`
- **@testing-library/react-hooks**: `^8.0.1` (native)
- **@testing-library/dom**: `^10.4.1` (web)
- **@testing-library/jest-dom**: `^6.9.1` (web)
- **@testing-library/user-event**: `^14.6.1` (web)
- **jsdom**: `^27.2.0` (native - React testing environment)
- **happy-dom**: `^20.0.10` (web - React testing environment)

### Linting & Formatting
- **Biome**: `^1.9.4` (single tool for linting + formatting)

### Documentation
- **TypeDoc**: `^0.27.6`
- **typedoc-plugin-markdown**: `^4.9.0`

### Changelog
- **conventional-changelog-cli**: `^5.0.0`

## Schema & Validation

### Standard Schema
- **@standard-schema/spec**: `^1.0.0` (peer dependency, all packages)

### Example Validation Libraries (User Choice)
- **Zod**: `^4.1.5+` (recommended, user-provided)
- **Valibot**: Compatible (user-provided)
- **ArkType**: Compatible (user-provided)

## Serialization

### Recommended (User Choice)
- **superjson**: `^2.2.1+` (recommended for complex types)
- Default: `JSON.stringify/parse` (built-in)

## Package Peer Dependencies

### @webviewrpc/core
```json
{
  "peerDependencies": {
    "@standard-schema/spec": "^1.0.0"
  }
}
```

### @webviewrpc/native
```json
{
  "peerDependencies": {
    "@standard-schema/spec": "^1.0.0",
    "react": ">=19.0.0",
    "react-native": ">=0.76.0",
    "react-native-webview": "^13.15.0"
  }
}
```

**Note**: React Native 0.76+ requires WebView patch (see `scripts/patch-webview.js`)

### @webviewrpc/web
```json
{
  "peerDependencies": {
    "@standard-schema/spec": "^1.0.0",
    "react": ">=19.0.0"
  }
}
```

## Testing Environment Versions

### Native Package (React Native Testing)
- **Environment**: jsdom
- **React**: 19.1.0
- **React Native**: 0.81.5
- **react-native-webview**: 13.15.0
- **@testing-library/react**: 16.3.0
- **@testing-library/react-hooks**: 8.0.1

### Web Package (React Testing)
- **Environment**: happy-dom
- **React**: 19.2.0
- **React DOM**: 19.2.0
- **@testing-library/react**: 16.3.0
- **@testing-library/dom**: 10.4.1
- **@testing-library/jest-dom**: 6.9.1

## Type Definitions

- **@types/node**: `^22.10.5`
- **@types/react**: `^19.1.17`

## Version Constraints Rationale

### Why React 19+?
- Latest stable version with improved hooks
- Server Components support (Next.js 15.5+)
- Better TypeScript inference
- Reference project uses 19.x

### Why React Native 0.76+?
- Breaking change: `Image.resolveAssetSource` removed
- Requires patch for react-native-webview
- Reference project compatibility

### Why TypeScript 5.9.2?
- Stable release with best inference
- Compatible with all tooling
- Strict mode improvements

### Why Vitest 4.x?
- Fast, ESM-native
- Better TypeScript support than Jest
- UI mode for debugging

### Why Biome over ESLint/Prettier?
- Single tool (faster)
- Rust-based (performance)
- Better default rules
- Less configuration

## Version Update Policy

**Stability**: Exact versions in devDependencies, caret ranges in peerDependencies

**Updates**: Only update after testing in reference project first

**Breaking Changes**: Document in CHANGELOG.md with migration guide

## Agent Instructions

When implementing or testing:

1. **Always use these exact versions** - Don't upgrade without approval
2. **Check package.json** - Verify versions match this document
3. **Test with React environment** - Use jsdom (native) or happy-dom (web)
4. **Use @testing-library/react** - For testing hooks and components
5. **Follow peer dependency constraints** - Match or exceed minimums

### Testing React Hooks

**Native package:**
```typescript
import { renderHook } from '@testing-library/react'
import { useNativeClient } from './hooks'

it('should create client', () => {
  const { result } = renderHook(() => useNativeClient({ webViewRef, contract }))
  expect(result.current).toBeDefined()
})
```

**Web package:**
```typescript
import { renderHook } from '@testing-library/react'
import { useClient } from './hooks'

it('should get client from context', () => {
  const { result } = renderHook(() => useClient(), { wrapper: WebViewRPCProvider })
  expect(result.current).toBeDefined()
})
```

## Troubleshooting

### "React is not defined"
- Ensure `globals: true` in vitest.config.ts
- Check test environment is set (jsdom or happy-dom)

### "Cannot find module 'react'"
- Run `pnpm install` in package directory
- Check React version matches requirements

### "Type error in test file"
- Install `@types/react` at correct version
- Verify TypeScript version is 5.9.2

### "Coverage threshold not met"
- Target is now **100%** for all packages
- Add missing tests for uncovered lines
- Check vitest.config.ts has correct thresholds
