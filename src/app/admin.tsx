import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../lib/firebase';
import { ADMIN_EMAILS } from '../config';
import { studentRow, type StudentRow } from '../logic/admin';
import { emptyProgress, type Profile, type Progress } from '../logic/types';
import { defaultProfile, useStore } from '../state/AppStore';
import { AdminView } from '../ui/AdminView';
import { Button, Card, T } from '../ui/components';
import { usePalette } from '../ui/theme';

/** Read-only admin page listing every student. Only the admin Google account can load the data (enforced by Firestore rules). */
export default function Admin() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { status, account, signIn, signOut } = useStore();
  const isAdmin = !!account?.email && ADMIN_EMAILS.includes(account.email.toLowerCase());
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const [users, progress] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'progress'))]);
      const prog = new Map(progress.docs.map((d) => [d.id, { ...emptyProgress(), ...(d.data() as Progress) }]));
      const ids = new Set([...users.docs.map((d) => d.id), ...prog.keys()]);
      const byId = new Map(users.docs.map((d) => [d.id, { ...defaultProfile(), ...(d.data() as Profile) }]));
      const now = Date.now();
      setRows([...ids].map((id) => studentRow(id, byId.get(id) ?? defaultProfile(), prog.get(id) ?? emptyProgress(), now)));
      setLoadedAt(now);
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(
        code === 'permission-denied'
          ? 'Firestore refused the read. Publish the latest firestore.rules (with isAdmin) in the Firebase console, then refresh.'
          : `Couldn't load students: ${(e as Error).message}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const gate = (icon: keyof typeof Ionicons.glyphMap, title: string, body: string, action?: React.ReactNode) => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: insets.top + 24 }}>
      <Card style={{ maxWidth: 420, width: '100%', alignItems: 'center', gap: 10, padding: 28 }}>
        <Ionicons name={icon} size={36} color={c.accent} />
        <T variant="h2" style={{ textAlign: 'center' }}>
          {title}
        </T>
        <T variant="small" style={{ textAlign: 'center' }}>
          {body}
        </T>
        {action}
      </Card>
    </View>
  );

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  if (!db) return gate('cloud-offline-outline', 'Firebase is not set up', 'The admin page needs the Firebase project to be configured.');
  if (!account) {
    return gate(
      'shield-checkmark-outline',
      'Admin sign-in',
      'Sign in with the admin Google account to see students.',
      <Button label="Continue with Google" onPress={() => signIn().catch(() => {})} style={{ alignSelf: 'stretch' }} />,
    );
  }
  if (!isAdmin) {
    return gate(
      'lock-closed-outline',
      'Not an admin account',
      `${account.email ?? 'This account'} can't open the admin page.`,
      <Button label="Sign out" kind="secondary" onPress={() => signOut().catch(() => {})} style={{ alignSelf: 'stretch' }} />,
    );
  }
  if (error) {
    return gate('alert-circle-outline', 'Could not load students', error, <Button label="Try again" onPress={load} style={{ alignSelf: 'stretch' }} />);
  }
  if (!loadedAt) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <AdminView rows={rows} loadedAt={loadedAt} onRefresh={load} refreshing={loading} />
    </View>
  );
}
