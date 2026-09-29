import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CHAPTERS, SUBJECTS } from '../src/data/chapters';
import { toggleMark, mergeProgress, mergeProfile } from '../src/logic/progress';
import { emptyProgress, type Profile } from '../src/logic/types';
import { computeStats, computePace, computeXp, levelFor, streakEndingOn, bestStreak, hadComeback, evaluateBadges, newlyEarned, upNext, daysAheadInARow } from '../src/logic/gamify';
import { dayStart, addDays } from '../src/logic/dates';

const at = (day: string, h = 12) => dayStart(day) + h * 3600_000;
const profile = (o: Partial<Profile> = {}): Profile => ({ onboarded: true, subjects: ['phy','che','mat','bio'], planStart: '2026-10-01', firstReadTarget: '2026-12-30', revisionTarget: '2027-01-29', rewards: [], theme: 'indigo', updatedAt: 1, ...o });

test('syllabus has 50 chapters with unique ids', () => {
  assert.equal(ALL_CHAPTERS.length, 50);
  assert.deepEqual(SUBJECTS.map(s => s.chapters.length), [14, 10, 13, 13]);
  assert.equal(new Set(ALL_CHAPTERS.map(c => c.id)).size, 50);
});

test('toggle on/off and study days', () => {
  let p = toggleMark(emptyProgress(), 'phy-01', 'f', at('2026-10-02'));
  assert.ok(p.chapters['phy-01'].f);
  assert.deepEqual(p.days, ['2026-10-02']);
  p = toggleMark(p, 'phy-01', 'f', at('2026-10-03'));
  assert.equal(p.chapters['phy-01'].f, null);
  assert.deepEqual(p.days, ['2026-10-02'], 'unticking does not log a study day');
});

test('merge keeps the newest change per chapter and unions badges', () => {
  const a = toggleMark(emptyProgress(), 'phy-01', 'f', 100);
  let b = toggleMark(emptyProgress(), 'phy-01', 'f', 50);
  b = toggleMark(b, 'phy-01', 'f', 200); // unticked later on the other phone
  b.badges['first-step'] = 90;
  const m = mergeProgress(a, b);
  assert.equal(m.chapters['phy-01'].f, null);
  assert.equal(m.badges['first-step'], 90);
  assert.deepEqual(mergeProgress(b, a).chapters, m.chapters, 'order does not matter');
});

test('profile merge keeps rewards unlocked on either copy', () => {
  const r = { id: 'r1', title: 'Movie', milestone: 'rev:phy', createdAt: 1, unlockedAt: null };
  const a = profile({ updatedAt: 5, rewards: [r] });
  const b = profile({ updatedAt: 3, rewards: [{ ...r, unlockedAt: 42 }] });
  assert.equal(mergeProfile(a, b).rewards[0].unlockedAt, 42);
});

test('counts respect chosen subjects', () => {
  let p = toggleMark(emptyProgress(), 'bio-01', 'f', at('2026-10-02'));
  p = toggleMark(p, 'mat-01', 'f', at('2026-10-02'));
  const s = computeStats(profile({ subjects: ['phy', 'che', 'mat'] }), p);
  assert.equal(s.total, 37);
  assert.equal(s.read, 1);
});

test('pace: ahead and behind', () => {
  const pr = profile();
  let p = emptyProgress();
  for (let i = 1; i <= 10; i++) p = toggleMark(p, `phy-${String(i).padStart(2,'0')}`, 'f', at('2026-10-05'));
  const pace = computePace(computeStats(pr, p), pr, at('2026-10-10')).first!;
  // 9.5 of 91 days elapsed -> ~5 expected; 10 done -> ahead
  assert.ok(pace.diff >= 4 && pace.diff <= 6, `diff ${pace.diff}`);
  const later = computePace(computeStats(pr, p), pr, at('2026-11-15')).first!;
  assert.ok(later.diff < 0);
});

