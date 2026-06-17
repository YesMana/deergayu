import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { TouchableOpacity, Text, View } from 'react-native';

export default function TabLayout() {
  const { t, lang, toggleLanguage } = useLanguage();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#3e2723' },
        headerTintColor: '#4caf50',
        tabBarStyle: { backgroundColor: '#3e2723', borderTopColor: 'rgba(212, 175, 55, 0.15)' },
        tabBarActiveTintColor: '#d4af37',
        tabBarInactiveTintColor: '#d7ccc8',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, gap: 15 }}>
            <TouchableOpacity onPress={toggleLanguage} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="language" size={24} color="#d4af37" />
              <Text style={{ color: '#d4af37', fontWeight: 'bold', marginLeft: 4 }}>{lang.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/cart')}>
              <MaterialIcons name="shopping-cart" size={24} color="#4caf50" />
            </TouchableOpacity>
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav_home'),
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('nav_shop'),
          tabBarIcon: ({ color }) => <MaterialIcons name="shopping-bag" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="channeling"
        options={{
          title: t('nav_channeling'),
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="astrology"
        options={{
          title: "Astrology",
          tabBarIcon: ({ color }) => <MaterialIcons name="auto-fix-high" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
