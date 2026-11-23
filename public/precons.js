// All searches run against the bundled MTGJSON product lists.
export function mountPreconPicker(container, load) {
  const panel = document.createElement('details');
  panel.innerHTML = `<summary>Find a Commander precon</summary>
    <label>Search by deck name, commander, or set code<input type="search" placeholder="e.g. Hatsune Miku" data-search></label>
    <label>Precon<select data-decks></select></label>
    <p data-info role="status"></p>
    <div data-lock-label hidden><label><input type="checkbox" data-lock> Lock the Secret Lair card names in this precon</label>
      <small>Protects these cards from cuts. Upgrade exports use your catalog’s selected printings.</small></div>
    <button type="button" data-load disabled>Use this precon as the decklist</button>
    <a data-source hidden target="_blank" rel="noopener noreferrer">MTGJSON product list</a>`;
  container.before(panel);
  const field = key => panel.querySelector('[data-' + key + ']');
  const search = field('search'), select = field('decks'), button = field('load');
  const info = field('info'), lock = field('lock'), link = field('source');
  let snapshot, pending = false, matches = [];
  const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
  function selectionChanged() {
    const deck = matches[select.selectedIndex];
    const paired = deck && deck.commanders.length !== 1;
    button.disabled = !deck || paired;
    field('lock-label').hidden = !deck?.secretLair.length;
    lock.checked = false;
    link.hidden = !deck;
    if (!deck) {
      info.textContent = 'No matching precons in this catalog.';
      return;
    }
    link.href = 'https://mtgjson.com/api/v5/decks/' + encodeURIComponent(deck.fileName) + '.json';
    info.textContent = deck.commanders.join(' + ') + ' · ' + deck.released +
      (paired ? ' · This Upgrader only supports a single designated commander.' : ' · 100 cards');
  }
  function filter() {
    if (!snapshot) return;
    const query = normalize(search.value);
    matches = snapshot.decks.filter(d => normalize([d.name, d.code, ...d.commanders].join(' ')).includes(query));
    select.replaceChildren(...matches.map(d => new Option(d.name + ' (' + d.code + ')', d.fileName)));
    selectionChanged();
  }
  panel.ontoggle = async () => {
    if (!panel.open || snapshot || pending) return;
    pending = true;
    info.textContent = 'Opening precon catalog…';
    try {
      const response = await fetch('/commander-precons.json');
      if (!response.ok) throw Error('Catalog unavailable');
      snapshot = await response.json();
      snapshot.decks.sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
      filter();
    } catch {
      snapshot = null;
      info.textContent = 'Could not open the precon catalog. Reopen the picker to retry, or paste your deck below.';
    } finally {
      pending = false;
    }
  };
  search.oninput = filter;
  select.onchange = selectionChanged;
  button.onclick = () => {
    const deck = matches[select.selectedIndex];
    if (!deck || deck.commanders.length !== 1) return;
    if (load(deck, lock.checked)) panel.open = false;
  };
}
