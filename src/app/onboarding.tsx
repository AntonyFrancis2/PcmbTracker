import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STREAMS, SUBJECTS, type SubjectKey } from '../data/chapters';
import { addDays, toDay } from '../logic/dates';
import { rewardMilestones } from '../logic/gamify';
import { useStore } from '../state/AppStore';
import { Button, Card, Chip, T } from '../ui/components';
import { DateField } from '../ui/DateField';
import { usePalette, radius } from '../ui/theme';

export default function Onboarding() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { updateProfile, addReward, account } = useStore();
  const today = toDay(Date.now());

  const [subjects, setSubjects] = useState<SubjectKey[]>(['phy', 'che', 'mat', 'bio']);
  const [firstRead, setFirstRead] = useState<string | null>(addDays(today, 90));
  const [revision, setRevision] = useState<string | null>(addDays(today, 150));
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardMilestone, setRewardMilestone] = useState('halfway');

  const milestones = useMemo(() => rewardMilestones(subjects), [subjects]);
  const toggleSubject = (k: SubjectKey) =>
    setSubjects((s) => (s.includes(k) ? s.filter((x) => x !== k) : SUBJECTS.map((x) => x.key).filter((x) => x === k || s.includes(x))));

  const chapters = SUBJECTS.filter((s) => subjects.includes(s.key)).reduce((n, s) => n + s.chapters.length, 0);
  const first = account?.name?.split(' ')[0];

  const start = () => {
    if (rewardTitle.trim()) {
      // Profile must exist with subjects first so the milestone is valid.
      updateProfile({ subjects, firstReadTarget: firstRead, revisionTarget: revision, planStart: today });
      addReward(rewardTitle, milestones.some((m) => m.id === rewardMilestone) ? rewardMilestone : 'halfway');
      updateProfile({ onboarded: true });
    } else {
      updateProfile({ subjects, firstReadTarget: firstRead, revisionTarget: revision, planStart: today, onboarded: true });
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 6 }}>
        <T variant="title">{first ? `Welcome, ${first}!` : 'Welcome!'}</T>
        <T color={c.muted}>Three quick choices and you're ready. You can change all of these later.</T>
      </View>

      <Card style={{ gap: 12 }}>
        <T variant="label">1 · Your subjects</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {STREAMS.map((s) => (
            <Chip key={s.label} label={s.label} selected={s.subjects.length === subjects.length && s.subjects.every((k) => subjects.includes(k))} onPress={() => setSubjects(s.subjects)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {SUBJECTS.map((s) => (
            <Chip key={s.key} label={`${s.name} (${s.chapters.length})`} selected={subjects.includes(s.key)} onPress={() => toggleSubject(s.key)} color={c.subject[s.key]} />
          ))}
        </View>
        <T variant="small">{chapters} chapters to track</T>
      </Card>

      <Card style={{ gap: 12 }}>
        <T variant="label">2 · Your finish-by plan</T>
        <T variant="small">Pick dates a little before your exams. Finishing ahead of plan earns bonus XP and the Early Bird badge.</T>
        <DateField label="Finish first reading by" value={firstRead} onChange={setFirstRead} min={addDays(today, 1)} />
        <DateField label="Finish revision by" value={revision} onChange={setRevision} min={firstRead ?? addDays(today, 1)} />
      </Card>

      <Card style={{ gap: 12 }}>
        <T variant="label">3 · A reward for yourself (optional)</T>
        <T variant="small">Agree a treat with your family, like a movie night or new headphones. It unlocks when you hit the milestone.</T>
        <TextInput
          value={rewardTitle}
          onChangeText={setRewardTitle}
          placeholder="e.g. Movie night with friends"
          placeholderTextColor={c.faint}
          maxLength={60}
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: 14, fontSize: 16, color: c.ink, backgroundColor: c.surface }}
        />
        {rewardTitle.trim() !== '' && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {milestones.map((m) => (
              <Chip key={m.id} label={m.name} selected={rewardMilestone === m.id} onPress={() => setRewardMilestone(m.id)} color={c.gold} />
            ))}
          </View>
        )}
      </Card>

      <Button label="Start tracking" onPress={start} disabled={subjects.length === 0} />
    </ScrollView>
  );
}
