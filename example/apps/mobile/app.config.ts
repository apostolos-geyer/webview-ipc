import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'webview-rpc-example',
  slug: 'webview-rpc-example',
  version: '0.1.0',
  orientation: 'portrait',
  platforms: ['ios', 'android'],
  userInterfaceStyle: 'automatic',
  scheme: 'webview-rpc-example',
  newArchEnabled: true,
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
  },
  ios: {
    supportsTablet: true,
  },
  android: {},
}

export default config
