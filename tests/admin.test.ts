import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studentRow, summarize, toCsv, streamLabel, chapterDetail } from '../src/logic/admin';
import { toggleMark } from '../src/logic/progress';
import { emptyProgress, type Profile } from '../src/logic/types';
import { dayStart } from '../src/logic/dates';

const at = (d: string) => dayStart(d) + 12 * 3600_000;
const prof = (o: Partial<Profile> = {}): Profile => ({ onboarded: true, subjects: ['phy','che','mat'], planStart: '2026-10-01', firstReadTarget: '2026-12-30', revisionTarget: null, rewards: [], theme: 'indigo', updatedAt: at('2026-10-01'), name: 'Asha K', email: 'asha@example.com', createdAt: at('2026-10-01'), ...o });

test('stream labels', () => {
  assert.equal(streamLabel(['phy','che','mat']), 'PCM');
  assert.equal(streamLabel(['phy','che','mat','bio']), 'PCMB');
  assert.equal(streamLabel([]), '—');
});

test('student row counts, last active and chapter detail', () => {
  let g = toggleMark(emptyProgress(), 'phy-01', 'f', at('2026-10-03'));
  g = toggleMark(g, 'phy-01', 'r', at('2026-10-05'));
  g = toggleMark(g, 'bio-01', 'f', at('2026-10-05')); // not a chosen subject
  const r = studentRow('u1', prof(), g, at('2026-10-06'));
  assert.equal(r.total, 37); assert.equal(r.read, 1); assert.equal(r.revised, 1);
  assert.equal(r.lastActiveAt, at('2026-10-05'));
  assert.ok(r.badges.includes('First Step'));
  const phy = chapterDetail(r)[0];
  assert.equal(phy.lines[0].revisedAt, at('2026-10-05'));
  assert.equal(chapterDetail(r).length, 3);
});

test('summary and csv', () => {
  const a = studentRow('a', prof(), toggleMark(emptyProgress(), 'phy-01', 'f', at('2026-10-05')), at('2026-10-06'));
  const b = studentRow('b', prof({ name: 'Ravi, "R"', email: 'r@x.com' }), emptyProgress(), at('2026-10-06'));
  const s = summarize([a, b], at('2026-10-06'));
  assert.equal(s.students, 2); assert.equal(s.notStarted, 1); assert.equal(s.activeWeek, 1);
  const csv = toCsv([a, b]).split('\n');
  assert.equal(csv.length, 1 + 37 * 2);
  assert.ok(csv[1].includes('2026-10-05'));
  assert.ok(csv.some(l => l.startsWith('"Ravi, ""R"""')), 'names with commas and quotes are escaped');
});
