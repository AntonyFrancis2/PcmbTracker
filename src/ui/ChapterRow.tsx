import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { Chapter } from '../data/chapters';
import { shortDate } from '../logic/dates';
import { topicStats } from '../logic/progress';
import type { Confidence } from '../logic/types';
import { TOPICS, type SubTopic } from '../data/topics';
import { useStore } from '../state/AppStore';
import { Bar, T } from './components';
import { usePalette, radius } from './theme';
import { showToast } from './XpToast';

function Tick({ on, label, color, soft, onPress, a11y }: { on: boolean; label: string; color: string; soft: string; onPress: () => void; a11y: string }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={a11y}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        minWidth: 58,
        height: 40,
        paddingHorizontal: 8,
        borderRadius: radius.sm,
        borderWidth: 1.5,
        borderStyle: on ? 'solid' : 'dashed',
        borderColor: on ? color : c.line,
        backgroundColor: on ? soft : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      {on && <Ionicons name="checkmark" size={15} color={color} />}
      <T style={{ fontWeight: '800', fontSize: 13 }} color={on ? color : c.muted}>
        {label}
      </T>
    </Pressable>
  );
}

const LEVELS: { c: Exclude<Confidence, 0>; label: string }[] = [
  { c: 1, label: 'Weak' },
  { c: 2, label: 'OK' },
  { c: 3, label: 'Strong' },
];

export function ConfidencePicker({ value, onChange, title }: { value: Confidence; onChange: (c: Confidence) => void; title: string }) {
  const c = usePalette();
  const tone = (lvl: Confidence) => (lvl === 1 ? [c.weak, c.weakSoft] : lvl === 2 ? [c.okLevel, c.okSoft] : [c.done, c.doneSoft]);
  return (
    <View style={{ flexDirection: 'row', borderRadius: radius.sm, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
      {LEVELS.map((l, i) => {
        const on = value === l.c;
        const [fg, bg] = tone(l.c);
        return (
          <Pressable
            key={l.c}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${title}: ${l.label}`}
            onPress={() => onChange(on ? 0 : l.c)}
            style={({ pressed }) => ({
              paddingVertical: 7,
              paddingHorizontal: 9,
              minWidth: 50,
              alignItems: 'center',
              backgroundColor: on ? bg : pressed ? c.surfaceAlt : 'transparent',
              borderLeftWidth: i ? 1 : 0,
              borderLeftColor: c.line,
            })}
          >
            <T style={{ fontSize: 12, fontWeight: on ? '800' : '600' }} color={on ? fg : c.muted}>
              {l.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function TopicLine({ item, indent }: { item: SubTopic; indent: boolean }) {
  const c = usePalette();
  const { progress, rateTopic } = useStore();
  const value = (progress.chapters[item.id]?.c ?? 0) as Confidence;
  const rate = (v: Confidence) => {
    const gained = rateTopic(item.id, v);
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    if (gained > 0) showToast(`Chapter finished! +${gained} XP`);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: indent ? 16 : 0, flexWrap: 'wrap' }}>
      <View style={{ flex: 1, minWidth: 150, flexDirection: 'row', gap: 6 }}>
        <T variant="small" style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {item.no}
        </T>
        <T variant="small" color={c.ink} style={{ flex: 1 }}>
          {item.title}
        </T>
      </View>
      <ConfidencePicker value={value} onChange={rate} title={item.title} />
    </View>
  );
}

function TopicList({ chapterId }: { chapterId: string }) {
  const c = usePalette();
  const topics = TOPICS[chapterId] ?? [];
  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 2 }}>
      <T variant="small" style={{ marginBottom: 4 }}>
        Rate each topic as you study it. Rate them all and the chapter's 1st tick turns on by itself. Tap a rating again to clear it.
      </T>
      {topics.map((t) =>
        t.subs.length ? (
          <View key={t.id} style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 6 }}>
            <T variant="small" style={{ fontWeight: '800' }} color={c.ink}>
              {t.no} {t.title}
            </T>
            {t.subs.map((s) => (
              <TopicLine key={s.id} item={s} indent />
            ))}
          </View>
        ) : (
          <View key={t.id} style={{ borderTopWidth: 1, borderTopColor: c.line }}>
            <TopicLine item={t} indent={false} />
          </View>
        ),
      )}
    </View>
  );
}

export function ChapterRow({ chapter, showSubject = false }: { chapter: Chapter; showSubject?: boolean }) {
  const c = usePalette();
  const { progress, toggle } = useStore();
  const [open, setOpen] = useState(false);
  const m = progress.chapters[chapter.id];
  const read = m?.f != null;
  const rev = m?.r != null;
  const ts = topicStats(progress, chapter.id);
  const finished = ts.total > 0 && ts.rated === ts.total;

  const press = (kind: 'f' | 'r') => {
    const turningOn = kind === 'f' ? !read : !rev;
    const gained = toggle(chapter.id, kind);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(turningOn ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (turningOn && gained > 0) {
      const base = kind === 'f' ? 10 : 15;
      showToast(gained > base ? `+${gained} XP · ahead of plan!` : `+${gained} XP`);
    }
  };

  const bits: string[] = [];
  if (m?.f) bits.push(`Read ${shortDate(m.f)}`);
  if (m?.r) bits.push(`Revised ${shortDate(m.r)}`);
  const subjectColor = c.subject[chapter.subject];

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 14 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: read && rev ? c.done : subjectColor + (c.dark ? '33' : '18'),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {read && rev ? (
            <Ionicons name="checkmark-done" size={18} color={c.dark ? c.bg : '#fff'} />
          ) : (
            <T style={{ fontWeight: '800' }} color={subjectColor}>
              {chapter.no}
            </T>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {showSubject && (
            <T variant="label" color={subjectColor} style={{ fontSize: 11 }}>
              {chapter.subject === 'phy' ? 'Physics' : chapter.subject === 'che' ? 'Chemistry' : chapter.subject === 'mat' ? 'Maths' : 'Biology'} · Ch {chapter.no}
            </T>
          )}
          <T style={{ fontWeight: '700' }}>{chapter.name}</T>
          {bits.length > 0 && <T variant="small">{bits.join(' · ')}</T>}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Tick on={read} label="1st" color={c.done} soft={c.doneSoft} onPress={() => press('f')} a11y={`First read: ${chapter.name}`} />
          <Tick on={rev} label="Rev" color={c.rev} soft={c.revSoft} onPress={() => press('r')} a11y={`Revision: ${chapter.name}`} />
        </View>
      </View>

      {ts.total > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${open ? 'Hide' : 'Show'} topics for ${chapter.name}`}
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => ({ paddingHorizontal: 14, paddingBottom: 12, gap: 5, opacity: pressed ? 0.7 : 1 })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Bar value={ts.rated / ts.total} color={finished ? c.done : c.accent} height={6} />
            </View>
            {finished ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="checkmark-circle" size={16} color={c.done} />
                <T variant="small" color={c.done} style={{ fontWeight: '800' }}>
                  Finished
                </T>
              </View>
            ) : (
              <T variant="small" style={{ fontVariant: ['tabular-nums'] }}>
                {Math.round((ts.rated / ts.total) * 100)}%
              </T>
            )}
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.muted} />
          </View>
          <T variant="small">
            {ts.rated}/{ts.total} topics rated
            {ts.weak ? ` · ${ts.weak} weak` : ''}
            {ts.strong ? ` · ${ts.strong} strong` : ''}
            {open ? '' : ' · tap to open'}
          </T>
        </Pressable>
      )}
      {open && <TopicList chapterId={chapter.id} />}
    </View>
  );
}
