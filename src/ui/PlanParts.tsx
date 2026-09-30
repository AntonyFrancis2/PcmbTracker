import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SUBJECT_BY_KEY } from '../data/chapters';
import { dayStart, toDay } from '../logic/dates';
import { clock, generatePlan, type Plan, type PlanSlot } from '../logic/planner';
import type { Confidence, Progress } from '../logic/types';
import { useStore } from '../state/AppStore';
import { T } from './components';
import { ConfidencePicker } from './ChapterRow';
import { showToast } from './XpToast';
import { usePalette } from './theme';

/**
 * Today's timetable stays put while the student works through it: ratings made today are ignored
 * when building the plan, and shown as done on their slots instead. Tomorrow the plan rebalances.
 */
export function frozenForToday(progress: Progress, now = Date.now()): Progress {
  const start = dayStart(toDay(now));
  const chapters = { ...progress.chapters };
  for (const [id, m] of Object.entries(chapters)) if (id.includes(':') && m.u >= start && (m.c ?? 0) > 0) chapters[id] = { ...m, c: 0 };
  return { ...progress, chapters };
}

export function usePlan(): { plan: Plan | null; today: string } {
  const { plan: settings, profile, progress } = useStore();
  const today = toDay(Date.now());
  const plan = useMemo(
    () => (settings ? generatePlan(settings, profile.subjects, frozenForToday(progress), today) : null),
    // Rebuild when ticks change; the frozen view keeps today's slots stable.
    [settings, profile.subjects, progress, today],
  );
  return { plan, today };
}

export function slotDone(progress: Progress, slot: PlanSlot, today: string): boolean {
  const m = progress.chapters[slot.task.topic.id];
  if (!m || (m.c ?? 0) === 0) return false;
  return slot.task.kind === 'read' ? true : m.u >= dayStart(today);
}

export function SlotRow({ slot, today }: { slot: PlanSlot; today: string }) {
  const c = usePalette();
  const { progress, rateTopic } = useStore();
  const { task } = slot;
  const color = c.subject[task.chapter.subject];
  const done = slotDone(progress, slot, today);
  const value = (progress.chapters[task.topic.id]?.c ?? 0) as Confidence;
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}>
      <View style={{ width: 70 }}>
        <T variant="small" style={{ fontWeight: '800', fontVariant: ['tabular-nums'] }} color={c.ink}>
          {clock(slot.start)}
        </T>
        <T variant="small">{clock(slot.end)}</T>
      </View>
      <View style={{ width: 4, borderRadius: 2, backgroundColor: done ? c.done : color }} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <T variant="label" color={color} style={{ fontSize: 11 }}>
            {SUBJECT_BY_KEY[task.chapter.subject].name} · Ch {task.chapter.no}
          </T>
          <View style={{ borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, backgroundColor: task.kind === 'read' ? c.accentSoft : c.revSoft }}>
            <T variant="small" style={{ fontSize: 11, fontWeight: '800' }} color={task.kind === 'read' ? c.accent : c.rev}>
              {task.kind === 'read' ? 'Learn' : 'Revise'}
              {slot.parts > 1 ? ` · part ${slot.part}/${slot.parts}` : ''}
            </T>
          </View>
          {done && <Ionicons name="checkmark-circle" size={16} color={c.done} />}
        </View>
        <T style={{ fontWeight: '700', textDecorationLine: done ? 'line-through' : 'none' }} color={done ? c.muted : c.ink}>
          {task.topic.no} {task.topic.title}
        </T>
        <T variant="small" numberOfLines={1}>
          {task.chapter.name}
        </T>
        {slot.part === slot.parts && (
          <View style={{ alignSelf: 'flex-start', marginTop: 2 }}>
            <ConfidencePicker
              value={value}
              title={task.topic.title}
              onChange={(v) => {
                const gained = rateTopic(task.topic.id, v);
                if (gained > 0) showToast(`Chapter finished! +${gained} XP`);
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

