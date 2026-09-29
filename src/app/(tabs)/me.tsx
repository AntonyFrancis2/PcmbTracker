import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { SUBJECTS, type SubjectKey } from '../../data/chapters';
import { addDays, shortDate, toDay } from '../../logic/dates';
import { computeStats, evaluateBadges, rewardMilestones } from '../../logic/gamify';
import { useStore } from '../../state/AppStore';
import { Bar, Button, Card, Chip, SectionTitle, T } from '../../ui/components';
import { DateField } from '../../ui/DateField';
import { usePalette, radius } from '../../ui/theme';

export default function Me() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { account, cloud, profile, progress, updateProfile, addReward, removeReward, signOut, deleteAccount } = useStore();
  const [title, setTitle] = useState('');
  const [milestone, setMilestone] = useState('halfway');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const milestones = useMemo(() => rewardMilestones(profile.subjects), [profile.subjects]);
  const badgeState = useMemo(() => {
    const stats = computeStats(profile, progress);
    return new Map(evaluateBadges({ stats, profile, progress, now: Date.now() }).map((b) => [b.id, b]));
  }, [profile, progress]);

  const today = toDay(Date.now());
  const toggleSubject = (k: SubjectKey) => {
    const next = profile.subjects.includes(k) ? profile.subjects.filter((x) => x !== k) : SUBJECTS.map((s) => s.key).filter((x) => x === k || profile.subjects.includes(x));
    if (next.length) updateProfile({ subjects: next });
  };

  const add = () => {
    if (!title.trim()) return;
    addReward(title, milestones.some((m) => m.id === milestone) ? milestone : milestones[0].id);
    setTitle('');
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(`That didn't work. Check your internet and try again. (${(e as Error).message})`);
    } finally {
      setBusy(false);
    }
  };

  const locked = profile.rewards.filter((r) => r.unlockedAt == null);
  const unlocked = profile.rewards.filter((r) => r.unlockedAt != null);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 48, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <T variant="title">Me</T>

      <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {account?.photo ? (
          <Image source={{ uri: account.photo }} style={{ width: 48, height: 48, borderRadius: 24 }} />
        ) : (
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person" size={24} color={c.accent} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '800' }}>{account?.name ?? 'On this phone'}</T>
          <T variant="small">{account?.email ?? 'Not signed in. Progress is saved on this device only.'}</T>
        </View>
      </Card>

      {/* Rewards */}
      <SectionTitle>My rewards</SectionTitle>
      <T variant="small" style={{ marginTop: -8 }}>
        Agree a treat with your family and pick the milestone that unlocks it.
      </T>
      {locked.map((r) => {
        const b = badgeState.get(r.milestone);
        return (
          <Card key={r.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="gift-outline" size={22} color={c.gold} />
              <T style={{ flex: 1, fontWeight: '800' }}>{r.title}</T>
              <Pressable accessibilityLabel={`Remove reward ${r.title}`} onPress={() => removeReward(r.id)} hitSlop={10}>
                <Ionicons name="close" size={20} color={c.faint} />
              </Pressable>
            </View>
            {b && (
              <>
                <Bar value={b.current / Math.max(1, b.needed)} color={c.gold} height={6} />
                <T variant="small">
                  Unlocks at {b.name}: {b.desc.toLowerCase()} · {b.current}/{b.needed}
                </T>
              </>
            )}
          </Card>
        );
      })}
      {unlocked.map((r) => (
        <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: c.gold }}>
          <Ionicons name="gift" size={22} color={c.gold} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800' }}>{r.title}</T>
            <T variant="small" color={c.gold}>
              Unlocked {shortDate(r.unlockedAt as number)}. Enjoy it!
            </T>
          </View>
          <Pressable accessibilityLabel={`Remove reward ${r.title}`} onPress={() => removeReward(r.id)} hitSlop={10}>
            <Ionicons name="close" size={20} color={c.faint} />
          </Pressable>
        </Card>
      ))}
      <Card style={{ gap: 10 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Add a reward, e.g. New headphones"
          placeholderTextColor={c.faint}
          maxLength={60}
          onSubmitEditing={add}
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 12, fontSize: 16, color: c.ink }}
        />
        <T variant="small">Unlocks when I reach</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {milestones.map((m) => (
            <Chip key={m.id} label={m.name} selected={milestone === m.id} onPress={() => setMilestone(m.id)} color={c.gold} />
          ))}
        </View>
        <Button label="Add reward" kind="secondary" onPress={add} disabled={!title.trim()} />
      </Card>

      {/* Plan */}
      <SectionTitle>Finish-by plan</SectionTitle>
      <DateField label="Finish first reading by" value={profile.firstReadTarget} onChange={(d) => updateProfile({ firstReadTarget: d })} min={addDays(today, 1)} />
      <DateField label="Finish revision by" value={profile.revisionTarget} onChange={(d) => updateProfile({ revisionTarget: d })} min={profile.firstReadTarget ?? addDays(today, 1)} />
      <Pressable onPress={() => updateProfile({ planStart: today })}>
        <T variant="small" color={c.accent} style={{ fontWeight: '700' }}>
          Plan started {shortDate(profile.planStart)}. Restart the plan from today
        </T>
      </Pressable>

      {/* Subjects */}
      <SectionTitle>My subjects</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SUBJECTS.map((s) => (
          <Chip key={s.key} label={s.name} selected={profile.subjects.includes(s.key)} onPress={() => toggleSubject(s.key)} color={c.subject[s.key]} />
        ))}
      </View>
      <T variant="small" style={{ marginTop: -6 }}>
        Hiding a subject keeps its ticks. Badges you've earned stay earned.
      </T>

      {/* Privacy */}
      <SectionTitle>Privacy</SectionTitle>
      <Card style={{ gap: 6 }}>
        <T variant="small">
          This app saves your Google name and email, your subjects, target dates, rewards and the dates you ticked each chapter. Other students
          can't see any of it. The app's admin (the person who runs the app) can see each student's progress, including which chapters are read
          and revised and when, to help keep everyone on track. Delete everything below at any time.
        </T>
      </Card>

      {error && (
        <T variant="small" color={c.danger}>
          {error}
        </T>
      )}
      {cloud && account && <Button label="Sign out" kind="secondary" onPress={() => run(signOut)} disabled={busy} />}
      {!confirmDelete ? (
        <Button label={cloud ? 'Delete my account and data' : 'Reset all progress'} kind="ghost" onPress={() => setConfirmDelete(true)} disabled={busy} />
      ) : (
        <Card style={{ gap: 10, borderColor: c.danger }}>
          <T style={{ fontWeight: '800' }}>Delete everything?</T>
          <T variant="small">All ticks, badges and rewards will be removed for good. This can't be undone.</T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Keep it" kind="secondary" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
            <Button
              label={busy ? 'Deleting…' : 'Delete'}
              kind="danger"
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await deleteAccount();
                  setConfirmDelete(false);
                })
              }
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}
      <T variant="small" style={{ textAlign: 'center', color: c.faint }}>
        Version {Application.nativeApplicationVersion ?? '1.0.0'} · NCERT Class 12 (rationalised)
      </T>
    </ScrollView>
  );
}
