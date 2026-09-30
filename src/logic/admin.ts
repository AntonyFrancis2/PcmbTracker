import { SUBJECTS, SUBJECT_BY_KEY, type Chapter, type SubjectKey } from '../data/chapters';
import type { Profile, Progress } from './types';
import { computePace, computeStats, computeXp, currentStreak, evaluateBadges, levelFor } from './gamify';
import { toDay } from './dates';
import { topicStats, type TopicStats } from './progress';
import { ratedItems } from '../data/topics';

export type StudentRow = {
  uid: string;
  name: string;
  email: string;
  onboarded: boolean;
  stream: string;
  subjects: SubjectKey[];
  joinedAt: number | null;
  lastActiveAt: number | null;
  read: number;
  revised: number;
  total: number;
  streak: number;
  xp: number;
  level: number;
  levelName: string;
  badges: string[];
  /** Chapters ahead (+) or behind (−) the student's own first-read plan; null if no plan. */
  pace: number | null;
  firstReadTarget: string | null;
  revisionTarget: string | null;
  profile: Profile;
  progress: Progress;
};

export function streamLabel(subjects: SubjectKey[]): string {
  const has = (k: SubjectKey) => subjects.includes(k);
  if (subjects.length === 0) return '—';
  const letters = SUBJECTS.filter((s) => has(s.key)).map((s) => (s.key === 'mat' ? 'M' : s.name[0]));
  return letters.join('');
}

export function studentRow(uid: string, profile: Profile, progress: Progress, now = Date.now()): StudentRow {
  const stats = computeStats(profile, progress);
  const xp = computeXp(stats, profile);
  const lvl = levelFor(xp);
  const pace = computePace(stats, profile, now).first;
  const badges = profile.onboarded
    ? evaluateBadges({ stats, profile, progress, now })
        .filter((b) => b.earned)
        .map((b) => b.name)
    : [];
  const last = Math.max(progress.updatedAt || 0, profile.updatedAt || 0);
  return {
    uid,
    name: profile.name || '(name not synced yet)',
    email: profile.email || '',
    onboarded: profile.onboarded,
    stream: streamLabel(profile.subjects),
    subjects: profile.subjects,
    joinedAt: profile.createdAt ?? null,
    lastActiveAt: last || null,
    read: stats.read,
    revised: stats.revised,
    total: stats.total,
    streak: currentStreak(progress.days, now),
    xp,
    level: lvl.level,
    levelName: lvl.name,
    badges,
    pace: pace ? pace.diff : null,
    firstReadTarget: profile.firstReadTarget,
    revisionTarget: profile.revisionTarget,
    profile,
    progress,
  };
}

export type ChapterLine = { chapter: Chapter; readAt: number | null; revisedAt: number | null; topics: TopicStats; weakTopics: string[] };

/** Every chapter of the student's chosen subjects with tick dates, grouped by subject. */
export function chapterDetail(row: StudentRow): { subject: SubjectKey; name: string; lines: ChapterLine[] }[] {
  const keys = row.subjects.length ? row.subjects : SUBJECTS.map((s) => s.key);
  return keys.map((k) => ({
    subject: k,
    name: SUBJECT_BY_KEY[k].name,
    lines: SUBJECT_BY_KEY[k].chapters.map((c) => ({
      chapter: c,
      readAt: row.progress.chapters[c.id]?.f ?? null,
      revisedAt: row.progress.chapters[c.id]?.r ?? null,
      topics: topicStats(row.progress, c.id),
      weakTopics: ratedItems(c.id)
        .filter((t) => row.progress.chapters[t.id]?.c === 1)
        .map((t) => `${t.no} ${t.title}`),
    })),
  }));
}

export function daysSince(t: number | null, now = Date.now()): number | null {
  if (!t) return null;
  return Math.floor((now - t) / 86_400_000);
}

export type Summary = { students: number; activeWeek: number; avgReadPct: number; avgRevisedPct: number; notStarted: number };

export function summarize(rows: StudentRow[], now = Date.now()): Summary {
  const n = rows.length;
  const pct = (f: (r: StudentRow) => number) =>
    n ? Math.round((rows.reduce((a, r) => a + (r.total ? f(r) / r.total : 0), 0) / n) * 100) : 0;
  return {
    students: n,
    activeWeek: rows.filter((r) => (daysSince(r.lastActiveAt, now) ?? 99) < 7 && r.read + r.revised > 0).length,
    avgReadPct: pct((r) => r.read),
    avgRevisedPct: pct((r) => r.revised),
    notStarted: rows.filter((r) => r.read === 0).length,
  };
}

const esc = (v: string | number | null) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per student per chapter: easy to pivot in Excel or Google Sheets. */
export function toCsv(rows: StudentRow[]): string {
  const head = ['Student', 'Email', 'Stream', 'Joined', 'Last active', 'Subject', 'Ch. No.', 'Chapter', 'First read', 'Revised', 'Topics rated', 'Topics total', 'Weak', 'Strong', 'Weak topics'];
  const out = [head.join(',')];
  const d = (t: number | null) => (t ? toDay(t) : '');
  for (const r of rows) {
    for (const g of chapterDetail(r)) {
      for (const l of g.lines) {
        out.push(
          [r.name, r.email, r.stream, d(r.joinedAt), d(r.lastActiveAt), g.name, l.chapter.no, l.chapter.name, d(l.readAt), d(l.revisedAt),
           l.topics.rated, l.topics.total, l.topics.weak, l.topics.strong, l.weakTopics.join('; ')]
            .map(esc)
            .join(','),
        );
      }
    }
  }
  return out.join('\n');
}
