import { Stack } from 'expo-router';
import { LanguageProvider } from '../context/LanguageContext';
import { CartProvider } from '../context/CartContext';
import AyurBotMobile from '../components/AI/AyurBotMobile';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <CartProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#142018' },
            headerTintColor: '#7cb342',
            contentStyle: { backgroundColor: '#0a140f' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="cart" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="symptom-checker" options={{ headerShown: false }} />
        </Stack>
        <AyurBotMobile />
      </CartProvider>
    </LanguageProvider>
  );
}
