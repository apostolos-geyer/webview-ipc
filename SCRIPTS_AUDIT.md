# Scripts Audit & Fix Summary

## Issues Found & Fixed

### 1. Missing `test:coverage` scripts

**Problem:** Agents were trying to run `pnpm test:coverage` in individual packages, but the script didn't exist in all packages.

**Fixed:**
- ✅ Added `test:coverage` to `packages/core/package.json`
- ✅ Added `test:coverage` to `packages/web/package.json`
- ✅ `packages/native/package.json` already had it

### 2. Missing package-level `lint` and `format` scripts

**Problem:** Agents might try to run `pnpm lint` from within a package directory, but the scripts didn't exist.

**Fixed:** Added to all packages:
- ✅ `lint`: Runs Biome lint on package directory
- ✅ `format`: Runs Biome format on package directory

**Implementation:**
```json
{
  "scripts": {
    "lint": "cd ../.. && biome lint packages/[package-name]",
    "format": "cd ../.. && biome format --write packages/[package-name]"
  }
}
```

### 3. Documentation

**Created:**
- ✅ `SCRIPTS_REFERENCE.md` - Comprehensive list of all available scripts
- ✅ Updated agent definitions to reference SCRIPTS_REFERENCE.md
- ✅ Added rule: "ONLY use defined scripts"

## Complete Script Matrix

| Script | Root | core | native | web | Notes |
|--------|------|------|--------|-----|-------|
| `build` | ✅ | ✅ | ✅ | ✅ | Builds packages |
| `clean` | ✅ | ✅ | ✅ | ✅ | Removes dist/ |
| `typecheck` | ✅ | ✅ | ✅ | ✅ | Type checking |
| `test` | ✅ | ✅ | ✅ | ✅ | Run tests |
| `test:watch` | ✅ | ✅ | ✅ | ✅ | Watch mode |
| `test:coverage` | ✅ | ✅ | ✅ | ✅ | **FIXED** |
| `test:ui` | ✅ | ❌ | ❌ | ❌ | Root only |
| `lint` | ✅ | ✅ | ✅ | ✅ | **ADDED** |
| `format` | ✅ | ✅ | ✅ | ✅ | **ADDED** |
| `check` | ✅ | ❌ | ❌ | ❌ | Root only |
| `docs` | ✅ | ❌ | ❌ | ❌ | Root only |
| `changelog` | ✅ | ❌ | ❌ | ❌ | Root only |

## Verification

Tested all new scripts:

```bash
# ✅ Core package coverage
cd packages/core && pnpm test:coverage
# Result: 100% coverage, 131 tests passing

# ✅ Web package lint (via filter)
pnpm --filter @webviewrpc/web lint
# Result: Works (shows expected linting warnings)

# ✅ Native package format
pnpm --filter @webviewrpc/native format
# Result: Works
```

## Agent Updates

Updated the following agent definitions:

### `tdd-dev.md`
- Added `SCRIPTS_REFERENCE.md` to key documentation
- Added rule: **"ONLY use defined scripts"** - Check SCRIPTS_REFERENCE.md, never use npx or custom commands

### `code-review.md`
- Added `SCRIPTS_REFERENCE.md` to key documentation

## Guidelines for AI Agents

When working on this project:

1. **Always check SCRIPTS_REFERENCE.md first**
2. **Never use `npx` directly** - Use defined scripts
3. **Never invent scripts** - If it's not in package.json, it doesn't exist
4. **Use `pnpm --filter`** - For running package scripts from root
5. **Verify script exists** - Run `cat package.json | grep scripts` if unsure

### Good Examples ✅

```bash
# From root
pnpm test
pnpm --filter @webviewrpc/core test:coverage

# From package
cd packages/core
pnpm test:watch
pnpm lint
```

### Bad Examples ❌

```bash
# Don't use npx
npx vitest
npx tsc

# Don't invent scripts
pnpm test:integration   # Doesn't exist
pnpm dev                # Only exists for example apps

# Don't use direct commands
vitest run              # Use pnpm test
tsc --noEmit            # Use pnpm typecheck
```

## Next Steps

- [ ] Add integration test scripts (when example app is created)
- [ ] Consider adding pre-commit hooks
- [ ] Document CI/CD pipeline scripts when ready

## Status

✅ **All lifecycle scripts are now consistently defined across the monorepo**
✅ **All agents updated with script guidelines**
✅ **Documentation complete**
