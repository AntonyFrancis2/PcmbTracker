import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BY_ID, formatClock, secondsLeft } from '../logic/quiz';
import { useStore } from '../state/AppStore';
import { Button, Card, T } from '../ui/components';
import { QuestionImage, SubjectTag } from '../ui/QuizParts';
import { usePalette, radius } from '../ui/theme';

export default function QuizRun() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { activeQuiz: q, updateQuiz, submitQuiz } = useStore();
  const [now, setNow] = useState(Date.now());
  const [palette, setPalette] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const submitted = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const left = q ? secondsLeft(q, now) : 0;
  const finish = () => {
    if (submitted.current) return;
    submitted.current = true;
    const id = submitQuiz();
    if (id) router.replace({ pathname: '/quiz-result', params: { id } });
    else router.back();
  };

  useEffect(() => {
    if (q && left === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, left]);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [q?.current]);

  if (!q) return submitted.current ? null : <Redirect href="/quiz" />;

  const i = q.current;
  const question = BY_ID.get(q.ids[i])!;
  const chosen = q.answers[i];
  const total = q.ids.length;
  const answered = q.answers.filter((a) => a != null).length;
  const marked = q.marked.filter(Boolean).length;
  const low = left <= Math.min(300, q.limitSecs * 0.1);

  const go = (to: number) => updateQuiz((x) => ({ ...x, current: Math.max(0, Math.min(total - 1, to)) }));
  const choose = (opt: number | null) =>
    updateQuiz((x) => {
      const answers = [...x.answers];
      answers[x.current] = opt;
      return { ...x, answers };
    });
  const toggleMark = () =>
    updateQuiz((x) => {
      const m = [...x.marked];
      m[x.current] = !m[x.current];
      return { ...x, marked: m };
    });

  const cellColor = (k: number) => {
    if (q.marked[k]) return { bg: c.rev, fg: '#fff' };
    if (q.answers[k] != null) return { bg: c.done, fg: c.dark ? '#0d1019' : '#fff' };
    return { bg: c.surfaceAlt, fg: c.ink };
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Top bar */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 12,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
          backgroundColor: c.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Leave test. The timer keeps running" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={c.ink} />
        </Pressable>
        <T style={{ fontWeight: '800', flex: 1 }}>
          Q {i + 1} / {total}
        </T>
        <View
          accessibilityLabel={`${formatClock(left)} left`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: low ? c.danger : c.accentSoft,
          }}
        >
          <Ionicons name="timer-outline" size={16} color={low ? '#fff' : c.accent} />
          <T style={{ fontWeight: '800', fontVariant: ['tabular-nums'] }} color={low ? '#fff' : c.accent}>
            {formatClock(left)}
          </T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="All questions" onPress={() => setPalette(true)} hitSlop={10}>
          <Ionicons name="grid-outline" size={24} color={c.ink} />
        </Pressable>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 14, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SubjectTag q={question} />
          <Pressable accessibilityRole="button" accessibilityState={{ selected: q.marked[i] }} onPress={toggleMark} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={q.marked[i] ? 'bookmark' : 'bookmark-outline'} size={18} color={q.marked[i] ? c.rev : c.muted} />
            <T variant="small" style={{ fontWeight: '700' }} color={q.marked[i] ? c.rev : c.muted}>
              {q.marked[i] ? 'Marked' : 'Mark for review'}
            </T>
          </Pressable>
        </View>

        <QuestionImage q={question} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[1, 2, 3, 4].map((opt) => {
            const on = chosen === opt;
            return (
              <Pressable
                key={opt}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Option ${opt}`}
                onPress={() => choose(on ? null : opt)}
                style={({ pressed }) => ({
                  flexBasis: '47%',
                  flexGrow: 1,
                  paddingVertical: 16,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: on ? c.accent : c.line,
                  backgroundColor: on ? c.accent : pressed ? c.surfaceAlt : c.surface,
                  alignItems: 'center',
                })}
              >
                <T style={{ fontWeight: '800', fontSize: 18 }} color={on ? c.onAccent : c.ink}>
                  ({opt})
                </T>
              </Pressable>
            );
          })}
        </View>
        {chosen != null ? (
          <Pressable accessibilityRole="button" onPress={() => choose(null)} style={{ alignSelf: 'center' }} hitSlop={8}>
            <T variant="small" style={{ fontWeight: '700' }} color={c.muted}>
              Clear answer
            </T>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Bottom bar */}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          padding: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: c.line,
          backgroundColor: c.surface,
        }}
      >
        <Button label="Back" kind="secondary" onPress={() => go(i - 1)} disabled={i === 0} style={{ flex: 1 }} />
        {i < total - 1 ? (
          <Button label={chosen != null ? 'Save & next' : 'Next'} onPress={() => go(i + 1)} style={{ flex: 2 }} />
        ) : (
          <Button label="Submit test" onPress={() => setConfirm(true)} style={{ flex: 2 }} />
        )}
      </View>

      {/* Question palette */}
      <Modal visible={palette} transparent animationType="slide" onRequestClose={() => setPalette(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0008' }} onPress={() => setPalette(false)} />
        <View style={{ backgroundColor: c.surface, padding: 16, paddingBottom: insets.bottom + 16, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: 12, maxHeight: '75%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T variant="h2">All questions</T>
            <T variant="small">
              {answered} answered · {marked} marked · {total - answered} blank
            </T>
          </View>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {q.ids.map((_, k) => {
              const col = cellColor(k);
              return (
                <Pressable
                  key={k}
                  accessibilityRole="button"
                  accessibilityLabel={`Question ${k + 1}`}
                  onPress={() => {
                    go(k);
                    setPalette(false);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: col.bg,
                    borderWidth: k === i ? 2.5 : 0,
                    borderColor: c.accent,
                  }}
                >
                  <T style={{ fontWeight: '800' }} color={col.fg}>
                    {k + 1}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
            {[
              [c.done, 'Answered'],
              [c.rev, 'Marked for review'],
              [c.surfaceAlt, 'Not answered'],
            ].map(([col, label]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: col, borderWidth: 1, borderColor: c.line }} />
                <T variant="small">{label}</T>
              </View>
            ))}
          </View>
          <Button
            label="Submit test"
            onPress={() => {
              setPalette(false);
              setConfirm(true);
            }}
          />
        </View>
      </Modal>

      {/* Submit confirmation */}
      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Card style={{ gap: 12, width: '100%', maxWidth: 400 }}>
            <T variant="h2">Submit the test?</T>
            <T color={c.muted}>
              {answered} answered, {total - answered} left blank{marked ? `, ${marked} marked for review` : ''}. {formatClock(left)} still on the clock. You can't change answers after submitting.
            </T>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Keep going" kind="secondary" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <Button
                label="Submit"
                onPress={() => {
                  setConfirm(false);
                  finish();
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}
