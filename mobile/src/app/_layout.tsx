import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { DefaultTheme, ThemeProvider, DarkTheme } from 'expo-router';
import { LanguageProvider } from '../context/LanguageContext';
import AyurBotMobile from '../components/AI/AyurBotMobile';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // Custom Dark Theme matching web
  const AppDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#2c1e16',
      card: '#3e2723',
      text: '#fdfbf7',
      primary: '#4caf50',
    },
  };

  return (
    <LanguageProvider>
      <ThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppDarkTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="cart" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="symptom-checker" options={{ headerShown: false }} />
        </Stack>
        <AyurBotMobile />
      </ThemeProvider>
    </LanguageProvider>
  );
}
