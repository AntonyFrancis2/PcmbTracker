import React, { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, dayStart, shortDate, toDay } from '../logic/dates';
import { Button, T } from './components';
import { usePalette, radius } from './theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A tappable date that opens a month calendar. Works the same on Android and web. */
export function DateField({
  label,
  value,
  onChange,
  min,
  placeholder = 'Pick a date',
}: {
  label: string;
  value: string | null;
  onChange: (day: string | null) => void;
  min?: string;
  placeholder?: string;
}) {
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const start = value ?? addDays(min ?? toDay(Date.now()), 60);
  const [cursor, setCursor] = useState(() => {
    const d = new Date(dayStart(start));
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(toDay(new Date(cursor.y, cursor.m, d)));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const shift = (n: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? shortDate(value) : 'not set'}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.surface,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View style={{ gap: 2 }}>
          <T variant="small">{label}</T>
          <T style={{ fontWeight: '700' }} color={value ? c.ink : c.faint}>
            {value ? shortDate(value) : placeholder}
          </T>
        </View>
        <Ionicons name="calendar-outline" size={22} color={c.accent} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0007', justifyContent: 'center', padding: 20 }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 12, maxWidth: 380, width: '100%', alignSelf: 'center' }}>
            <T variant="h2">{label}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable accessibilityLabel="Previous month" onPress={() => shift(-1)} hitSlop={12}>
                <Ionicons name="chevron-back" size={24} color={c.ink} />
              </Pressable>
              <T style={{ fontWeight: '700' }}>
                {MONTHS[cursor.m]} {cursor.y}
              </T>
              <Pressable accessibilityLabel="Next month" onPress={() => shift(1)} hitSlop={12}>
                <Ionicons name="chevron-forward" size={24} color={c.ink} />
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
                const disabled = !d || (min != null && d < min);
                const selected = d != null && d === value;
                return (
                  <Pressable
                    key={i}
                    disabled={disabled}
                    onPress={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                    style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}
                  >
                    {d && (
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 999,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: selected ? c.accent : 'transparent',
                        }}
                      >
                        <T style={{ fontWeight: selected ? '800' : '500' }} color={selected ? c.onAccent : disabled ? c.faint + '88' : c.ink}>
                          {Number(d.slice(8))}
                        </T>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {value && (
                <Button
                  label="Clear"
                  kind="ghost"
                  onPress={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  style={{ flex: 1 }}
                />
              )}
              <Button label="Close" kind="secondary" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
