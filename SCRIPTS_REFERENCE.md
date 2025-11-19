# Scripts Reference

This document lists all available npm/pnpm scripts across the monorepo.

## Root Scripts (from `/webview-rpc`)

Run these from the monorepo root:

```bash
# Building
pnpm build                    # Build all packages
pnpm clean                    # Clean all build artifacts

# Testing
pnpm test                     # Run tests in all packages
pnpm test:watch               # Run tests in watch mode
pnpm test:ui                  # Run tests with Vitest UI
pnpm test:coverage            # Run tests with coverage report

# Type Checking
pnpm typecheck                # Type check all packages

# Linting & Formatting
pnpm lint                     # Lint all files with Biome
pnpm format                   # Format all files with Biome
pnpm check                    # Lint + format (write mode)

# Documentation
pnpm docs                     # Generate TypeDoc documentation

# Changelog & Versioning
pnpm changelog                # Generate changelog from commits
pnpm changelog:preview        # Preview changelog without writing
pnpm version:patch            # Bump patch version (0.1.0 -> 0.1.1)
pnpm version:minor            # Bump minor version (0.1.0 -> 0.2.0)
pnpm version:major            # Bump major version (0.1.0 -> 1.0.0)

# Development (Example Apps)
pnpm dev:mobile               # Start mobile example app
pnpm dev:web                  # Start web example app
```

## Package-Specific Scripts

Run these from within a package directory or using `pnpm --filter`:

### @webviewrpc/core

```bash
cd packages/core

# Building
pnpm build                    # Bundle with tsdown
pnpm clean                    # Remove dist/

# Testing
pnpm test                     # Run tests
pnpm test:watch               # Run tests in watch mode
pnpm test:coverage            # Run tests with coverage

# Type Checking
pnpm typecheck                # Type check without emitting

# Linting & Formatting
pnpm lint                     # Lint this package
pnpm format                   # Format this package
```

### @webviewrpc/native

```bash
cd packages/native

# Building
pnpm build                    # Bundle with tsdown
pnpm clean                    # Remove dist/

# Testing
pnpm test                     # Run tests
pnpm test:watch               # Run tests in watch mode
pnpm test:coverage            # Run tests with coverage

# Type Checking
pnpm typecheck                # Type check without emitting

# Linting & Formatting
pnpm lint                     # Lint this package
pnpm format                   # Format this package
```

### @webviewrpc/web

```bash
cd packages/web

# Building
pnpm build                    # Bundle with tsdown
pnpm clean                    # Remove dist/

# Testing
pnpm test                     # Run tests
pnpm test:watch               # Run tests in watch mode
pnpm test:coverage            # Run tests with coverage

# Type Checking
pnpm typecheck                # Type check without emitting

# Linting & Formatting
pnpm lint                     # Lint this package
pnpm format                   # Format this package
```

## Using `pnpm --filter`

Run package scripts from the monorepo root:

```bash
# Build specific package
pnpm --filter @webviewrpc/core build
pnpm --filter @webviewrpc/native build
pnpm --filter @webviewrpc/web build

# Test specific package
pnpm --filter @webviewrpc/core test
pnpm --filter @webviewrpc/native test:coverage
pnpm --filter @webviewrpc/web test:watch

# Lint specific package
pnpm --filter @webviewrpc/core lint
pnpm --filter @webviewrpc/native format
```

## Common Workflows

### Full Clean Build

```bash
pnpm clean
pnpm install
pnpm build
```

### Test-Driven Development

```bash
# Start tests in watch mode
cd packages/core
pnpm test:watch

# Make changes, tests auto-run
# Once passing, run coverage
pnpm test:coverage
```

### Pre-Commit Checks

```bash
pnpm test                     # Run all tests
pnpm typecheck                # Type check
pnpm lint                     # Lint
pnpm build                    # Build all packages
```

### Release Workflow

```bash
# 1. Ensure everything passes
pnpm test
pnpm typecheck
pnpm lint
pnpm build

# 2. Bump version
pnpm version:patch            # or minor/major

# 3. Generate changelog
pnpm changelog

# 4. Commit and tag
git add .
git commit -m "chore: release v0.1.1"
git tag v0.1.1

# 5. Publish (when ready)
pnpm -r publish
```

## Troubleshooting

### "Command not found" errors

If you see errors about missing commands:

1. **Ensure you're in the right directory**
   - Root scripts: `/webview-rpc`
   - Package scripts: `/webview-rpc/packages/{package}`

2. **Check the script exists**
   - Root: `cat package.json | grep scripts -A 20`
   - Package: `cat packages/core/package.json | grep scripts -A 10`

3. **Reinstall dependencies**
   ```bash
   pnpm install
   ```

### "Cannot find module" errors

If you see module resolution errors:

```bash
# Rebuild all packages
pnpm clean
pnpm build

# Or rebuild specific package
pnpm --filter @webviewrpc/core build
```

### Test failures

```bash
# Run with more detail
pnpm test -- --reporter=verbose

# Run specific test file
pnpm test -- packages/core/src/contract.test.ts

# Run with coverage to see what's not covered
pnpm test:coverage
```

## Notes for AI Agents

**Important:** When working on this project:

1. **Always use defined scripts** - Don't use `npx` or direct commands
2. **Check package.json first** - Verify the script exists before running
3. **Use workspace protocol** - Packages depend on each other via `workspace:*`
4. **Run from correct directory** - Root scripts from root, package scripts from package
5. **Parallel execution** - Use `pnpm --filter` to target specific packages

**Example:**
```bash
# ✅ GOOD - Uses defined script from root
cd /Users/stoli/Desktop/devel/personal/webview-ipc/webview-rpc
pnpm test

# ✅ GOOD - Uses defined script from package
cd /Users/stoli/Desktop/devel/personal/webview-ipc/webview-rpc/packages/core
pnpm test:coverage

# ✅ GOOD - Uses filter from root
pnpm --filter @webviewrpc/core test

# ❌ BAD - Uses npx (might not use local config)
npx vitest

# ❌ BAD - Script doesn't exist
pnpm test:integration
```
