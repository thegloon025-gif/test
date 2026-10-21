/** Text export tailored to the Archidekt text import category convention.
 * This is NOT an authenticated account update and cannot promise that every
 * Archidekt version will automatically assign the commander role.
 */
export function archidektTextExport(deck){
 if(typeof deck!=='string')throw Error('Expected plain exported decklist.');
 const rows=deck.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(rows.length!==100||!/^1\s+/.test(rows[0])||!rows[0].endsWith('*CMDR*'))
  throw Error('Archidekt export needs a validated 100-card list with commander in the first row.');
 return rows.map((line,i)=>{
  const name=line.replace(/^1\s+/, '').replace(/\s*\*CMDR\*\s*$/, '');
  if(!name)return null;
  return `1x ${name}${i===0?' [Commander]':''}`;
 }).join('\n');
}
