import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NeetSubject } from '../../data/neet';
import { NEET_QUESTIONS } from '../../data/neet';
import { shortDate } from '../../logic/dates';
import {
  formatClock, maxMinutes, pickQuestions, questionPool, QUIZ_SUBJECTS, QUIZ_YEARS, scoreQuiz, secondsLeft, seenIds, YEAR_NOTE,
} from '../../logic/quiz';
import { useStore } from '../../state/AppStore';
import { Button, Card, Chip, SectionTitle, T } from '../../ui/components';
import { NumberStepper } from '../../ui/QuizParts';
import { usePalette, radius } from '../../ui/theme';

const PRESETS = [10, 30, 45, 90, 180];

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  const c = usePalette();
  return (
    <View style={{ gap: 10 }}>
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
    </View>
  );
}

export default function QuizTab() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { quizBook, activeQuiz, startQuiz, discardQuiz, submitQuiz } = useStore();
  const [subjects, setSubjects] = useState<NeetSubject[]>(['phy', 'che', 'bio']);
  const [years, setYears] = useState<number[]>([...QUIZ_YEARS]);
  const [fresh, setFresh] = useState(false);
  const [count, setCount] = useState(30);
  /** null = full time (1 min per question). A number = the student chose less. */
  const [mins, setMins] = useState<number | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!activeQuiz) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeQuiz]);

  const left = activeQuiz ? secondsLeft(activeQuiz, now) : 0;
  // A test whose clock ran out while the app was closed is marked as it stands.
  const seeResult = () => {
    const id = submitQuiz();
    if (id) router.push({ pathname: '/quiz-result', params: { id } });
  };

  const seen = useMemo(() => seenIds(quizBook), [quizBook]);
  const pool = useMemo(() => questionPool(subjects, years, fresh ? seen : undefined), [subjects, years, fresh, seen]);
  const n = Math.min(count, pool.length);
  const cap = maxMinutes(n);
  const time = mins == null ? cap : Math.min(mins, cap);

  const toggle = <K,>(list: K[], k: K, set: (v: K[]) => void) => {
    const next = list.includes(k) ? list.filter((x) => x !== k) : [...list, k];
    if (next.length) set(next);
  };

  const start = () => {
    startQuiz(pickQuestions(pool, n), time);
    router.push('/quiz-run');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: 40, gap: 16, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 4 }}>
        <T variant="title">NEET practice</T>
        <T color={c.muted}>
          {NEET_QUESTIONS.length} real questions from NEET 2024, 2025 and 2026, timed like the exam. Marking: +4 correct, −1 wrong, 0 left blank.
        </T>
      </View>

      {activeQuiz ? (
        <Card style={{ gap: 12, borderColor: c.accent }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="timer" size={26} color={c.accent} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '800' }}>{left === 0 ? "Time's up" : 'Test in progress'}</T>
              <T variant="small">
                {activeQuiz.answers.filter((a) => a != null).length} of {activeQuiz.ids.length} answered · {formatClock(left)} left. The clock keeps running.
              </T>
            </View>
          </View>
          {left === 0 ? <Button label="See my result" onPress={seeResult} /> : <Button label="Resume test" onPress={() => router.push('/quiz-run')} />}
          {left === 0 ? null : confirmDiscard ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Keep it" kind="secondary" onPress={() => setConfirmDiscard(false)} style={{ flex: 1 }} />
              <Button
                label="Discard"
                kind="danger"
                onPress={() => {
                  discardQuiz();
                  setConfirmDiscard(false);
                }}
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Button label="Discard this test" kind="ghost" onPress={() => setConfirmDiscard(true)} />
          )}
        </Card>
      ) : (
        <Card style={{ gap: 20 }}>
          <Step n={1} title="Subjects">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {QUIZ_SUBJECTS.map((s) => (
                <Chip key={s.key} label={s.name} color={c.subject[s.key]} selected={subjects.includes(s.key)} onPress={() => toggle(subjects, s.key, setSubjects)} />
              ))}
            </View>
          </Step>

          <Step n={2} title="Papers" hint="NEET covers Class 11 and Class 12.">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {QUIZ_YEARS.map((y) => (
                <Chip key={y} label={`NEET ${y}`} selected={years.includes(y)} onPress={() => toggle(years, y as number, setYears)} />
              ))}
            </View>
            {years.includes(2026) ? <T variant="small">2026 is the 3 May paper that NTA later cancelled. The questions are real; answers are from NTA's provisional key.</T> : null}
            <Chip label={`Only questions I haven't tried (${questionPool(subjects, years, seen).length} left)`} selected={fresh} onPress={() => setFresh(!fresh)} />
          </Step>

          <Step n={3} title="How many questions?" hint={`${pool.length} available with these choices.`}>
            <NumberStepper
              label="questions"
              unit="questions"
              value={n}
              min={1}
              max={Math.max(1, pool.length)}
              step={(v, d) => (d > 0 ? (v < 5 ? v + 1 : Math.floor(v / 5) * 5 + 5) : v <= 5 ? v - 1 : Math.ceil(v / 5) * 5 - 5)}
              onChange={setCount}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PRESETS.filter((p) => p <= pool.length).map((p) => (
                <Chip key={p} label={String(p)} selected={n === p} onPress={() => setCount(p)} />
              ))}
            </View>
          </Step>

          <Step n={4} title="Time for the whole test" hint={`Up to ${cap} min (1 minute per question). You can make it shorter, not longer.`}>
            <NumberStepper
              label="minutes"
              unit={time === cap ? 'minutes (maximum)' : 'minutes'}
              value={time}
              min={1}
              max={cap}
              step={(v, d) => (v + d * (v > 10 || (v === 10 && d > 0) ? 5 : 1))}
              onChange={(v) => setMins(v >= cap ? null : v)}
            />
            {time < cap ? (
              <T variant="small" style={{ textAlign: 'center' }}>
                About {Math.round((time * 60) / Math.max(1, n))} seconds per question
              </T>
            ) : null}
          </Step>

          <Button label={`Start · ${n} questions · ${time} min`} onPress={start} disabled={n === 0} icon={<Ionicons name="play" size={18} color={c.onAccent} />} />
        </Card>
      )}

      <SectionTitle>Past tests</SectionTitle>
      {quizBook.results.length === 0 ? (
        <T color={c.muted}>Your scores will show here after your first test.</T>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {quizBook.results.map((r, i) => {
            const s = scoreQuiz(r.ids, r.answers);
            const pct = s.max ? Math.round((Math.max(0, s.score) / s.max) * 100) : 0;
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/quiz-result', params: { id: r.id } })}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: c.line,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ fontWeight: '800' }} color={c.accent}>
                    {pct}%
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '700' }}>
                    {s.score} / {s.max}
                  </T>
                  <T variant="small">
                    {shortDate(r.finishedAt)} · {s.total} questions · {s.correct} right, {s.wrong} wrong
                  </T>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.faint} />
              </Pressable>
            );
          })}
        </Card>
      )}
      <T variant="small" style={{ textAlign: 'center' }}>
        Questions: {Object.values(YEAR_NOTE).join(' · ')}. Images via the Reja1/jee-neet-benchmark dataset.
      </T>
    </ScrollView>
  );
}
