import { SUBJECTS, SUBJECT_BY_KEY, type Chapter, type SubjectKey } from '../data/chapters';
import type { Profile, Progress } from './types';
import { addDays, daysBetween, dayEnd, dayStart, toDay, weekKey } from './dates';

/* ------------------------------------------------------------------ stats */

export type SubjectStats = { total: number; read: number; revised: number };

export type Stats = {
  subjects: SubjectKey[];
  chapters: Chapter[];
  total: number;
  read: number;
  revised: number;
  bySubject: Record<SubjectKey, SubjectStats>;
  /** Tick times of chosen chapters, oldest first. */
  readTimes: number[];
  revTimes: number[];
};

export function computeStats(profile: Pick<Profile, 'subjects'>, progress: Progress): Stats {
  const subjects = SUBJECTS.map((s) => s.key).filter((k) => profile.subjects.includes(k));
  const bySubject = {} as Record<SubjectKey, SubjectStats>;
  const chapters: Chapter[] = [];
  const readTimes: number[] = [];
  const revTimes: number[] = [];
  for (const s of SUBJECTS) {
    const st: SubjectStats = { total: s.chapters.length, read: 0, revised: 0 };
    for (const c of s.chapters) {
      const m = progress.chapters[c.id];
      if (m?.f != null) st.read++;
      if (m?.r != null) st.revised++;
      if (subjects.includes(s.key)) {
        chapters.push(c);
        if (m?.f != null) readTimes.push(m.f);
        if (m?.r != null) revTimes.push(m.r);
      }
    }
    bySubject[s.key] = st;
  }
  readTimes.sort((a, b) => a - b);
  revTimes.sort((a, b) => a - b);
  return {
    subjects,
    chapters,
    total: chapters.length,
    read: readTimes.length,
    revised: revTimes.length,
    bySubject,
    readTimes,
    revTimes,
  };
}

/* ------------------------------------------------------------------- pace */

/** How many chapters the plan expects done by time `t`, on a straight line from plan start to the target date. */
export function expectedBy(total: number, planStart: string, target: string, t: number): number {
  const start = dayStart(planStart);
  const end = dayEnd(target);
  if (end <= start) return total;
  const frac = Math.min(1, Math.max(0, (t - start) / (end - start)));
  return total * frac;
}

export type Pace = {
  target: string;
  total: number;
  daysLeft: number;
  expected: number;
  actual: number;
  /** Positive = chapters ahead of plan, negative = behind. Rounded. */
  diff: number;
  /** Chapters per week needed from today to hit the target. */
  perWeek: number;
};

function paceFor(total: number, actual: number, planStart: string, target: string | null, now: number): Pace | null {
  if (!target || total === 0) return null;
  const expected = expectedBy(total, planStart, target, now);
  const daysLeft = Math.max(0, daysBetween(toDay(now), target));
  const remaining = Math.max(0, total - actual);
  return {
    target,
    total,
    daysLeft,
    expected,
    actual,
    diff: Math.round(actual - expected),
    perWeek: daysLeft > 0 ? Math.ceil((remaining / daysLeft) * 7) : remaining,
  };
}

export function computePace(stats: Stats, profile: Profile, now = Date.now()) {
  return {
    first: paceFor(stats.total, stats.read, profile.planStart, profile.firstReadTarget, now),
    revision: paceFor(stats.total, stats.revised, profile.planStart, profile.revisionTarget, now),
  };
}

/** Days in a row, ending today, on which first reads were at least one chapter ahead of plan. */
export function daysAheadInARow(stats: Stats, profile: Profile, now = Date.now(), cap = 30): number {
  if (!profile.firstReadTarget) return 0;
  let n = 0;
  let day = toDay(now);
  while (n < cap && daysBetween(profile.planStart, day) >= 0) {
    const end = Math.min(dayEnd(day), now);
    const done = countUpTo(stats.readTimes, end);
    if (done - expectedBy(stats.total, profile.planStart, profile.firstReadTarget, end) >= 1) n++;
    else break;
    day = addDays(day, -1);
  }
  return n;
}

