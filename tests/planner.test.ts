import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPlanSettings, generatePlan, sessionsOn, remainingTasks, clock, neededPerStudyDay } from '../src/logic/planner';
import { rateTopic } from '../src/logic/progress';
import { emptyProgress } from '../src/logic/types';
import { ratedItems } from '../src/data/topics';
import { addDays } from '../src/logic/dates';

const today = '2026-10-05'; // Monday
const base = { ...defaultPlanSettings(today, '2026-12-31', '2027-02-15') };

test('sessions follow hours, session length, breaks and study days', () => {
  const s = { ...base, weekdayMins: 90, sessionMins: 45 as const, breakMins: 15, startTime: '18:00' };
  assert.deepEqual(sessionsOn(s, '2026-10-05'), [{ start: '18:00', end: '18:45' }, { start: '19:00', end: '19:45' }]);
  assert.equal(sessionsOn(s, '2026-10-11').length, 0, 'Sunday is off by default');
  assert.equal(sessionsOn({ ...s, daysOff: ['2026-10-06'] }, '2026-10-06').length, 0);
  assert.equal(clock('18:45'), '6:45 pm'); assert.equal(clock('00:30'), '12:30 am');
});

test('plan fills first reading in book order, rotating subjects', () => {
  const plan = generatePlan(base, ['phy', 'che', 'mat'], emptyProgress(), today);
  const first = plan.days[today];
  assert.ok(first.length > 0);
  assert.equal(first[0].task.topic.id, 'phy-01:1.2');
  const subjectsToday = new Set(first.map((sl) => sl.task.chapter.subject));
  assert.ok(subjectsToday.size >= 2, 'mixes subjects within a day');
  assert.ok(Object.keys(plan.days).every((d) => d >= today));
});

test('one subject per day mode', () => {
  const plan = generatePlan({ ...base, mix: 'daily' }, ['phy', 'che'], emptyProgress(), today);
  for (const slots of Object.values(plan.days).slice(0, 5)) assert.equal(new Set(slots.map((x) => x.task.chapter.subject)).size, 1);
});

test('rated topics drop out; weak ones come back for revision first', () => {
  let p = emptyProgress();
  const items = ratedItems('mat-01');
  p = rateTopic(p, items[0].id, 2, 1); // OK
  p = rateTopic(p, items[1].id, 1, 2); // Weak
  const r = remainingTasks(['mat'], p);
  assert.ok(!r.read.mat.some((t) => t.topic.id === items[0].id));
  assert.deepEqual(r.revise.slice(0, 2).map((t) => t.topic.id), [items[1].id, items[0].id]);
});

test('feasibility: too little time is flagged with a date that would fit', () => {
  const tight = { ...base, readBy: addDays(today, 10), weekdayMins: 60, weekendMins: 60 };
  const plan = generatePlan(tight, ['phy', 'che', 'mat', 'bio'], emptyProgress(), today);
  assert.ok(plan.readNeeded > plan.readAvailable);
  assert.ok(plan.suggestedReadBy && plan.suggestedReadBy > tight.readBy);
  assert.ok(neededPerStudyDay(tight, plan, today) > 60);
  const roomy = generatePlan({ ...base, readBy: '2027-06-30', reviseBy: '2027-09-30' }, ['mat'], emptyProgress(), today);
  assert.equal(roomy.suggestedReadBy, null);
  assert.equal(roomy.unscheduled, 0);
});

test('long topics span several sessions', () => {
  const plan = generatePlan({ ...base, sessionMins: 30 }, ['phy'], emptyProgress(), today);
  const s = plan.days[today];
  assert.equal(s[0].parts, 2); assert.equal(s[1].part, 2); assert.equal(s[0].task.topic.id, s[1].task.topic.id);
});
