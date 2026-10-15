import { NEET_QUESTIONS, type NeetQuestion, type NeetSubject } from '../data/neet';

/** NEET marking: +4 correct, −1 wrong, 0 left blank. */
export const MARKS = { correct: 4, wrong: -1 } as const;
/** The test can never be longer than one minute per question. */
export const MAX_MINS_PER_QUESTION = 1;

export const QUIZ_SUBJECTS: { key: NeetSubject; name: string }[] = [
  { key: 'phy', name: 'Physics' },
  { key: 'che', name: 'Chemistry' },
  { key: 'bio', name: 'Biology' },
];
export const QUIZ_YEARS = [2024, 2025, 2026] as const;
export const QUIZ_CLASSES = [11, 12] as const;
export const YEAR_NOTE: Record<number, string> = {
  2024: 'NEET 2024 (code T3)',
  2025: 'NEET 2025 (code 45)',
  2026: 'NEET 2026, 3 May paper (code 13, later cancelled)',
};

export const BY_ID: Map<string, NeetQuestion> = new Map(NEET_QUESTIONS.map((q) => [q.id, q]));

/** A test in progress. Kept on the device so it survives the app being closed. */
export type ActiveQuiz = {
  id: string;
  startedAt: number;
  limitSecs: number;
  ids: string[];
  answers: (number | null)[];
  marked: boolean[];
  current: number;
};

/** A finished test. `answers[i]` is the option (1-4) chosen for `ids[i]`, or null if left blank. */
export type QuizResult = {
  id: string;
  startedAt: number;
  finishedAt: number;
  limitSecs: number;
  ids: string[];
  answers: (number | null)[];
  /** True when the clock ran out rather than the student submitting. */
  timedOut: boolean;
};

export type QuizBook = { results: QuizResult[]; updatedAt: number };
/** Keep the most recent tests only, so the synced document stays small. */
export const KEEP_RESULTS = 60;

export function maxMinutes(count: number): number {
  return Math.max(1, count * MAX_MINS_PER_QUESTION);
}

/** Time the student asked for, never more than the 1-minute-per-question cap and never under a minute. */
export function clampMinutes(mins: number, count: number): number {
  return Math.min(maxMinutes(count), Math.max(1, Math.round(mins)));
}

export function questionPool(subjects: NeetSubject[], years: number[], classes: number[], exclude?: Set<string>): NeetQuestion[] {
  return NEET_QUESTIONS.filter((q) => subjects.includes(q.s) && years.includes(q.y) && classes.includes(q.c) && !exclude?.has(q.id));
}

/** Random pick, then ordered Physics → Chemistry → Biology like the real paper. */
export function pickQuestions(pool: NeetQuestion[], count: number, rand: () => number = Math.random): string[] {
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const order: Record<NeetSubject, number> = { phy: 0, che: 1, bio: 2 };
  return a
    .slice(0, Math.min(count, a.length))
    .map((q, i) => ({ q, i }))
    .sort((x, y) => order[x.q.s] - order[y.q.s] || x.i - y.i)
    .map((x) => x.q.id);
}

export function newQuiz(ids: string[], limitMins: number, now = Date.now()): ActiveQuiz {
  return {
    id: `q${now.toString(36)}`,
    startedAt: now,
    limitSecs: clampMinutes(limitMins, ids.length) * 60,
    ids,
    answers: ids.map(() => null),
    marked: ids.map(() => false),
    current: 0,
  };
}

/** Seconds left on the clock. Wall-clock based, so closing the app doesn't pause the test. */
export function secondsLeft(q: { startedAt: number; limitSecs: number }, now = Date.now()): number {
  return Math.max(0, Math.ceil((q.startedAt + q.limitSecs * 1000 - now) / 1000));
}

export function isCorrect(id: string, answer: number | null): boolean {
  return answer != null && !!BY_ID.get(id)?.a.includes(answer);
}

export type SubjectScore = { subject: NeetSubject; total: number; correct: number; wrong: number; skipped: number; score: number };
export type Score = Omit<SubjectScore, 'subject'> & { max: number; bySubject: SubjectScore[] };

export function scoreQuiz(ids: string[], answers: (number | null)[]): Score {
  const blank = (s: NeetSubject): SubjectScore => ({ subject: s, total: 0, correct: 0, wrong: 0, skipped: 0, score: 0 });
  const by = new Map<NeetSubject, SubjectScore>();
  ids.forEach((id, i) => {
    const q = BY_ID.get(id);
    if (!q) return;
    const row = by.get(q.s) ?? blank(q.s);
    by.set(q.s, row);
    row.total++;
    const a = answers[i] ?? null;
    if (a == null) row.skipped++;
    else if (q.a.includes(a)) {
      row.correct++;
      row.score += MARKS.correct;
    } else {
      row.wrong++;
      row.score += MARKS.wrong;
    }
  });
  const bySubject = QUIZ_SUBJECTS.map((s) => by.get(s.key)).filter((x): x is SubjectScore => !!x);
  const sum = (k: 'total' | 'correct' | 'wrong' | 'skipped' | 'score') => bySubject.reduce((a, r) => a + r[k], 0);
  const total = sum('total');
  return {
    total,
    correct: sum('correct'),
    wrong: sum('wrong'),
    skipped: sum('skipped'),
    score: sum('score'),
    max: total * MARKS.correct,
    bySubject,
  };
}

export function finishQuiz(q: ActiveQuiz, now = Date.now()): QuizResult {
  const deadline = q.startedAt + q.limitSecs * 1000;
  return {
    id: q.id,
    startedAt: q.startedAt,
    finishedAt: Math.min(now, deadline),
    limitSecs: q.limitSecs,
    ids: q.ids,
    answers: q.answers,
    timedOut: now >= deadline,
  };
}

/** Union of two devices' results, newest first, trimmed. */
export function mergeBooks(a: QuizBook | null, b: QuizBook | null): QuizBook {
  const byId = new Map<string, QuizResult>();
  for (const r of [...(a?.results ?? []), ...(b?.results ?? [])]) byId.set(r.id, r);
  const results = [...byId.values()].sort((x, y) => y.finishedAt - x.finishedAt).slice(0, KEEP_RESULTS);
  return { results, updatedAt: Math.max(a?.updatedAt ?? 0, b?.updatedAt ?? 0) };
}

/** Every question id the student has met in a finished test. */
export function seenIds(book: QuizBook): Set<string> {
  return new Set(book.results.flatMap((r) => r.ids));
}

/** "4:05" or "1:02:09". */
export function formatClock(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function quizSummary(book: QuizBook | null): { tests: number; bestPct: number | null; lastPct: number | null; lastAt: number | null } {
  const rs = book?.results ?? [];
  if (!rs.length) return { tests: 0, bestPct: null, lastPct: null, lastAt: null };
  const pct = (r: QuizResult) => {
    const s = scoreQuiz(r.ids, r.answers);
    return s.max ? Math.round((Math.max(0, s.score) / s.max) * 100) : 0;
  };
  return { tests: rs.length, bestPct: Math.max(...rs.map(pct)), lastPct: pct(rs[0]), lastAt: rs[0].finishedAt };
}
