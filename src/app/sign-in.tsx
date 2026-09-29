import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../state/AppStore';
import { Button, T } from '../ui/components';
import { usePalette } from '../ui/theme';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'checkmark-done-circle', text: 'Tick every NCERT chapter twice: first read and revision' },
  { icon: 'speedometer', text: 'Set a finish-by date and see if you are ahead of plan' },
  { icon: 'trophy', text: 'Earn badges, level up and unlock rewards you set' },
  { icon: 'lock-closed', text: 'Other students never see your progress' },
];

export default function SignIn() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { signIn } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(`Couldn't sign in. Check your internet and try again. (${(e as Error).message})`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24, gap: 28, justifyContent: 'center' }}>
      <View style={{ gap: 10 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="school" size={34} color={c.onAccent} />
        </View>
        <T variant="display">PCMB Tracker</T>
        <T color={c.muted}>Class 12 NCERT Physics, Chemistry, Maths and Biology. Finish early, revise twice, walk into the exam ready.</T>
      </View>
      <View style={{ gap: 14 }}>
        {POINTS.map((p) => (
          <View key={p.text} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Ionicons name={p.icon} size={24} color={c.accent} />
            <T style={{ flex: 1 }}>{p.text}</T>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <Button label={busy ? 'Signing in…' : 'Continue with Google'} onPress={go} disabled={busy} icon={<Ionicons name="logo-google" size={18} color={c.onAccent} />} />
        {error && <T variant="small" color={c.danger}>{error}</T>}
        <T variant="small" style={{ textAlign: 'center' }}>
          We save your Google name and email, chapter ticks, subjects, dates and rewards. Other students can't see your progress; the app's admin can, to help keep everyone on track. You can delete everything from the Me tab.
        </T>
      </View>
    </ScrollView>
  );
}
