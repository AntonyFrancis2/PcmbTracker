import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { Chapter } from '../data/chapters';
import { shortDate } from '../logic/dates';
import { useStore } from '../state/AppStore';
import { T } from './components';
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

export function ChapterRow({ chapter, showSubject = false }: { chapter: Chapter; showSubject?: boolean }) {
  const c = usePalette();
  const { progress, toggle } = useStore();
  const m = progress.chapters[chapter.id];
  const read = m?.f != null;
  const rev = m?.r != null;

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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
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
  );
}
