import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStoreProvider, useStore } from '../state/AppStore';
import { Celebrations } from '../ui/Celebrations';
import { XpToast } from '../ui/XpToast';
import { usePalette } from '../ui/theme';

function Gate() {
  const { status, profile } = useStore();
  const c = usePalette();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} size="large" />
      </View>
    );
  }

  const signedIn = status === 'ready';
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !profile.onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && profile.onboarded}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        {/* Admin page checks the account itself; data access is enforced by Firestore rules. */}
        <Stack.Screen name="admin" />
      </Stack>
      <Celebrations />
      <XpToast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <Gate />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
