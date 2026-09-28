import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { isSuperAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: '#111827',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Bosh sahifa',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Mijozlar',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="people" color={color} size={size} />
          ),
        }}
      />
      {/* Faqat SUPER_ADMIN uchun — oddiy foydalanuvchidan butunlay yashiriladi */}
      {isSuperAdmin ? (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="shield" color={color} size={size} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen name="admin" options={{ href: null }} />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple text-based icon since we don't want extra icon dependencies
function TabIcon({ name, color, size }: { name: string; color: ColorValue; size: number }) {
  const icons: Record<string, string> = {
    home: '🏠',
    people: '👥',
    person: '👤',
    shield: '🛡️',
  };

  const { Text } = require('react-native');
  return (
    <Text style={{ fontSize: size - 4 }}>{icons[name] || '•'}</Text>
  );
}
