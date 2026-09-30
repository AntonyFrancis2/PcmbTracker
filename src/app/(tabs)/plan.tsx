import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { addDays, dayStart, shortDate, toDay } from '../../logic/dates';
import { dayLabel, ratedOn, type Plan } from '../../logic/planner';
import { SlotRow, usePlan } from '../../ui/PlanParts';
import { useStore } from '../../state/AppStore';
import { Button, Card, T } from '../../ui/components';
import { usePalette, radius } from '../../ui/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function MonthCalendar({ plan, today, selected, onSelect, doneByDay, daysOff }: { plan: Plan; today: string; selected: string; onSelect: (d: string) => void; doneByDay: Map<string, number>; daysOff: string[] }) {
  const c = usePalette();
  const [cursor, setCursor] = useState(() => {
    const d = new Date(dayStart(selected));
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = (first.getDay() + 6) % 7;
    const n = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let i = 1; i <= n; i++) out.push(toDay(new Date(cursor.y, cursor.m, i)));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);
  const shift = (n: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <Card style={{ gap: 10, padding: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shift(-1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={c.ink} />
        </Pressable>
        <T variant="h2">
          {MONTHS[cursor.m]} {cursor.y}
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shift(1)} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color={c.ink} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {DOW.map((d, i) => (
          <T key={i} variant="small" style={{ flex: 1, textAlign: 'center', fontWeight: '700' }}>
            {d}
          </T>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 0.9 }} />;
          const planned = plan.days[d]?.length ?? 0;
          const done = doneByDay.get(d) ?? 0;
          const past = d < today;
          const isSel = d === selected;
          const isToday = d === today;
          const off = daysOff.includes(d);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${shortDate(d)}: ${off ? 'day off' : past ? `${done} topics done` : `${planned} sessions planned`}`}
              onPress={() => onSelect(d)}
              style={{ width: `${100 / 7}%`, aspectRatio: 0.9, padding: 2 }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  backgroundColor: isSel ? c.accent : 'transparent',
                  borderWidth: isToday && !isSel ? 1.5 : 0,
                  borderColor: c.accent,
                }}
              >
                <T style={{ fontWeight: isToday || isSel ? '800' : '500', fontSize: 14 }} color={isSel ? c.onAccent : past ? c.faint : c.ink}>
                  {Number(d.slice(8))}
                </T>
                {off ? (
                  <T style={{ fontSize: 9, fontWeight: '800' }} color={isSel ? c.onAccent : c.faint}>
                    OFF
                  </T>
                ) : past ? (
                  done > 0 ? <Ionicons name="checkmark-circle" size={12} color={isSel ? c.onAccent : c.done} /> : <View style={{ height: 12 }} />
                ) : planned > 0 ? (
                  <T style={{ fontSize: 10, fontWeight: '800' }} color={isSel ? c.onAccent : c.accent}>
                    {planned}
                  </T>
                ) : (
                  <View style={{ height: 12 }} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <T variant="small" style={{ textAlign: 'center' }}>
        Numbers are sessions planned · ✓ days you rated topics · OFF your days off
      </T>
    </Card>
  );
}

export default function PlanTab() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { plan: settings, progress } = useStore();
  const { plan, today } = usePlan();
  const [selected, setSelected] = useState(today);

  const doneByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const [id, mk] of Object.entries(progress.chapters)) {
      if (id.includes(':') && (mk.c ?? 0) > 0) {
        const d = toDay(mk.u);
        m.set(d, (m.get(d) ?? 0) + 1);
      }
    }
    return m;
  }, [progress]);

  if (!settings || !plan) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, gap: 16, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        <T variant="title">Study plan</T>
        <Card style={{ gap: 12, alignItems: 'flex-start' }}>
          <Ionicons name="calendar" size={36} color={c.accent} />
          <T variant="h2">Get a day-by-day timetable</T>
          <T color={c.muted}>
            Answer 9 quick questions: when you start, when you want to finish, and how much time you have. The app spreads every topic you haven't done
            across your calendar, hour by hour, and rebalances if you miss a day.
          </T>
          <Button label="Make my plan" onPress={() => router.push('/plan-setup')} style={{ alignSelf: 'stretch' }} />
        </Card>
      </ScrollView>
    );
  }

  const fits = plan.readNeeded <= plan.readAvailable;
  const slots = plan.days[selected] ?? [];
  const past = selected < today;
  const doneThatDay = past ? ratedOn(progress, selected).length : 0;
  const isOff = settings.daysOff.includes(selected);
  const totalLeft = Object.values(plan.days).reduce((a, x) => a + x.length, 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 40, gap: 14, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T variant="title">Study plan</T>
        <Pressable accessibilityRole="button" onPress={() => router.push('/plan-setup')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} hitSlop={8}>
          <Ionicons name="create-outline" size={18} color={c.accent} />
          <T color={c.accent} style={{ fontWeight: '700' }}>
            Edit
          </T>
        </Pressable>
      </View>

      <Card style={{ gap: 4, borderColor: fits ? c.line : c.rev }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={fits ? 'checkmark-circle' : 'alert-circle'} size={20} color={fits ? c.done : c.rev} />
          <T style={{ fontWeight: '800', flex: 1 }}>
            {fits ? `On course to finish reading by ${shortDate(settings.readBy)}` : `Reading won't fit by ${shortDate(settings.readBy)}`}
          </T>
        </View>
        <T variant="small">
          {totalLeft} sessions left until {shortDate(settings.reviseBy)}
          {!fits && plan.suggestedReadBy ? ` · at this pace you'd finish reading around ${shortDate(plan.suggestedReadBy)}. Add hours or edit the plan.` : ''}
          {plan.unscheduled > 0 ? ` · ${plan.unscheduled} topics don't fit before your revision date` : ''}
        </T>
      </Card>

      <MonthCalendar plan={plan} today={today} selected={selected} onSelect={setSelected} doneByDay={doneByDay} daysOff={settings.daysOff} />

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <T variant="h2">{dayLabel(selected, today)}</T>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable accessibilityLabel="Previous day" onPress={() => setSelected(addDays(selected, -1))} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={c.muted} />
          </Pressable>
          <Pressable accessibilityLabel="Next day" onPress={() => setSelected(addDays(selected, 1))} hitSlop={8}>
            <Ionicons name="arrow-forward" size={20} color={c.muted} />
          </Pressable>
        </View>
      </View>

      <Card style={{ paddingVertical: 4 }}>
        {past ? (
          <T style={{ paddingVertical: 12 }} color={c.muted}>
            {doneThatDay ? `You rated ${doneThatDay} ${doneThatDay === 1 ? 'topic' : 'topics'} this day. Well done!` : 'Nothing rated this day. The plan has moved those topics forward.'}
          </T>
        ) : isOff ? (
          <T style={{ paddingVertical: 12 }} color={c.muted}>
            Day off. Enjoy it!
          </T>
        ) : slots.length === 0 ? (
          <T style={{ paddingVertical: 12 }} color={c.muted}>
            No study sessions planned.
          </T>
        ) : (
          slots.map((sl, i) => (
            <View key={`${sl.start}-${sl.task.topic.id}-${sl.part}`} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <SlotRow slot={sl} today={today} />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}
