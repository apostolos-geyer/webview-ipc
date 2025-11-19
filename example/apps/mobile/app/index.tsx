import { contract } from '@example/contract'
import { useEvent, useNativeClient } from '@webviewrpc/native'
import { useEffect, useRef, useState } from 'react'
import { Alert, AppState, Pressable, Platform, StyleSheet, Text, View } from 'react-native'
import WebView from 'react-native-webview'

export default function App() {
  const webViewRef = useRef<WebView>(null)
  const [counter, setCounter] = useState(0)

  // Create RPC client
  const client = useNativeClient({
    webViewRef,
    contract,
    timeout: 5000,
    onError: (error) => {
      console.error('[Native] RPC Error:', error)
    },
  })

  // Handle web procedures
  useEffect(() => {
    // Navigate handler
    client.native.handle('navigate', async ({ screen }) => {
      Alert.alert('Navigation', `Navigate to: ${screen}`)
    })

    // Share handler
    client.native.handle('share', async ({ title, message, url }) => {
      Alert.alert('Share', `${title}\n${message}\n${url || ''}`)
      return { success: true }
    })

    // Device info handler
    client.native.handle('getDeviceInfo', async () => {
      return {
        platform: Platform.OS,
        version: Platform.Version.toString(),
      }
    })
  }, [client])

  // Listen to web events
  useEvent(client, 'web', 'counterChanged', ({ count }) => {
    console.log('[Native] Counter changed from web:', count)
    setCounter(count)
  })

  useEvent(client, 'web', 'themeChanged', ({ theme }) => {
    console.log('[Native] Theme changed from web:', theme)
  })

  // App state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      client.native.emit('appStateChanged', {
        state: state as 'active' | 'background' | 'inactive',
      })
    })
    return () => subscription.remove()
  }, [client])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WebView RPC Example</Text>
        <Text style={styles.subtitle}>Native Counter: {counter}</Text>

        <Pressable
          onPress={async () => {
            try {
              await client.web.call('showToast', {
                message: 'Hello from Native!',
                duration: 3000,
              })
            } catch (error) {
              console.error('[Native] Failed to show toast:', error)
            }
          }}
        >
          <Text>Call web (toast)</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            try {
              const newValue = counter + 1
              await client.web.call('updateCounter', {
                value: newValue,
              })
              // Update local state after successful call
              setCounter(newValue)
            } catch (error) {
              console.error('[Native] Failed to update counter:', error)
            }
          }}
        >
          <Text>Call web (counter)</Text>
        </Pressable>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: 'http://localhost:3000' }}
        style={styles.webview}
        onMessage={client.handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  webview: {
    flex: 1,
  },
})
