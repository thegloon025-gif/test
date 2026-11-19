import assert from 'node:assert/strict';
import test from 'node:test';
import { createCedhRankingsStore, summarizeCedhEvents } from '../src/cedhRankings.mjs';

const fixtureTime = Date.UTC(2026, 10, 19);
const day = 24 * 60 * 60 * 1000;
const kinnan = 'Kinnan, Bonder Prodigy';
const pair = "Kraum, Ludevic's Opus / Tymna the Weaver";
const standing = (leader, wins, draws, losses) => ({ leader, wins, draws, losses, name: 'Private fixture player' });
const record = (id, standings, overrides = {}) => ({
  TID: id, tournamentName: 'Regional cEDH tournament', startDate: (fixtureTime - day) / 1000,
  game: 'Magic: The Gathering', format: 'EDH',
  standings: [...standings, ...Array.from({ length: 32 - standings.length }, () => ({}))], ...overrides,
});
const first = record('fixture-1', [standing(kinnan, 3, 1, 1), standing(pair, 2, 0, 2), standing(kinnan, 1, 0, 2)]);
const second = record('fixture-2', [standing("Tymna the Weaver / Kraum, Ludevic's Opus", 2, 1, 1), standing(kinnan)]);

test('cEDH rankings count explicitly labeled events, combine pairs, and report coverage and draws', () => {
  const wrong = [
    record('casual', [standing('Casual Event Commander', 1, 0, 0)], { tournamentName: 'cEDH and Casual Commander', format: 'EDH' }),
    record('unlabeled', [standing('Unlabeled Commander', 1, 0, 0)], { tournamentName: 'Friday Night Commander' }),
    record('old', [], { startDate: (fixtureTime - 91 * day) / 1000 }),
    record('future', [], { startDate: (fixtureTime + day) / 1000 }),
    record('small', [], { standings: Array(31).fill({}) }),
    record('league', [], { isLeague: true }),
  ];
  const result = summarizeCedhEvents([first, ...wrong, first, second], fixtureTime);
  assert.deepEqual(result.sample, { events: 2, entries: 64, commanderEntries: 5 });
  assert.deepEqual(result.rows, [
    { name: kinnan, commanders: [kinnan], entries: 3, games: 8, wins: 4, share: .6, winRate: .5 },
    { name: pair, commanders: pair.split(' / '), entries: 2, games: 8, wins: 4, share: .4, winRate: .5 },
  ]);
  assert.doesNotMatch(JSON.stringify(result), /Private fixture player/);
});

test('rankings use the documented authenticated read endpoint and reuse recent results', async () => {
  let requests = 0, time = fixtureTime;
  const fetcher = async (url, options) => {
    requests++;
    assert.equal(url, 'https://topdeck.gg/api/v2/tournaments');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'fixture-key');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), { game: 'Magic: The Gathering', format: 'EDH',
      last: 90, participantMin: 32, columns: ['wins', 'draws', 'losses'], leagues: false });
    if (requests === 2) return new Response(null, { status: 429, headers: { 'Retry-After': '3600' } });
    return Response.json([first]);
  };
  const unconfigured = createCedhRankingsStore({ fetcher });
  assert.equal((await unconfigured()).status, 'setup');
  assert.equal(requests, 0);
  const load = createCedhRankingsStore({ apiKey: 'fixture-key', fetcher, now: () => time });
  const [a, b] = await Promise.all([load(), load()]);
  assert.deepEqual(a, b);
  assert.equal(a.status, 'ready');
  assert.equal(a.rows[0].name, kinnan);
  assert.doesNotMatch(JSON.stringify(a), /fixture-key|Private fixture player/);
  assert.deepEqual(await load(), a);
  assert.equal(requests, 1);
  time += 6 * 60 * 60 * 1000 + 1;
  const stale = await load();
  assert.equal(stale.status, 'stale');
  assert.deepEqual(stale.rows, a.rows);
  time += 30 * 60 * 1000;
  assert.equal((await load()).status, 'stale');
  assert.equal(requests, 2);
  time += 30 * 60 * 1000;
  assert.equal((await load()).status, 'ready');
  assert.equal(requests, 3);
});

test('unexpected provider responses are reported as unavailable', async () => {
  const malformed = createCedhRankingsStore({ apiKey: 'fixture-key', fetcher: async () => Response.json([{ unexpected: true }]) });
  const result = await malformed();
  assert.equal(result.status, 'unavailable');
  assert.equal(result.rows, undefined);
});
