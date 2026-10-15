import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEET_QUESTIONS } from '../src/data/neet';
import {
  BY_ID, MAX_QUESTIONS, QUIZ_YEARS, clampMinutes, finishQuiz, formatClock, isCorrect, maxMinutes, mergeBooks, newQuiz, pickQuestions, questionPool, scoreQuiz, secondsLeft,
} from '../src/logic/quiz';

test('question bank has 500+ real NEET questions with valid answers', () => {
  assert.ok(NEET_QUESTIONS.length >= 1100);
  assert.deepEqual([...new Set(NEET_QUESTIONS.map((q) => q.y))].sort(), [...QUIZ_YEARS]);
  // NTA dropped 2023 Q2; 2023 Q150 accepts (1) or (3).
  assert.equal(BY_ID.get('N23E1002'), undefined);
  assert.deepEqual(BY_ID.get('N23E1150')!.a, [1, 3]);
  assert.equal(new Set(NEET_QUESTIONS.map((q) => q.id)).size, NEET_QUESTIONS.length);
  for (const q of NEET_QUESTIONS) {
    assert.ok(q.a.length >= 1 && q.a.every((a) => a >= 1 && a <= 4), q.id);
    assert.ok(q.w > 0 && q.h > 0);
    assert.ok((q.c === 11 || q.c === 12) && q.ch.length > 0, q.id);
  }
  // Corrections against NTA keys.
  assert.deepEqual(BY_ID.get('N24T3025')!.a, [1]);
  assert.deepEqual(BY_ID.get('N24T3122')!.a, [1]);
});

test('time is capped at one minute per question and can only go down', () => {
  assert.equal(maxMinutes(30), 30);
  assert.equal(clampMinutes(45, 30), 30);
  assert.equal(clampMinutes(20, 30), 20);
  assert.equal(clampMinutes(0, 30), 1);
  assert.equal(newQuiz(['N24T3001', 'N24T3002'], 99, 0).limitSecs, 120);
});

test('clock counts down from the start time and does not pause', () => {
  const q = newQuiz(['N24T3001', 'N24T3002', 'N24T3003'], 3, 1_000_000);
  assert.equal(secondsLeft(q, 1_000_000), 180);
  assert.equal(secondsLeft(q, 1_000_000 + 61_500), 119);
  assert.equal(secondsLeft(q, 1_000_000 + 999_999), 0);
  const done = finishQuiz(q, 1_000_000 + 500_000);
  assert.equal(done.timedOut, true);
  assert.equal(done.finishedAt, 1_000_000 + 180_000);
});

test('picks the requested count from the filter, ordered Physics → Chemistry → Biology', () => {
  const pool = questionPool(['phy', 'bio'], [2025], [11, 12]);
  assert.equal(pool.length, 135);
  const c11 = questionPool(['phy', 'che', 'bio'], [...QUIZ_YEARS], [11]);
  const c12 = questionPool(['phy', 'che', 'bio'], [...QUIZ_YEARS], [12]);
  assert.ok(c11.length > 150 && c12.length > 150);
  assert.equal(c11.length + c12.length, NEET_QUESTIONS.length);
  assert.ok(c11.every((q) => q.c === 11));
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ids = pickQuestions(pool, 30, rand);
  assert.equal(ids.length, 30);
  assert.equal(new Set(ids).size, 30);
  const subj = ids.map((id) => BY_ID.get(id)!.s);
  assert.ok(subj.every((s) => s === 'phy' || s === 'bio'));
  assert.equal(subj.indexOf('bio'), subj.lastIndexOf('phy') + 1);
  assert.equal(pickQuestions(pool, 999).length, 135);
});

test('NEET marking: +4 / −1 / 0, and any accepted option counts', () => {
  const ids = ['N24T3001', 'N24T3002', 'N24T3003', 'N2545040'];
  const right = BY_ID.get('N24T3001')!.a[0];
  const wrong = (BY_ID.get('N24T3002')!.a[0] % 4) + 1;
  const s = scoreQuiz(ids, [right, wrong, null, 2]);
  assert.equal(s.correct, 2);
  assert.equal(s.wrong, 1);
  assert.equal(s.skipped, 1);
  assert.equal(s.score, 7);
  assert.equal(s.max, 16);
  assert.ok(isCorrect('N2545040', 1) && isCorrect('N2545040', 2));
});

test('quiz history merges across devices without duplicates', () => {
  const r = (id: string, t: number) => ({ id, startedAt: t - 10, finishedAt: t, limitSecs: 60, ids: [], answers: [], timedOut: false });
  const m = mergeBooks({ results: [r('a', 1), r('b', 2)], updatedAt: 2 }, { results: [r('b', 2), r('c', 3)], updatedAt: 3 });
  assert.deepEqual(m.results.map((x) => x.id), ['c', 'b', 'a']);
  assert.equal(formatClock(245), '4:05');
  assert.equal(formatClock(3729), '1:02:09');
});

test('a test never has more than 100 questions', () => {
  const ids = pickQuestions(questionPool(['phy', 'che', 'bio'], [2024, 2025, 2026], [11, 12]), 500);
  const q = newQuiz(ids, 500, 0);
  assert.equal(MAX_QUESTIONS, 100);
  assert.equal(q.ids.length, 100);
  assert.equal(q.limitSecs, 100 * 60);
});
