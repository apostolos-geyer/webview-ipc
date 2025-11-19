import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  platform: 'neutral',
  target: 'es2022',
  outDir: 'dist',
  external: ['react', 'react-native', 'react-native-webview', '@webview-rpc/core'],
})
