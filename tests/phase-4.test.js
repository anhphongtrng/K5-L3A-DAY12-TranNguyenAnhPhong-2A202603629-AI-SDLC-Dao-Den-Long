import assert from 'node:assert/strict';
import test from 'node:test';
import { topTen, validName } from '../src/game/leaderboard.js';

test('leaderboard validates names, keeps the top ten and breaks ties by achievement time', () => {
  assert.equal(validName('May_42'), true);
  for (const name of ['ab', '1234567890123', 'Mây', 'a b', 'a-b', 'abc\n']) {
    assert.equal(validName(name), false);
  }
  const entries = Array.from({ length: 12 }, (_, index) => ({
    name: 'May_' + index, score: Math.floor(index / 2), nights_won: 1, seed: 42,
    achieved_at: new Date(2026, 10, 20, 12, index).toISOString(),
  }));
  const ranked = topTen(entries.toReversed());
  assert.equal(ranked.length, 10);
  assert.deepEqual(ranked.slice(0, 2).map((entry) => entry.name), ['May_10', 'May_11']);
  assert.deepEqual(ranked.slice(-2).map((entry) => entry.name), ['May_2', 'May_3']);
});
