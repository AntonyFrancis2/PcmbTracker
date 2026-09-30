import { SUBJECTS, type Chapter, type SubjectKey } from '../data/chapters';
import { TOPICS, type SubTopic } from '../data/topics';
import type { Progress } from './types';
import { addDays, daysBetween, dayStart, toDay } from './dates';

/** The student's answers to the plan form. Days of week: 0 = Monday … 6 = Sunday. */
export type PlanSettings = {
  start: string; // YYYY-MM-DD
  readBy: string;
  reviseBy: string;
  studyDays: number[];
  weekdayMins: number;
  weekendMins: number;
  startTime: string; // "18:00"
  sessionMins: 30 | 45 | 60;
  breakMins: number;
  mix: 'rotate' | 'daily';
  daysOff: string[];
  focus: SubjectKey | null;
  updatedAt: number;
};

export type PlanTask = {
  topic: SubTopic;
  chapter: Chapter;
  kind: 'read' | 'revise';
  /** Estimated minutes for the whole topic. */
  mins: number;
};

export type PlanSlot = {
  start: string; // "18:00"
  end: string;
  task: PlanTask;
  /** "Part 1 of 2" when a topic needs more than one session. */
  part: number;
  parts: number;
};

export type Plan = {
  days: Record<string, PlanSlot[]>;
  /** Study minutes available before the first-read deadline, and needed for what's left. */
  readNeeded: number;
  readAvailable: number;
  reviseNeeded: number;
  reviseAvailable: number;
  /** First-read topics that don't fit before the read-by date (they spill into revision time). */
  readOverflow: number;
  /** Topics left over after the revise-by date. */
  unscheduled: number;
  /** A suggested read-by date that would fit, when the current one doesn't. */
  suggestedReadBy: string | null;
};

/** Starting estimates; numericals-heavy subjects take longer per sub-topic. */
export const MINS_PER_TOPIC: Record<SubjectKey, number> = { phy: 45, mat: 45, che: 30, bio: 30 };
/** Revising a topic takes roughly half as long as first learning it. */
export const REVISE_FACTOR = 0.5;

export const defaultPlanSettings = (today: string, readBy: string | null, reviseBy: string | null): PlanSettings => ({
  start: today,
  readBy: readBy ?? addDays(today, 90),
  reviseBy: reviseBy ?? addDays(readBy ?? addDays(today, 90), 45),
  studyDays: [0, 1, 2, 3, 4, 5],
  weekdayMins: 120,
  weekendMins: 240,
  startTime: '18:00',
  sessionMins: 45,
  breakMins: 10,
  mix: 'rotate',
  daysOff: [],
  focus: null,
  updatedAt: 0,
});

