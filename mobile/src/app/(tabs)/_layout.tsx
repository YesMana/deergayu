import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { TouchableOpacity, Text, View } from 'react-native';

export default function TabLayout() {
  const { t, lang, toggleLanguage } = useLanguage();
  const { cartCount } = useCart();
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#142018' },
        headerTintColor: '#7cb342',
        tabBarStyle: {
          backgroundColor: '#142018',
          borderTopColor: 'rgba(124,179,66,0.2)',
          height: 62,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: '#d4af37',
        tabBarInactiveTintColor: '#9aaa9a',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, gap: 14 }}>
            {isAdmin ? (
              <TouchableOpacity onPress={() => router.push('/admin')} accessibilityLabel="Admin Panel">
                <MaterialIcons name="shield" size={22} color="#7cb342" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={toggleLanguage}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <MaterialIcons name="language" size={22} color="#d4af37" />
              <Text style={{ color: '#d4af37', fontWeight: 'bold', marginLeft: 4 }}>
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/cart')} style={{ position: 'relative' }}>
              <MaterialIcons name="shopping-cart" size={22} color="#7cb342" />
              {cartCount > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -8,
                    backgroundColor: '#ef5350',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{cartCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(user ? '/account' : '/login')}>
              <MaterialIcons name={user ? 'person' : 'login'} size={22} color="#d4af37" />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav_home'),
          headerTitle: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: t('nav_shop'),
          tabBarIcon: ({ color }) => <MaterialIcons name="shopping-bag" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="channeling"
        options={{
          title: t('nav_channeling'),
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="astrology"
        options={{
          title: t('srv_astro_title'),
          tabBarIcon: ({ color }) => <MaterialIcons name="auto-awesome" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: t('nav_guide'),
          tabBarIcon: ({ color }) => <MaterialIcons name="menu-book" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: t('nav_videos'),
          tabBarIcon: ({ color }) => <MaterialIcons name="ondemand-video" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
