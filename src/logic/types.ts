import type { SubjectKey } from '../data/chapters';

/** One chapter's two ticks. Times are epoch milliseconds; `u` is when this record last changed (used to merge devices). */
export type ChapterMark = { f: number | null; r: number | null; u: number };

export type Progress = {
  chapters: Record<string, ChapterMark>;
  /** badgeId -> epoch ms when first earned. Badges stay earned even if a tick is undone. */
  badges: Record<string, number>;
  /** Local dates (YYYY-MM-DD) on which the student ticked something. Drives the streak. */
  days: string[];
  updatedAt: number;
};

export type Reward = {
  id: string;
  title: string;
  /** A milestone id from MILESTONES, e.g. "rev:phy" or "halfway". */
  milestone: string;
  createdAt: number;
  unlockedAt: number | null;
};

export type Profile = {
  onboarded: boolean;
  subjects: SubjectKey[];
  /** Local date (YYYY-MM-DD) the plan started; the pace line runs from here. */
  planStart: string;
  firstReadTarget: string | null;
  revisionTarget: string | null;
  rewards: Reward[];
  theme: string;
  updatedAt: number;
  /** Google account name and email, so the app owner's admin page can list students. */
  name?: string;
  email?: string;
  /** When the student first signed up (epoch ms). */
  createdAt?: number;
};

export const emptyProgress = (): Progress => ({ chapters: {}, badges: {}, days: [], updatedAt: 0 });
