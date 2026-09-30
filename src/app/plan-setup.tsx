import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SUBJECT_BY_KEY, SUBJECTS } from '../data/chapters';
import { addDays, shortDate, toDay } from '../logic/dates';
import { clock, defaultPlanSettings, generatePlan, neededPerStudyDay, type PlanSettings } from '../logic/planner';
import { useStore } from '../state/AppStore';
import { Button, Card, Chip, T } from '../ui/components';
import { DateField } from '../ui/DateField';
import { usePalette, radius } from '../ui/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_OPTIONS = [60, 90, 120, 180, 240];
const WEEKEND_OPTIONS = [120, 180, 240, 300, 360];

const hrs = (m: number) => (m % 60 === 0 ? `${m / 60} h` : `${(m / 60).toFixed(1)} h`);

function Question({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  const c = usePalette();
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <T variant="small" color={c.accent} style={{ fontWeight: '800' }}>
            {n}
          </T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontWeight: '800' }}>{title}</T>
          {hint ? <T variant="small">{hint}</T> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

function Stepper({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const c = usePalette();
  const shift = (d: number) => {
    const [h, m] = value.split(':').map(Number);
    const t = Math.min(23 * 60, Math.max(5 * 60, h * 60 + m + d));
    onChange(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  };
  const btn = (icon: 'remove' | 'add', d: number, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => shift(d)}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? c.surfaceAlt : c.surface,
      })}
    >
      <Ionicons name={icon} size={20} color={c.ink} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} accessibilityLabel={label}>
      {btn('remove', -30, 'Earlier by 30 minutes')}
      <T variant="h2" style={{ minWidth: 90, textAlign: 'center' }}>
        {clock(value)}
      </T>
      {btn('add', 30, 'Later by 30 minutes')}
    </View>
  );
}

