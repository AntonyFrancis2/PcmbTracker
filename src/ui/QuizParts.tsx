import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NeetQuestion } from '../data/neet';
import { NEET_IMAGES } from '../data/neetImages';
import { QUIZ_SUBJECTS } from '../logic/quiz';
import { T } from './components';
import { usePalette, radius } from './theme';

export const subjectName = (s: NeetQuestion['s']) => QUIZ_SUBJECTS.find((x) => x.key === s)?.name ?? s;

/** The original printed question. Always on a white "paper" panel so it reads the same in dark mode. */
export function QuestionImage({ q }: { q: NeetQuestion }) {
  const c = usePalette();
  // Explicit pixel size: percentage width + aspectRatio is unreliable for bundled images on web.
  const [w, setW] = useState(0);
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.line,
        padding: 8,
        width: '100%',
        maxWidth: Math.max(q.w + 18, 360),
        alignSelf: 'center',
      }}
    >
      <View onLayout={(e) => setW(Math.floor(e.nativeEvent.layout.width))} style={{ width: '100%' }}>
        {w > 0 ? (
          <Image
            source={NEET_IMAGES[q.id]}
            accessibilityLabel={`NEET ${q.y} question ${q.n}`}
            resizeMode="contain"
            style={{ width: w, height: Math.round((w * q.h) / q.w) }}
          />
        ) : (
          <View style={{ aspectRatio: q.w / q.h }} />
        )}
      </View>
    </View>
  );
}

/** − value + control with bounds. */
export function NumberStepper({
  value,
  min,
  max,
  step,
  onChange,
  label,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  step: (v: number, dir: 1 | -1) => number;
  onChange: (v: number) => void;
  label: string;
  unit: string;
}) {
  const c = usePalette();
  const btn = (dir: 1 | -1) => {
    const disabled = dir < 0 ? value <= min : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${dir < 0 ? 'Less' : 'More'} ${label}`}
        disabled={disabled}
        onPress={() => onChange(Math.min(max, Math.max(min, step(value, dir))))}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? c.surfaceAlt : c.surface,
          opacity: disabled ? 0.35 : 1,
        })}
      >
        <Ionicons name={dir < 0 ? 'remove' : 'add'} size={22} color={c.ink} />
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn(-1)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <T variant="num">{value}</T>
        <T variant="small">{unit}</T>
      </View>
      {btn(1)}
    </View>
  );
}

/** Small coloured subject tag. */
export function SubjectTag({ q }: { q: NeetQuestion }) {
  const c = usePalette();
  const color = c.subject[q.s];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <T variant="small" style={{ fontWeight: '700' }} color={color}>
        {subjectName(q.s)}
      </T>
      <T variant="small" color={c.faint}>
        · NEET {q.y} · Q{q.n}
      </T>
    </View>
  );
}
