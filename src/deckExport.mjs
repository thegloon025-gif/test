/** Convert a validated, commander-first list (one row per physical card) to
 * Archidekt text. Keep the commander category separate from main-deck rows. */
export function archidektTextExport(deck){
 if(typeof deck!=='string')throw Error('Expected plain exported decklist.');
 const rows=deck.trim().split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 const commander=/^1 (.+) \*CMDR\*$/.exec(rows[0]||'');
 if(rows.length!==100||!commander)
  throw Error('Archidekt export needs a validated 100-card list with commander in the first row.');
 const quantities=new Map();
 for(const row of rows.slice(1)){
  const match=/^1 (.+)$/.exec(row);
  if(!match||row.includes('*CMDR*'))throw Error('Expected one main-deck card per validated row.');
  const name=match[1];
  quantities.set(name,(quantities.get(name)||0)+1);
 }
 return [`1x ${commander[1]} [Commander]`,...Array.from(quantities,([name,n])=>`${n}x ${name}`)].join('\n');
}