function countUpTo(sorted: number[], t: number): number {
  let n = 0;
  for (const x of sorted) if (x <= t) n++;
  return n;
}

/* --------------------------------------------------------------- XP/levels */

export const XP_READ = 10;
export const XP_REVISE = 15;
export const AHEAD_BONUS = 1.5;

function xpFor(times: number[], base: number, total: number, planStart: string, target: string | null): number {
  let xp = 0;
  times.forEach((t, i) => {
    const ahead = target != null && i + 1 > expectedBy(total, planStart, target, t);
    xp += ahead ? Math.round(base * AHEAD_BONUS) : base;
  });
  return xp;
}

export function computeXp(stats: Stats, profile: Profile): number {
  return (
    xpFor(stats.readTimes, XP_READ, stats.total, profile.planStart, profile.firstReadTarget) +
    xpFor(stats.revTimes, XP_REVISE, stats.total, profile.planStart, profile.revisionTarget)
  );
}

/** XP needed to reach each level (index 0 = level 1). */
export const LEVEL_XP = [0, 40, 100, 180, 280, 400, 550, 720, 920, 1150];

export const LEVEL_NAMES = [
  'Beginner',
  'Explorer',
  'Learner',
  'Achiever',
  'Scholar',
  'Topper in Training',
  'Concept Crusher',
  'Revision Pro',
  'Board Buster',
  'Legend',
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVEL_XP.length && xp >= LEVEL_XP[i + 1]) i++;
  const floor = LEVEL_XP[i];
  const next = LEVEL_XP[i + 1] ?? null;
  return {
    level: i + 1,
    name: LEVEL_NAMES[i],
    xp,
    into: xp - floor,
    span: next == null ? 0 : next - floor,
    toNext: next == null ? 0 : next - xp,
    max: next == null,
  };
}

/* ----------------------------------------------------------------- streak */

/**
 * Study-day streak ending on `endDay`. Each week (Mon–Sun) forgives one missed day, so a single
 * day off never breaks it. If `endDay` itself has no tick yet, the streak still counts up to yesterday.
 */
export function streakEndingOn(days: Set<string>, endDay: string): number {
  let d = endDay;
  if (!days.has(d)) d = addDays(d, -1);
  const skipped = new Set<string>();
  let count = 0;
  let guard = 0;
  while (guard++ < 800) {
    if (days.has(d)) {
      count++;
    } else {
      const wk = weekKey(d);
      if (skipped.has(wk) || count === 0) break;
      // Only forgive a gap if the chain carries on before it.
      if (!days.has(addDays(d, -1))) break;
      skipped.add(wk);
    }
    d = addDays(d, -1);
  }
  return count;
}

export function currentStreak(days: string[], now = Date.now()): number {
  return streakEndingOn(new Set(days), toDay(now));
}

export function bestStreak(days: string[]): number {
  const set = new Set(days);
  let best = 0;
  for (const d of days) best = Math.max(best, streakEndingOn(set, d));
  return best;
}

/** True if the student came back after a break of 7 or more full days. */
export function hadComeback(days: string[]): boolean {
  const sorted = [...days].sort();
  for (let i = 1; i < sorted.length; i++) if (daysBetween(sorted[i - 1], sorted[i]) - 1 >= 7) return true;
  return false;
}

/* ----------------------------------------------------------------- badges */

export type BadgeTone = 'start' | 'subject' | 'revision' | 'big' | 'habit';

export type BadgeDef = {
  id: string;
  name: string;
  desc: string;
  icon: string; // Ionicons name
  tone: BadgeTone;
  /** [current, needed] */
  progress: (c: Ctx) => [number, number];
  /** Can be picked as a real-world reward milestone. */
  rewardable: boolean;
};

