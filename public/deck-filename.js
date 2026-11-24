/** All deck TXT exporters receive the validated, commander-first canonical list. */
export function deckTxtFilename(deck, bracket) {
  const firstLine = deck.split('\n', 1)[0].trim();
  const match = /^1 (.+) \*CMDR\*$/.exec(firstLine);
  if (!match || !/^[2-5]$/.test(String(bracket))) {
    throw new Error('A deck export needs its commander and bracket.');
  }
  const name = match[1].replace(/\s*[<>:"/\\|?*]+\s*/g, ' - ').replace(/\s+/g, ' ').trim();
  return name + ' - Bracket ' + bracket + '.txt';
}
