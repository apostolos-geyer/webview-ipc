# Publishing Guide

This document describes how to publish new versions of webview-rpc to npm.

## Prerequisites

1. **npm Account**: You need an npm account with publish permissions for `@webviewrpc/*` packages
2. **npm Token**: Create an automation token at https://www.npmjs.com/settings/1apostoli/tokens
3. **GitHub Secrets**: Add `NPM_TOKEN` to repository secrets at https://github.com/apostolos-geyer/webview-ipc/settings/secrets/actions

## Publishing Process

### Automated Publishing (Recommended)

1. **Update version numbers**:
   ```bash
   # Patch version (1.0.0 -> 1.0.1)
   pnpm version:patch

   # Minor version (1.0.0 -> 1.1.0)
   pnpm version:minor

   # Major version (1.0.0 -> 2.0.0)
   pnpm version:major
   ```

2. **Update CHANGELOG.md**:
   ```bash
   pnpm changelog
   ```

3. **Commit and tag**:
   ```bash
   git add .
   git commit -m "chore: release v1.0.1"
   git tag v1.0.1
   git push origin main --tags
   ```

4. **GitHub Actions will automatically**:
   - Run tests
   - Build packages
   - Publish to npm with provenance

### Manual Publishing

If you need to publish manually:

1. **Login to npm**:
   ```bash
   npm login
   ```

2. **Dry run** (test without actually publishing):
   ```bash
   pnpm release:dry
   ```

3. **Publish**:
   ```bash
   pnpm release
   ```

## What Gets Published

Each package publishes:
- `dist/` - Compiled JavaScript and type definitions
- `README.md` - Package documentation
- `package.json` - Package metadata

The `prepublishOnly` script ensures packages are built and tested before publishing.

## Version Strategy

All packages use the same version number and are published together:
- `@webviewrpc/core@1.0.0`
- `@webviewrpc/native@1.0.0`
- `@webviewrpc/web@1.0.0`

## Troubleshooting

### "403 Forbidden" Error

- Ensure you're logged in: `npm whoami`
- Check package access: packages are published with `--access public`
- Verify your npm token has publish permissions

### "Version already exists"

- You're trying to publish a version that's already on npm
- Update version numbers before publishing

### Build Failures

- Run `pnpm clean && pnpm install && pnpm build` to rebuild
- Check that all tests pass: `pnpm test`
- Verify types: `pnpm typecheck`

## Rollback

If you need to deprecate or unpublish a version:

```bash
# Deprecate a version (preferred)
npm deprecate @webviewrpc/core@1.0.0 "Use 1.0.1 instead"

# Unpublish (only within 72 hours)
npm unpublish @webviewrpc/core@1.0.0
```

## Post-Publishing Checklist

After successful publish:

- [ ] Verify packages on npm: https://www.npmjs.com/package/@webviewrpc/core
- [ ] Check provenance attestations are present
- [ ] Test installation in a new project
- [ ] Update GitHub release notes
- [ ] Announce on social media/changelog