const dow = (day: string) => (new Date(dayStart(day)).getDay() + 6) % 7; // Monday = 0
const isWeekend = (day: string) => dow(day) >= 5;

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function fromMin(m: number): string {
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** "18:30" → "6:30 pm" */
export function clock(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** Session start/end times available on a given day. */
export function sessionsOn(s: PlanSettings, day: string): { start: string; end: string }[] {
  if (!s.studyDays.includes(dow(day)) || s.daysOff.includes(day)) return [];
  const budget = isWeekend(day) ? s.weekendMins : s.weekdayMins;
  const out: { start: string; end: string }[] = [];
  let t = toMin(s.startTime);
  let used = 0;
  while (used + s.sessionMins <= budget && t + s.sessionMins <= 24 * 60) {
    out.push({ start: fromMin(t), end: fromMin(t + s.sessionMins) });
    used += s.sessionMins;
    t += s.sessionMins + s.breakMins;
  }
  return out;
}

function minutesBetween(s: PlanSettings, from: string, to: string): number {
  let total = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) total += sessionsOn(s, d).length * s.sessionMins;
  return total;
}

/** What's left to do, per subject, in book order. */
export function remainingTasks(subjects: SubjectKey[], progress: Progress) {
  const read: Record<string, PlanTask[]> = {};
  const revise: PlanTask[] = [];
  for (const subj of SUBJECTS.filter((x) => subjects.includes(x.key))) {
    read[subj.key] = [];
    for (const ch of subj.chapters) {
      for (const t of TOPICS[ch.id] ?? []) {
        for (const leaf of t.subs.length ? t.subs : [t]) {
          const c = progress.chapters[leaf.id]?.c ?? 0;
          const mins = MINS_PER_TOPIC[subj.key];
          if (c === 0) read[subj.key].push({ topic: leaf, chapter: ch, kind: 'read', mins });
          else if (c === 1 || c === 2) revise.push({ topic: leaf, chapter: ch, kind: 'revise', mins: Math.round(mins * REVISE_FACTOR) });
        }
      }
    }
  }
  // Weak before OK; within each, keep book order.
  const weak = revise.filter((t) => progress.chapters[t.topic.id]?.c === 1);
  const ok = revise.filter((t) => progress.chapters[t.topic.id]?.c === 2);
  return { read, revise: [...weak, ...ok] };
}

/** Subject order for a day: focus subject appears twice per cycle. */
function subjectCycle(subjects: SubjectKey[], focus: SubjectKey | null): SubjectKey[] {
  const base = SUBJECTS.map((s) => s.key).filter((k) => subjects.includes(k));
  if (!focus || !base.includes(focus) || base.length < 2) return base;
  const rest = base.filter((k) => k !== focus);
  const out: SubjectKey[] = [];
  rest.forEach((k, i) => {
    if (i % 2 === 0) out.push(focus);
    out.push(k);
  });
  return out;
}

/**
 * Build the timetable from `today` onwards. The plan is recomputed from what's actually left each
 * time, so missed days simply spread the remaining topics over the days that are left.
 */
export function generatePlan(s: PlanSettings, subjects: SubjectKey[], progress: Progress, today: string): Plan {
  const from = s.start > today ? s.start : today;
  const { read, revise } = remainingTasks(subjects, progress);
  const cycle = subjectCycle(subjects, s.focus);
  const readQueues: Record<string, PlanTask[]> = Object.fromEntries(Object.entries(read).map(([k, v]) => [k, [...v]]));
  const reviseQueue = [...revise];
  const days: Record<string, PlanSlot[]> = {};

  const readNeeded = Object.values(read).reduce((a, q) => a + q.reduce((b, t) => b + Math.ceil(t.mins / s.sessionMins) * s.sessionMins, 0), 0);
  const reviseNeeded = revise.reduce((a, t) => a + Math.ceil(t.mins / s.sessionMins) * s.sessionMins, 0);
  const readAvailable = s.readBy >= from ? minutesBetween(s, from, s.readBy) : 0;
  const reviseAvailable = s.reviseBy > s.readBy ? minutesBetween(s, addDays(s.readBy, 1) > from ? addDays(s.readBy, 1) : from, s.reviseBy) : 0;

  let cursor = 0; // position in the subject cycle
  let dayIndex = 0;
  let readOverflow = 0;
  const readLeft = () => Object.values(readQueues).some((q) => q.length);

  const nextRead = (preferred: SubjectKey | null): PlanTask | null => {
    if (preferred && readQueues[preferred]?.length) return readQueues[preferred].shift()!;
    for (let i = 0; i < cycle.length; i++) {
      const k = cycle[(cursor + i) % cycle.length];
      if (readQueues[k]?.length) {
        cursor = (cursor + i + 1) % cycle.length;
        return readQueues[k].shift()!;
      }
    }
    return null;
  };

  for (let d = from; d <= s.reviseBy && (readLeft() || reviseQueue.length); d = addDays(d, 1)) {
    const sessions = sessionsOn(s, d);
    if (!sessions.length) continue;
    const slots: PlanSlot[] = [];
    const daySubject = s.mix === 'daily' ? cycle[dayIndex % cycle.length] : null;
    dayIndex++;
    let i = 0;
    while (i < sessions.length) {
      let task: PlanTask | null = null;
      if (readLeft()) {
        task = nextRead(daySubject);
        if (task && d > s.readBy) readOverflow++;
      } else {
        task = reviseQueue.shift() ?? null;
      }
      if (!task) break;
      const parts = Math.max(1, Math.ceil(task.mins / s.sessionMins));
      for (let p = 1; p <= parts && i < sessions.length; p++, i++) {
        slots.push({ start: sessions[i].start, end: sessions[i].end, task, part: p, parts });
      }
    }
    if (slots.length) days[d] = slots;
  }

  const unscheduled = Object.values(readQueues).reduce((a, q) => a + q.length, 0) + reviseQueue.length;

  // Suggest a read-by date that fits, if the current one doesn't.
  let suggestedReadBy: string | null = null;
  if (readNeeded > readAvailable) {
    let acc = 0;
    for (let d = from, n = 0; n < 730; d = addDays(d, 1), n++) {
      acc += sessionsOn(s, d).length * s.sessionMins;
      if (acc >= readNeeded) {
        suggestedReadBy = d;
        break;
      }
    }
  }

  return { days, readNeeded, readAvailable, reviseNeeded, reviseAvailable, readOverflow, unscheduled, suggestedReadBy };
}

/** Minutes of study a day would be needed to finish first reading on time (averaged over study days). */
export function neededPerStudyDay(s: PlanSettings, plan: Plan, today: string): number {
  const from = s.start > today ? s.start : today;
  let studyDays = 0;
  for (let d = from; d <= s.readBy; d = addDays(d, 1)) if (sessionsOn(s, d).length) studyDays++;
  return studyDays ? Math.ceil(plan.readNeeded / studyDays) : plan.readNeeded;
}

/** Topics rated on a given day (for ticks on past calendar days and "done today"). */
export function ratedOn(progress: Progress, day: string): string[] {
  const out: string[] = [];
  for (const [id, m] of Object.entries(progress.chapters)) {
    if (id.includes(':') && (m.c ?? 0) > 0 && toDay(m.u) === day) out.push(id);
  }
  return out;
}

export function dayLabel(day: string, today: string): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const d = new Date(dayStart(day));
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}