export default function PlanSetup() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { plan, savePlan, profile, progress, updateProfile } = useStore();
  const today = toDay(Date.now());
  const [s, setS] = useState<PlanSettings>(() => plan ?? defaultPlanSettings(today, profile.firstReadTarget, profile.revisionTarget));
  const [dayOff, setDayOff] = useState<string | null>(null);
  const set = (patch: Partial<PlanSettings>) => setS((x) => ({ ...x, ...patch }));

  const preview = useMemo(() => {
    const p = generatePlan(s, profile.subjects, progress, today);
    return { p, perDay: neededPerStudyDay(s, p, today) };
  }, [s, profile.subjects, progress, today]);
  const weekly = s.studyDays.reduce((a, d) => a + (d >= 5 ? s.weekendMins : s.weekdayMins), 0);
  const fits = preview.p.readNeeded <= preview.p.readAvailable;

  const save = () => {
    savePlan(s);
    // Keep the dashboard's finish-by dates in step with the plan.
    if (profile.firstReadTarget !== s.readBy || profile.revisionTarget !== s.reviseBy) {
      updateProfile({ firstReadTarget: s.readBy, revisionTarget: s.reviseBy });
    }
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, gap: 14, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={c.ink} />
        </Pressable>
        <T variant="title" style={{ flex: 1 }}>
          {plan ? 'Edit my study plan' : 'Make my study plan'}
        </T>
      </View>
      <T color={c.muted}>Answer a few questions and the app spreads every topic you haven't done yet across your study time, hour by hour.</T>

      <Question n={1} title="When do you start?">
        <DateField label="Start date" value={s.start} onChange={(d) => d && set({ start: d })} min={today} />
      </Question>

      <Question n={2} title="When do you want to finish?" hint="First reading covers every topic you haven't rated. Revision covers Weak, then OK topics.">
        <DateField label="Finish first reading by" value={s.readBy} onChange={(d) => d && set({ readBy: d, reviseBy: s.reviseBy <= d ? addDays(d, 30) : s.reviseBy })} min={addDays(s.start, 7)} />
        <DateField label="Finish revision by" value={s.reviseBy} onChange={(d) => d && set({ reviseBy: d })} min={addDays(s.readBy, 1)} />
      </Question>

      <Question n={3} title="Which days can you study?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DAYS.map((d, i) => (
            <Chip
              key={d}
              label={d}
              selected={s.studyDays.includes(i)}
              onPress={() => set({ studyDays: s.studyDays.includes(i) ? s.studyDays.filter((x) => x !== i) : [...s.studyDays, i].sort() })}
            />
          ))}
        </View>
      </Question>

      <Question n={4} title="How long can you study each day?" hint="Time for these subjects only, not school or tuition.">
        <T variant="small">School days (Mon–Fri)</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WEEKDAY_OPTIONS.map((m) => (
            <Chip key={m} label={hrs(m)} selected={s.weekdayMins === m} onPress={() => set({ weekdayMins: m })} />
          ))}
        </View>
        <T variant="small">Weekends (Sat–Sun)</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WEEKEND_OPTIONS.map((m) => (
            <Chip key={m} label={hrs(m)} selected={s.weekendMins === m} onPress={() => set({ weekendMins: m })} />
          ))}
        </View>
      </Question>

      <Question n={5} title="What time do you usually start?">
        <Stepper value={s.startTime} onChange={(v) => set({ startTime: v })} label="Study start time" />
      </Question>

      <Question n={6} title="How long should each session be?" hint="A short break is added between sessions.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([30, 45, 60] as const).map((m) => (
            <Chip key={m} label={`${m} min`} selected={s.sessionMins === m} onPress={() => set({ sessionMins: m })} />
          ))}
        </View>
        <T variant="small">Break between sessions</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[5, 10, 15].map((m) => (
            <Chip key={m} label={`${m} min`} selected={s.breakMins === m} onPress={() => set({ breakMins: m })} />
          ))}
        </View>
      </Question>

      <Question n={7} title="How do you like to mix subjects?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="Different subject each session" selected={s.mix === 'rotate'} onPress={() => set({ mix: 'rotate' })} />
          <Chip label="One subject per day" selected={s.mix === 'daily'} onPress={() => set({ mix: 'daily' })} />
        </View>
      </Question>

      <Question n={8} title="Which subject needs extra time?" hint="It gets about twice as many sessions.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label="None" selected={s.focus == null} onPress={() => set({ focus: null })} />
          {SUBJECTS.filter((x) => profile.subjects.includes(x.key)).map((x) => (
            <Chip key={x.key} label={x.name} color={c.subject[x.key]} selected={s.focus === x.key} onPress={() => set({ focus: x.key })} />
          ))}
        </View>
      </Question>

      <Question n={9} title="Any days you can't study?" hint="Unit tests, pre-boards, family events. The plan skips them.">
        <DateField
          label="Add a day off"
          value={dayOff}
          placeholder="Pick a date"
          onChange={(d) => {
            setDayOff(null);
            if (d && !s.daysOff.includes(d)) set({ daysOff: [...s.daysOff, d].sort() });
          }}
          min={s.start}
        />
        {s.daysOff.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {s.daysOff.map((d) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`Remove day off ${shortDate(d)}`}
                onPress={() => set({ daysOff: s.daysOff.filter((x) => x !== d) })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.surfaceAlt }}
              >
                <T variant="small" color={c.ink}>
                  {shortDate(d)}
                </T>
                <Ionicons name="close" size={14} color={c.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </Question>

      <Card style={{ gap: 6, borderColor: fits ? c.done : c.rev, borderWidth: 1.5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={fits ? 'checkmark-circle' : 'alert-circle'} size={22} color={fits ? c.done : c.rev} />
          <T style={{ fontWeight: '800', flex: 1 }}>{fits ? 'This plan fits' : 'Not enough time yet'}</T>
        </View>
        <T variant="small">
          You'll study {hrs(weekly)} a week. First reading needs about {hrs(Math.round(preview.p.readNeeded / 30) * 30)} in total
          {preview.perDay ? `, roughly ${hrs(Math.ceil(preview.perDay / 15) * 15)} per study day` : ''}.
        </T>
        {!fits && preview.p.suggestedReadBy && (
          <>
            <T variant="small">
              Add more hours, or finish first reading by {shortDate(preview.p.suggestedReadBy)} instead.
            </T>
            <Button
              label={`Use ${shortDate(preview.p.suggestedReadBy)}`}
              kind="secondary"
              onPress={() => {
                const r = preview.p.suggestedReadBy!;
                set({ readBy: r, reviseBy: s.reviseBy <= r ? addDays(r, 30) : s.reviseBy });
              }}
            />
          </>
        )}
        <T variant="small" color={c.faint}>
          Time per topic starts as an estimate: {SUBJECTS.filter((x) => profile.subjects.includes(x.key))
            .map((x) => `${SUBJECT_BY_KEY[x.key].short} ${x.key === 'phy' || x.key === 'mat' ? 45 : 30} min`)
            .join(', ')}. Revision takes about half.
        </T>
      </Card>

      <Button label={plan ? 'Save plan' : 'Create my plan'} onPress={save} disabled={s.studyDays.length === 0} />
      {plan && (
        <Button
          label="Delete plan"
          kind="ghost"
          onPress={() => {
            savePlan(null);
            router.back();
          }}
        />
      )}
    </ScrollView>
  );
}