export type Ctx = { stats: Stats; profile: Profile; progress: Progress; now: number };

const EARLY_DAYS = 30;

export function badgeDefs(subjects: SubjectKey[]): BadgeDef[] {
  const list: BadgeDef[] = [
    {
      id: 'first-step',
      name: 'First Step',
      desc: 'Read your first chapter',
      icon: 'footsteps',
      tone: 'start',
      progress: ({ stats }) => [Math.min(stats.read, 1), 1],
      rewardable: false,
    },
    {
      id: 'subject-starter',
      name: 'Subject Starter',
      desc: 'Read one chapter in every subject',
      icon: 'rocket',
      tone: 'start',
      progress: ({ stats }) => [stats.subjects.filter((k) => stats.bySubject[k].read > 0).length, stats.subjects.length],
      rewardable: false,
    },
    {
      id: 'halfway',
      name: 'Halfway Hero',
      desc: 'Read half of your chapters',
      icon: 'flag',
      tone: 'big',
      progress: ({ stats }) => [Math.min(stats.read, Math.ceil(stats.total / 2)), Math.ceil(stats.total / 2)],
      rewardable: true,
    },
  ];
  for (const k of subjects) {
    const s = SUBJECT_BY_KEY[k];
    list.push({
      id: `read:${k}`,
      name: `${s.name} Complete`,
      desc: `Read every ${s.name} chapter`,
      icon: 'book',
      tone: 'subject',
      progress: ({ stats }) => [stats.bySubject[k].read, stats.bySubject[k].total],
      rewardable: true,
    });
  }
  for (const k of subjects) {
    const s = SUBJECT_BY_KEY[k];
    list.push({
      id: `rev:${k}`,
      name: `${s.name} Revision Master`,
      desc: `Revise every ${s.name} chapter`,
      icon: 'refresh-circle',
      tone: 'revision',
      progress: ({ stats }) => [stats.bySubject[k].revised, stats.bySubject[k].total],
      rewardable: true,
    });
  }
  list.push(
    {
      id: 'all-read',
      name: 'Syllabus Done',
      desc: 'Read every chapter you chose',
      icon: 'school',
      tone: 'big',
      progress: ({ stats }) => [stats.read, stats.total],
      rewardable: true,
    },
    {
      id: 'all-rev',
      name: 'Exam Ready',
      desc: 'Revise every chapter you chose',
      icon: 'trophy',
      tone: 'big',
      progress: ({ stats }) => [stats.revised, stats.total],
      rewardable: true,
    },
    {
      id: 'early-bird',
      name: 'Early Bird',
      desc: `Finish reading a subject ${EARLY_DAYS}+ days before your target`,
      icon: 'sunny',
      tone: 'habit',
      progress: (c) => [earlyBird(c) ? 1 : 0, 1],
      rewardable: false,
    },
    {
      id: 'ahead-7',
      name: 'Ahead of Plan',
      desc: 'Stay ahead of your plan 7 days in a row',
      icon: 'speedometer',
      tone: 'habit',
      progress: ({ stats, profile, now }) => [Math.min(7, daysAheadInARow(stats, profile, now, 7)), 7],
      rewardable: false,
    },
    {
      id: 'streak-7',
      name: 'Week Warrior',
      desc: 'Study 7 days in a row',
      icon: 'flame',
      tone: 'habit',
      progress: ({ progress }) => [Math.min(7, bestStreak(progress.days)), 7],
      rewardable: true,
    },
    {
      id: 'streak-30',
      name: 'Month Master',
      desc: 'Study 30 days in a row',
      icon: 'bonfire',
      tone: 'habit',
      progress: ({ progress }) => [Math.min(30, bestStreak(progress.days)), 30],
      rewardable: true,
    },
    {
      id: 'comeback',
      name: 'Comeback',
      desc: 'Get back to it after a week off',
      icon: 'return-up-forward',
      tone: 'habit',
      progress: ({ progress }) => [hadComeback(progress.days) ? 1 : 0, 1],
      rewardable: false,
    },
  );
  return list;
}

