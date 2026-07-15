import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { TouchableOpacity, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { t, lang, toggleLanguage } = useLanguage();
  const { cartCount } = useCart();
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#142018' },
        headerTintColor: '#7cb342',
        tabBarStyle: {
          backgroundColor: '#142018',
          borderTopColor: 'rgba(124,179,66,0.2)',
          height: 56 + Math.max(insets.bottom, 6),
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarActiveTintColor: '#d4af37',
        tabBarInactiveTintColor: '#9aaa9a',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, gap: 14 }}>
            {isAdmin ? (
              <TouchableOpacity
                onPress={() => router.push('/admin')}
                accessibilityLabel="Admin Panel"
                hitSlop={10}
              >
                <MaterialIcons name="shield" size={22} color="#7cb342" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={toggleLanguage}
              style={{ flexDirection: 'row', alignItems: 'center' }}
              accessibilityLabel="Change language"
              hitSlop={8}
            >
              <MaterialIcons name="language" size={22} color="#d4af37" />
              <Text style={{ color: '#d4af37', fontWeight: 'bold', marginLeft: 4 }}>
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/cart')}
              style={{ position: 'relative' }}
              accessibilityLabel="Cart"
              hitSlop={8}
            >
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
            <TouchableOpacity
              onPress={() => router.push(user ? '/account' : '/login')}
              accessibilityLabel={user ? 'Account' : 'Login'}
              hitSlop={8}
            >
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
          title: 'Shop',
          tabBarIcon: ({ color }) => <MaterialIcons name="shopping-bag" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="channeling"
        options={{
          title: 'Book',
          tabBarIcon: ({ color }) => <MaterialIcons name="event" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MaterialIcons name="apps" size={22} color={color} />,
        }}
      />
      {/* Nested behind More — keep routes, hide from tab bar */}
      <Tabs.Screen name="astrology" options={{ href: null, title: t('srv_astro_title') }} />
      <Tabs.Screen name="guide" options={{ href: null, title: t('nav_guide') }} />
      <Tabs.Screen name="videos" options={{ href: null, title: t('nav_videos') }} />
    </Tabs>
  );
}
