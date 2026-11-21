import { chooseCedhCommander } from './app.js';

const $ = id => document.getElementById(id);
const tabs = [$('deckbuilder-tab'), $('cedh-tab')];
const numeric = new Intl.NumberFormat();
const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });
const pageSize = 25;
let rankings = null, request = null, limit = pageSize;

function selectTab(tab) {
  for (const button of tabs) {
    const selected = button === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    $(button.getAttribute('aria-controls')).hidden = !selected;
  }
  if (tab === tabs[1]) loadRankings();
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const opposite = tabs[1 - tabs.indexOf(tab)];
    const destination = { ArrowRight: opposite, ArrowLeft: opposite, Home: tabs[0], End: tabs[1] }[event.key];
    if (!destination) return;
    event.preventDefault();
    selectTab(destination);
    destination.focus();
  });
}

function node(tag, text) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderRows() {
  const query = $('cedh-search').value.trim().toLowerCase();
  const byRate = $('cedh-sort').value === 'winRate';
  const ordered = byRate
    ? rankings.rows.filter(row => row.games >= 20).sort((a, b) => b.winRate - a.winRate || b.entries - a.entries || a.name.localeCompare(b.name))
    : rankings.rows;
  const matches = ordered.map((row, index) => ({ row, rank: index + 1 })).filter(x => x.row.name.toLowerCase().includes(query));
  const body = $('cedh-rows');
  body.replaceChildren();

  for (const { row, rank } of matches.slice(0, limit)) {
    const entry = node('tr');
    const action = node('td');
    entry.append(...[rank, row.name, numeric.format(row.entries), percent.format(row.share), numeric.format(row.games),
      row.winRate === null ? '—' : percent.format(row.winRate)].map(value => node('td', value)), action);
    if (row.commanders.length === 1) {
      const pick = node('button', 'Build B5');
      pick.type = 'button';
      pick.className = 'secondary';
      pick.setAttribute('aria-label', 'Build Bracket 5 with ' + row.name);
      pick.onclick = async () => {
        pick.disabled = true;
        $('cedh-result-status').textContent = 'Selecting ' + row.name + '…';
        try {
          await chooseCedhCommander(row.commanders[0]);
          $('cedh-result-status').textContent = '';
          selectTab(tabs[0]);
          $('budget').focus();
        } catch (error) {
          $('cedh-result-status').textContent = error.message;
        } finally {
          pick.disabled = false;
        }
      };
      action.append(pick);
    }
    body.append(entry);
  }
  $('cedh-more').hidden = matches.length <= limit;
  $('cedh-result-status').textContent = matches.length
    ? `Showing ${Math.min(limit, matches.length)} of ${matches.length} ranked commanders or pairs.`
    : 'No commanders match these filters.';
}

function renderRankings() {
  const hasRows = Array.isArray(rankings.rows);
  $('cedh-data').hidden = !hasRows || !rankings.rows.length;
  $('cedh-reload').hidden = !['unavailable', 'stale'].includes(rankings.status);
  $('cedh-setup').hidden = rankings.status !== 'setup' && !rankings.error?.includes('developer key');
  if (rankings.status === 'setup') {
    $('cedh-status').textContent = 'Open EDHTop16 for current rankings, or set up TopDeck to view rankings here.';
    return;
  }
  if (rankings.status === 'stale' || rankings.status === 'unavailable') {
    $('cedh-status').textContent = (rankings.error || 'Tournament results could not be loaded.') +
      (rankings.status === 'stale' ? ' Showing the last loaded results.' : '');
  } else {
    $('cedh-status').textContent = rankings.rows.length ? '' : 'No completed events in this sample had a recorded commander.';
  }
  if (!hasRows || !rankings.rows.length) return;
  const { sample, fetchedAt, days, minimumPlayers } = rankings;
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fetchedAt));
  $('cedh-sample').textContent = `Last ${days} days · ${sample.events} labeled cEDH events with ${minimumPlayers}+ players · ` +
    `${numeric.format(sample.commanderEntries)} of ${numeric.format(sample.entries)} entries named a commander · loaded ${date}`;
  renderRows();
}

async function loadRankings() {
  if (request) return request;
  $('cedh-status').textContent = 'Loading tournament results…';
  $('cedh-reload').hidden = true;
  request = (async () => {
    try {
      const response = await fetch('/api/cedh/rankings');
      if (!response.ok) throw Error('Tournament results could not be loaded.');
      rankings = await response.json();
    } catch {
      rankings = rankings?.rows ? { ...rankings, status: 'stale' } : { status: 'unavailable' };
    }
    renderRankings();
  })();
  try {
    await request;
  } finally {
    request = null;
  }
}

$('cedh-reload').addEventListener('click', loadRankings);
for (const [id, event] of [['cedh-search', 'input'], ['cedh-sort', 'change']]) {
  $(id).addEventListener(event, () => {
    limit = pageSize;
    renderRows();
  });
}
$('cedh-more').addEventListener('click', () => {
  limit += pageSize;
  renderRows();
});
