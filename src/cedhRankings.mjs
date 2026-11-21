import { normalizedName } from './combos.mjs';

const endpoint = 'https://topdeck.gg/api/v2/tournaments';
const game = 'Magic: The Gathering';
const days = 90;
const minimumPlayers = 32;
const dayMs = 24 * 60 * 60 * 1000;
const cacheMs = 6 * 60 * 60 * 1000;
const maxBytes = 5_000_000;
const rejectedKey = 'TopDeck rejected the configured developer key.';
const competitiveTitle = /\bcEDH\b|\bt\/cEDH\b|\bcompetitive (?:EDH|commander)\b|\bbracket\s*5\b/i;
const casualTitle = /\bcasual\b|\bbracket\s*[1-4]\b|\bpauper\b|\btest (?:event|tourney|tournament)\b/i;
const count = value => Number.isSafeInteger(value) && value >= 0;

function commanderNames(leader) {
  if (typeof leader !== 'string' || leader.length > 260 || /[\u0000-\u001f]/.test(leader)) return [];
  const names = leader.split(' / ').map(name => name.trim());
  if (names.length > 2 || names.some(name => !name || /^(?:unknown(?: commander)?|none|n\/a|-)$/i.test(name))) return [];
  return names.sort((a, b) => a.localeCompare(b));
}

export function summarizeCedhEvents(events, now) {
  if (!Array.isArray(events) || events.length > 1600) throw Error('TopDeck returned an unexpected tournament list.');
  if (events.length && !events.some(event => typeof event?.TID === 'string' && Array.isArray(event.standings)))
    throw Error('The TopDeck tournament list is missing standings.');
  const seen = new Set();
  const rows = new Map();
  const sample = { events: 0, entries: 0, commanderEntries: 0 };
  for (const event of events) {
    if (event?.game !== game || event.format !== 'EDH' || event.isLeague || event.isTeamEvent ||
        typeof event.TID !== 'string' || !event.TID || seen.has(event.TID) ||
        !Number.isSafeInteger(event.startDate) || event.startDate * 1000 < now - days * dayMs || event.startDate * 1000 > now ||
        typeof event.tournamentName !== 'string' || !competitiveTitle.test(event.tournamentName) || casualTitle.test(event.tournamentName) ||
        !Array.isArray(event.standings) || event.standings.length < minimumPlayers) continue;

    seen.add(event.TID);
    sample.events++;
    sample.entries += event.standings.length;
    for (const standing of event.standings) {
      const names = commanderNames(standing?.leader);
      if (!names.length) continue;
      sample.commanderEntries++;
      const key = names.map(normalizedName).join(' / ');
      const row = rows.get(key) || { name: names.join(' / '), commanders: names, entries: 0, games: 0, wins: 0 };
      row.entries++;
      const { wins, draws, losses } = standing;
      if ([wins, draws, losses].every(count)) {
        row.wins += wins;
        row.games += wins + draws + losses;
      }
      rows.set(key, row);
    }
  }
  return {
    sample,
    rows: [...rows.values()].sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name)).map(row => ({
      ...row,
      share: row.entries / sample.commanderEntries,
      winRate: row.games ? row.wins / row.games : null,
    })),
  };
}

async function readTournamentList(response) {
  if (!response.body || Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw Error('The TopDeck tournament response exceeded the download limit.');
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw Error('The TopDeck tournament response exceeded the download limit.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'));
  } catch {
    throw Error('TopDeck returned an unreadable tournament list.');
  }
}

export function createCedhRankingsStore({ apiKey = '', fetcher = fetch, now = Date.now } = {}) {
  let snapshot = null, pending = null, retryAt = 0, error = null;
  const result = status => ({ status, days, minimumPlayers, ...snapshot, error });
  return async function getRankings() {
    if (!apiKey) return result('setup');
    if (pending) return pending;
    const age = snapshot ? now() - snapshot.fetchedAtMs : Infinity;
    if (age >= 0 && age < cacheMs) return result('ready');
    if (now() < retryAt) return result(snapshot ? 'stale' : 'unavailable');
    pending = (async () => {
      try {
        const response = await fetcher(endpoint, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(20_000),
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: apiKey },
          body: JSON.stringify({ game, format: 'EDH', last: days, participantMin: minimumPlayers,
            columns: ['wins', 'draws', 'losses'], leagues: false }),
        });
        if (!response.ok) {
          await response.body?.cancel();
          if (response.status === 429) {
            const wait = Number(response.headers.get('Retry-After'));
            retryAt = now() + Math.max(300, Number.isFinite(wait) ? wait : 0) * 1000;
          }
          throw Error(response.status === 401 || response.status === 403
            ? rejectedKey
            : 'TopDeck tournament data is temporarily unavailable.');
        }
        const events = await readTournamentList(response);
        const fetchedAtMs = now();
        snapshot = {
          ...summarizeCedhEvents(events, fetchedAtMs), fetchedAtMs,
          fetchedAt: new Date(fetchedAtMs).toISOString(),
        };
        error = null;
        return result('ready');
      } catch (err) {
        retryAt = Math.max(retryAt, now() + 5 * 60 * 1000);
        error = err.message === rejectedKey ? rejectedKey : 'TopDeck tournament results could not be loaded.';
        return result(snapshot ? 'stale' : 'unavailable');
      }
    })();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}
