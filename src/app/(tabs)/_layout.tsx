import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../../ui/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const c = usePalette();
  const icon = (on: IconName, off: IconName) =>
    function TabIcon({ color, focused, size }: { color: import('react-native').ColorValue; focused: boolean; size: number }) {
      return <Ionicons name={focused ? on : off} size={size} color={color as string} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.faint,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        tabBarLabelStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="chapters" options={{ title: 'Chapters', tabBarIcon: icon('book', 'book-outline') }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="badges" options={{ title: 'Badges', tabBarIcon: icon('trophy', 'trophy-outline') }} />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