test('xp gives the ahead bonus and levels climb', () => {
  const pr = profile();
  let p = toggleMark(emptyProgress(), 'phy-01', 'f', at('2026-10-01'));
  assert.equal(computeXp(computeStats(pr, p), pr), 15);
  p = toggleMark(p, 'phy-02', 'f', at('2026-12-20')); // behind by then
  assert.equal(computeXp(computeStats(pr, p), pr), 25);
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(40).level, 2);
  assert.equal(levelFor(5000).level, 10);
  assert.equal(levelFor(5000).max, true);
});

test('streak forgives one missed day a week', () => {
  const d = (s: string[]) => new Set(s);
  // Mon 5 Oct 2026 .. Sun 11 Oct, miss Wed 7th
  const days = ['2026-10-05','2026-10-06','2026-10-08','2026-10-09','2026-10-10'];
  assert.equal(streakEndingOn(d(days), '2026-10-10'), 5);
  // today not ticked yet still shows streak through yesterday
  assert.equal(streakEndingOn(d(days), '2026-10-11'), 5);
  // two misses in the same week break it
  const two = ['2026-10-05','2026-10-07','2026-10-09','2026-10-10'];
  assert.equal(streakEndingOn(d(two), '2026-10-10'), 3);
  // two days with nothing = 0
  assert.equal(streakEndingOn(d(days), '2026-10-13'), 0);
  const month = Array.from({ length: 30 }, (_, i) => addDays('2026-10-01', i));
  assert.equal(bestStreak(month), 30);
});

test('comeback after a 7-day break', () => {
  assert.equal(hadComeback(['2026-10-01', '2026-10-08']), false);
  assert.equal(hadComeback(['2026-10-01', '2026-10-09']), true);
});

test('badges: earned, sticky and newly earned', () => {
  const pr = profile({ subjects: ['phy', 'che', 'mat'] });
  let p = emptyProgress();
  for (const c of SUBJECTS[0].chapters) p = toggleMark(p, c.id, 'f', at('2026-10-20'));
  const ctx = { stats: computeStats(pr, p), profile: pr, progress: p, now: at('2026-10-20') };
  const ids = newlyEarned(ctx).map(b => b.id);
  assert.ok(ids.includes('first-step'));
  assert.ok(ids.includes('read:phy'));
  assert.ok(ids.includes('early-bird'), 'physics done 70 days before target');
  assert.ok(!ids.includes('halfway'), '14 of 37 is under half');
  assert.ok(!ids.some(i => i.includes('bio')), 'no biology badges for PCM');
  // sticky after undo
  p.badges['read:phy'] = at('2026-10-20');
  p = toggleMark(p, 'phy-01', 'f', at('2026-10-21'));
  const again = evaluateBadges({ ...ctx, stats: computeStats(pr, p), progress: p });
  assert.equal(again.find(b => b.id === 'read:phy')!.earned, true);
});

test('ahead of plan days in a row', () => {
  const pr = profile();
  let p = emptyProgress();
  for (let i = 1; i <= 8; i++) p = toggleMark(p, `che-${String(i).padStart(2,'0')}`, 'f', at('2026-10-01', 9));
  assert.equal(daysAheadInARow(computeStats(pr, p), pr, at('2026-10-09'), 7), 7);
});

test('up next picks the subject furthest behind', () => {
  const pr = profile({ subjects: ['phy', 'che'] });
  let p = toggleMark(emptyProgress(), 'phy-01', 'f', 1);
  const next = upNext(computeStats(pr, p), p);
  assert.equal(next[0].chapter.id, 'che-01');
  assert.equal(next[1].chapter.id, 'phy-02');
  assert.equal(next[2].kind, 'r');
});

test('profile merge keeps name and email from whichever copy has them', () => {
  const local = profile({ updatedAt: 9 });
  const remote = profile({ updatedAt: 5, name: 'Asha K', email: 'asha@example.com', createdAt: 100 });
  const m = mergeProfile(local, remote);
  assert.equal(m.name, 'Asha K'); assert.equal(m.email, 'asha@example.com'); assert.equal(m.createdAt, 100);
  assert.equal(m.updatedAt, 9, 'the newer copy still wins for everything else');
});
