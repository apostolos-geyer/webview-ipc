'use client'

import { useState, useEffect } from 'react'
import { useClient, useEvent, useProcedure } from '@webviewrpc/web'
import type { contract } from '@example/contract'

type Contract = typeof contract

export default function Home() {
  const client = useClient<Contract>()
  const [counter, setCounter] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<{ platform: string; version: string } | null>(null)

  // Listen to native events
  useEvent<Contract, 'native', 'appStateChanged'>('native', 'appStateChanged', (data) => {
    console.log('[Web] App state changed:', data.state)
  })

  // Handle native procedures
  useEffect(() => {
    client.web.handle('showToast', async (data) => {
      setToast(data.message)
      setTimeout(() => setToast(null), data.duration || 3000)
    })

    client.web.handle('updateCounter', async (data) => {
      setCounter(data.value)
    })
  }, [client])

  // Procedure hooks
  const { mutate: navigate, isPending: isNavigating } = useProcedure<Contract, 'native', 'navigate'>('native', 'navigate')
  const { mutate: share, isPending: isSharing } = useProcedure<Contract, 'native', 'share'>('native', 'share')

  const handleGetDeviceInfo = async () => {
    try {
      const info = await client.native.call('getDeviceInfo', {})
      setDeviceInfo(info)
    } catch (error) {
      console.error('[Web] Failed to get device info:', error)
      // Could show error state in UI
    }
  }

  const handleCounterChange = () => {
    const newCount = counter + 1
    setCounter(newCount)
    client.web.emit('counterChanged', { count: newCount })
  }

  return (
    <div style={styles.container}>
      <h1>WebView RPC Example - Web</h1>

      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}

      <div style={styles.section}>
        <h2>Counter: {counter}</h2>
        <button onClick={handleCounterChange} style={styles.button}>
          Increment & Emit Event
        </button>
      </div>

      <div style={styles.section}>
        <h2>Call Native Procedures</h2>
        <button
          onClick={() => navigate({ screen: 'Settings' })}
          disabled={isNavigating}
          style={styles.button}
        >
          {isNavigating ? 'Navigating...' : 'Navigate to Settings'}
        </button>

        <button
          onClick={() => share({
            title: 'Check this out!',
            message: 'WebView RPC is awesome',
            url: 'https://github.com',
          })}
          disabled={isSharing}
          style={styles.button}
        >
          {isSharing ? 'Sharing...' : 'Share Content'}
        </button>

        <button onClick={handleGetDeviceInfo} style={styles.button}>
          Get Device Info
        </button>

        {deviceInfo && (
          <div style={styles.info}>
            Platform: {deviceInfo.platform}, Version: {deviceInfo.version}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2>Emit Events</h2>
        <button
          onClick={() => client.web.emit('themeChanged', { theme: 'dark' })}
          style={styles.button}
        >
          Emit Theme Changed (Dark)
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'system-ui, sans-serif',
    maxWidth: '600px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '30px',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
  },
  button: {
    margin: '5px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
  },
  toast: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
    padding: '15px 20px',
    backgroundColor: '#333',
    color: 'white',
    borderRadius: '5px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
  },
  info: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
  },
}
