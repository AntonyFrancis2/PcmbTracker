import type { ChapterMark, Profile, Progress, Reward } from './types';
import { toDay } from './dates';

const MAX_DAYS = 500;

/** Flip one tick ("f" = first read, "r" = revision) and log today as a study day when ticking on. */
export function toggleMark(p: Progress, chapterId: string, kind: 'f' | 'r', now = Date.now()): Progress {
  const prev: ChapterMark = p.chapters[chapterId] ?? { f: null, r: null, u: 0 };
  const turningOn = prev[kind] == null;
  const next: ChapterMark = { ...prev, [kind]: turningOn ? now : null, u: now };
  const today = toDay(now);
  const days = turningOn && !p.days.includes(today) ? [...p.days, today].sort().slice(-MAX_DAYS) : p.days;
  return { ...p, chapters: { ...p.chapters, [chapterId]: next }, days, updatedAt: now };
}

/** Merge two copies of progress (this phone and the cloud). Newest change per chapter wins; badges and study days are unioned. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const chapters: Record<string, ChapterMark> = { ...a.chapters };
  for (const [id, mark] of Object.entries(b.chapters)) {
    const mine = chapters[id];
    if (!mine || mark.u > mine.u) chapters[id] = mark;
  }
  const badges: Record<string, number> = { ...a.badges };
  for (const [id, t] of Object.entries(b.badges)) badges[id] = badges[id] ? Math.min(badges[id], t) : t;
  const days = Array.from(new Set([...a.days, ...b.days])).sort().slice(-MAX_DAYS);
  return { chapters, badges, days, updatedAt: Math.max(a.updatedAt, b.updatedAt) };
}

/** Merge two copies of the profile. The newer edit wins; a reward unlocked on either copy stays unlocked. */
export function mergeProfile(a: Profile, b: Profile): Profile {
  const [newer, older] = b.updatedAt > a.updatedAt ? [b, a] : [a, b];
  const olderById = new Map(older.rewards.map((r) => [r.id, r]));
  const rewards: Reward[] = newer.rewards.map((r) => {
    const o = olderById.get(r.id);
    if (!o || o.unlockedAt == null) return r;
    return { ...r, unlockedAt: r.unlockedAt == null ? o.unlockedAt : Math.min(r.unlockedAt, o.unlockedAt) };
  });
  const merged: Profile = { ...newer, rewards };
  // Name, email and join date are never lost by merging with a copy that lacks them
  // (older app versions and the admin backfill job write them separately).
  if (!merged.name && older.name) merged.name = older.name;
  if (!merged.email && older.email) merged.email = older.email;
  const joined = [a.createdAt, b.createdAt].filter((x): x is number => typeof x === 'number');
  if (joined.length) merged.createdAt = Math.min(...joined);
  return merged;
}

/** Stable JSON used to decide whether a copy actually changed. */
export function sameJSON(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const keys = Object.keys(v as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
}
