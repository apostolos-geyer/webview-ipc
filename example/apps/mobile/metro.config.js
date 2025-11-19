const { getDefaultConfig } = require('expo/metro-config')
const { withNativewind } = require('nativewind/metro')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../../..')

const config = getDefaultConfig(projectRoot, {
  isCSSEnabled: true,
})

// Configure for monorepo with hoisted dependencies
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(workspaceRoot, 'node_modules'),
]

// Add .mjs extension support for ESM modules
if (!config.resolver.sourceExts.includes('mjs')) {
  config.resolver.sourceExts.push('mjs')
}

module.exports = withNativewind(config, {
  input: './globals.css',
  inlineRem: 16,
})
