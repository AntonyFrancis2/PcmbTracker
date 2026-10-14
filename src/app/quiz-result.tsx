import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shortDate } from '../logic/dates';
import { BY_ID, formatClock, scoreQuiz } from '../logic/quiz';
import { useStore } from '../state/AppStore';
import { Bar, Button, Card, Chip, T } from '../ui/components';
import { QuestionImage, SubjectTag, subjectName } from '../ui/QuizParts';
import { usePalette, radius } from '../ui/theme';

type Filter = 'all' | 'wrong' | 'blank' | 'right';

export default function QuizResult() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quizBook } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const r = quizBook.results.find((x) => x.id === id);
  const s = useMemo(() => (r ? scoreQuiz(r.ids, r.answers) : null), [r]);

  const items = useMemo(() => {
    if (!r) return [];
    return r.ids
      .map((qid, i) => {
        const q = BY_ID.get(qid)!;
        const a = r.answers[i] ?? null;
        const state: Filter = a == null ? 'blank' : q.a.includes(a) ? 'right' : 'wrong';
        return { q, a, i, state };
      })
      .filter((x) => filter === 'all' || x.state === filter);
  }, [r, filter]);

  if (!r || !s) return <Redirect href="/quiz" />;

  const pct = s.max ? Math.max(0, s.score) / s.max : 0;
  const used = Math.round((r.finishedAt - r.startedAt) / 1000);
  const attempted = s.correct + s.wrong;

  const header = (
    <View style={{ gap: 14, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/quiz'))} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={c.ink} />
        </Pressable>
        <T variant="title">Your result</T>
      </View>

      <Card style={{ gap: 12, backgroundColor: c.accent, borderColor: c.accent }}>
        <T variant="label" color={c.onAccent}>
          {shortDate(r.finishedAt)} · {s.total} {s.total === 1 ? 'question' : 'questions'}{r.timedOut ? " · time's up" : ''}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T variant="display" color={c.onAccent}>
            {s.score}
          </T>
          <T variant="h2" color={c.onAccent}>
            / {s.max}
          </T>
        </View>
        <Bar value={pct} color={c.onAccent} track={c.onAccent + '33'} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            [String(s.correct), 'right'],
            [String(s.wrong), 'wrong'],
            [String(s.skipped), 'blank'],
            [attempted ? `${Math.round((s.correct / attempted) * 100)}%` : '–', 'accuracy'],
            [formatClock(used), 'time'],
          ].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <T style={{ fontWeight: '800', fontSize: 18 }} color={c.onAccent}>
                {v}
              </T>
              <T variant="small" color={c.onAccent}>
                {l}
              </T>
            </View>
          ))}
        </View>
      </Card>

      {s.bySubject.length > 1 ? (
        <Card style={{ gap: 10 }}>
          {s.bySubject.map((b) => (
            <View key={b.subject} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T style={{ fontWeight: '700' }} color={c.subject[b.subject]}>
                  {subjectName(b.subject)}
                </T>
                <T variant="small">
                  {b.score} / {b.total * 4} · {b.correct} right, {b.wrong} wrong, {b.skipped} blank
                </T>
              </View>
              <Bar value={b.total ? Math.max(0, b.score) / (b.total * 4) : 0} color={c.subject[b.subject]} />
            </View>
          ))}
        </Card>
      ) : null}

      <T variant="small">NEET marking: +4 for a right answer, −1 for a wrong one, 0 if left blank. Wrong answers cost marks, so skip when you're really unsure.</T>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label={`All ${s.total}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Wrong ${s.wrong}`} color={c.danger} selected={filter === 'wrong'} onPress={() => setFilter('wrong')} />
        <Chip label={`Blank ${s.skipped}`} color={c.muted} selected={filter === 'blank'} onPress={() => setFilter('blank')} />
        <Chip label={`Right ${s.correct}`} color={c.done} selected={filter === 'right'} onPress={() => setFilter('right')} />
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32, maxWidth: 720, width: '100%', alignSelf: 'center' }}
      data={items}
      keyExtractor={(x) => x.q.id}
      initialNumToRender={4}
      windowSize={5}
      ListHeaderComponent={header}
      ListEmptyComponent={<T color={c.muted}>Nothing here.</T>}
      ListFooterComponent={<Button label="Take another test" onPress={() => router.replace('/quiz')} style={{ marginTop: 8 }} />}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      renderItem={({ item: { q, a, i, state } }) => {
        const tone = state === 'right' ? c.done : state === 'wrong' ? c.danger : c.muted;
        return (
          <Card style={{ gap: 10, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T style={{ fontWeight: '800' }}>Q {i + 1}</T>
              <SubjectTag q={q} />
            </View>
            <QuestionImage q={q} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.sm, backgroundColor: tone + '1f' }}>
              <Ionicons name={state === 'right' ? 'checkmark-circle' : state === 'wrong' ? 'close-circle' : 'remove-circle'} size={20} color={tone} />
              <T style={{ flex: 1, fontWeight: '700' }} color={state === 'blank' ? c.ink : tone}>
                {a == null ? 'Left blank' : `You chose (${a})`}
                {state !== 'right' ? ` · Correct: ${q.a.map((x) => `(${x})`).join(' or ')}` : ''}
              </T>
              <T variant="small" style={{ fontWeight: '800' }} color={tone}>
                {state === 'right' ? '+4' : state === 'wrong' ? '−1' : '0'}
              </T>
            </View>
            {q.a.length > 1 ? <T variant="small">More than one option is accepted for this question.</T> : null}
          </Card>
        );
      }}
    />
  );
}
