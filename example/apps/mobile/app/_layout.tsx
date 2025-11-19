import 'react-native-reanimated'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import '@/globals.css'

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Hide splash screen once layout is ready
  SplashScreen.hideAsync()

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  )
}
