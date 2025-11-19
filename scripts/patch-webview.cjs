#!/usr/bin/env node

/**
 * Patch react-native-webview for React Native 0.76+ compatibility
 *
 * Issue: React Native 0.76 removed Image.resolveAssetSource, breaking react-native-webview
 * Solution: Replace destructuring with safe fallback that checks if method exists
 *
 * This script patches both iOS and Android WebView implementations.
 */

const fs = require('node:fs')
const path = require('node:path')

const OLD_CODE = 'const { resolveAssetSource } = Image;'

const NEW_CODE = `const resolveAssetSource = (source) => {
  if (!source) return null;
  if (typeof source === 'number') {
    return Image.resolveAssetSource ? Image.resolveAssetSource(source) : source;
  }
  return source;
};`

function patchFile(filePath, platform) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  WebView.${platform}.tsx not found - skipping patch`)
    console.log(`    Expected at: ${filePath}`)
    return false
  }

  let content = fs.readFileSync(filePath, 'utf8')

  if (content.includes(OLD_CODE)) {
    content = content.replace(OLD_CODE, NEW_CODE)
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(
      `✅ Patched react-native-webview/src/WebView.${platform}.tsx for RN 0.76+ compatibility`
    )
    return true
  }

  console.log(`ℹ️  WebView.${platform}.tsx already patched or code structure changed`)
  return false
}

function main() {
  console.log('Patching react-native-webview for React Native 0.76+ compatibility...\n')

  // Try to find node_modules from current directory or parent directories
  let currentDir = process.cwd()
  let nodeModulesPath = null

  while (currentDir !== path.parse(currentDir).root) {
    const testPath = path.join(currentDir, 'node_modules')
    if (fs.existsSync(testPath)) {
      nodeModulesPath = testPath
      break
    }
    currentDir = path.dirname(currentDir)
  }

  if (!nodeModulesPath) {
    console.error('❌ Could not find node_modules directory')
    console.error(
      '   Make sure you run this script from your project directory after installing dependencies'
    )
    process.exit(1)
  }

  const iosPath = path.join(nodeModulesPath, 'react-native-webview/src/WebView.ios.tsx')
  const androidPath = path.join(nodeModulesPath, 'react-native-webview/src/WebView.android.tsx')

  const iosPatched = patchFile(iosPath, 'ios')
  const androidPatched = patchFile(androidPath, 'android')

  console.log('')

  if (iosPatched || androidPatched) {
    console.log('✨ Patching complete!')
  } else {
    console.log('ℹ️  No changes needed')
  }
}

main()
