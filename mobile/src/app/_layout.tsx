import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { CartProvider } from '../context/CartContext';
import AyurBotMobile from '../components/AI/AyurBotMobile';
import OfflineBanner from '../components/OfflineBanner';

/**
 * Shared backend with website:
 * - Firebase Auth (same project)
 * - Express API https://deergayu-api.onrender.com
 * Cart / orders / appointments sync when logged in with the same account.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <StatusBar style="light" />
            <OfflineBanner />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: '#142018' },
                headerTintColor: '#7cb342',
                contentStyle: { backgroundColor: '#0a140f' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="cart" options={{ headerShown: false, presentation: 'modal' }} />
              <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="account" options={{ headerShown: false }} />
              <Stack.Screen name="wishlist" options={{ headerShown: false }} />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="orders" options={{ headerShown: false }} />
              <Stack.Screen name="appointments" options={{ headerShown: false }} />
              <Stack.Screen name="symptom-checker" options={{ headerShown: false }} />
            </Stack>
            <AyurBotMobile />
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