function earlyBird({ stats, profile, progress }: Ctx): boolean {
  if (!profile.firstReadTarget) return false;
  const cutoff = dayEnd(addDays(profile.firstReadTarget, -EARLY_DAYS));
  return stats.subjects.some((k) => {
    const chapters = SUBJECT_BY_KEY[k].chapters;
    const times = chapters.map((c) => progress.chapters[c.id]?.f ?? null);
    return times.every((t) => t != null) && Math.max(...(times as number[])) <= cutoff;
  });
}

export type BadgeState = BadgeDef & { earned: boolean; earnedAt: number | null; current: number; needed: number };

export function evaluateBadges(c: Ctx): BadgeState[] {
  return badgeDefs(c.stats.subjects).map((b) => {
    const [current, needed] = b.progress(c);
    const saved = c.progress.badges[b.id] ?? null;
    const met = needed > 0 && current >= needed;
    return { ...b, current, needed, earned: saved != null || met, earnedAt: saved };
  });
}

/** Badges whose condition is met now but aren't saved yet. */
export function newlyEarned(c: Ctx): BadgeDef[] {
  return evaluateBadges(c).filter((b) => b.earned && b.earnedAt == null);
}

/* ---------------------------------------------------------------- rewards */

export function rewardMilestones(subjects: SubjectKey[]): BadgeDef[] {
  return badgeDefs(subjects).filter((b) => b.rewardable);
}

export function milestoneById(subjects: SubjectKey[], id: string): BadgeDef | undefined {
  return badgeDefs(subjects).find((b) => b.id === id);
}

/* ------------------------------------------------------------------ themes */

export type ThemeDef = { id: string; name: string; unlockLevel: number; accent: string; accentDark: string };

export const THEMES: ThemeDef[] = [
  { id: 'indigo', name: 'Indigo', unlockLevel: 1, accent: '#4f46e5', accentDark: '#8b8cf8' },
  { id: 'ocean', name: 'Ocean', unlockLevel: 3, accent: '#0e7490', accentDark: '#38bdf8' },
  { id: 'sunset', name: 'Sunset', unlockLevel: 5, accent: '#e0532f', accentDark: '#fb8a5c' },
  { id: 'forest', name: 'Forest', unlockLevel: 7, accent: '#1f7a4a', accentDark: '#4ade80' },
  { id: 'royal', name: 'Royal Gold', unlockLevel: 9, accent: '#9a6b00', accentDark: '#f5c542' },
];

/* ---------------------------------------------------------------- up next */

/** A few chapters to do next: unread ones from the subject furthest behind, then revisions due. */
export function upNext(stats: Stats, progress: Progress, limit = 3): { chapter: Chapter; kind: 'f' | 'r' }[] {
  const out: { chapter: Chapter; kind: 'f' | 'r' }[] = [];
  const bySubjectLag = [...stats.subjects].sort((a, b) => {
    const fa = stats.bySubject[a].read / stats.bySubject[a].total;
    const fb = stats.bySubject[b].read / stats.bySubject[b].total;
    return fa - fb;
  });
  for (const k of bySubjectLag) {
    const c = SUBJECT_BY_KEY[k].chapters.find((ch) => progress.chapters[ch.id]?.f == null);
    if (c) out.push({ chapter: c, kind: 'f' });
    if (out.length >= limit) return out;
  }
  // Revise the chapters read longest ago first.
  const revisable = stats.chapters
    .filter((c) => progress.chapters[c.id]?.f != null && progress.chapters[c.id]?.r == null)
    .sort((a, b) => (progress.chapters[a.id]!.f as number) - (progress.chapters[b.id]!.f as number));
  for (const c of revisable) {
    if (out.length >= limit) break;
    out.push({ chapter: c, kind: 'r' });
  }
  return out;
}
