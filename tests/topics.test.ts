import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_CHAPTERS } from '../src/data/chapters';
import { TOPICS, ratedItems } from '../src/data/topics';
import { rateTopic, topicStats, mergeProgress, toggleMark } from '../src/logic/progress';
import { emptyProgress } from '../src/logic/types';
import { computeStats } from '../src/logic/gamify';

test('every chapter has topics with unique ids under it', () => {
  for (const c of ALL_CHAPTERS) {
    assert.ok(TOPICS[c.id]?.length, `no topics for ${c.id}`);
    for (const t of ratedItems(c.id)) assert.ok(t.id.startsWith(`${c.id}:${c.no}.`), `${t.id} under ${c.id}`);
  }
  const ids = ALL_CHAPTERS.flatMap((c) => ratedItems(c.id).map((t) => t.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('rating every topic finishes the chapter; stats count levels', () => {
  const items = ratedItems('mat-06'); // 6.2, 6.3, 6.4.1
  assert.equal(items.length, 3);
  let p = emptyProgress();
  items.slice(0, -1).forEach((t, i) => (p = rateTopic(p, t.id, (i % 3 + 1) as 1 | 2 | 3, 1000 + i)));
  assert.equal(p.chapters['mat-06']?.f ?? null, null);
  p = rateTopic(p, items.at(-1)!.id, 1, 5000);
  assert.equal(p.chapters['mat-06'].f, 5000, 'chapter auto-ticked');
  const s = topicStats(p, 'mat-06');
  assert.deepEqual(s, { total: 3, rated: 3, weak: 2, ok: 1, strong: 0 });
  p = rateTopic(p, items[0].id, 0, 6000);
  assert.equal(p.chapters['mat-06'].f, 5000, 'clearing a rating keeps the chapter ticked');
  assert.equal(topicStats(p, 'mat-06').rated, 2);
});

test('topic ratings do not change chapter counts and survive merges', () => {
  const id = ratedItems('phy-01')[0].id;
  const a = rateTopic(emptyProgress(), id, 3, 100);
  const b = toggleMark(emptyProgress(), 'phy-02', 'f', 200);
  const m = mergeProgress(a, b);
  assert.equal(m.chapters[id].c, 3);
  assert.equal(computeStats({ subjects: ['phy'] }, m).read, 1);
});
