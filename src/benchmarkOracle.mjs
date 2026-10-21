/** Independent cross-check on PUBLIC Scryfall-shaped data.
 * Deliberately does not import src/cards.mjs or the deckbuilder's classifiers.
 */
const front=c=>Array.isArray(c.card_faces)&&c.card_faces.length?c.card_faces[0]:c;
const playableSpellFaces=c=>{
 const fs=Array.isArray(c.card_faces)&&c.card_faces.length?c.card_faces:[c];
 if(['transform','meld','reversible_card','double_faced_token'].includes(c.layout))return fs.slice(0,1);
 if(c.layout==='modal_dfc')return fs.filter(f=>!/^\s*(?:Basic\s+)?Land\b/.test((f.type_line||'').split('—')[0].trim().replace(/\b(?:Legendary|Snow)\s+/g,'')));
 return fs;
};
function subtypeTokens(face){const line=face.type_line||'';const rhs=line.includes('—')?line.split('—').slice(1).join('—'):'';return rhs.split(/\s+/).filter(Boolean);}
export const independentlyCastableSubtype=(c,type)=>playableSpellFaces(c).some(f=>subtypeTokens(f).includes(type)&&!/^\s*Land\b/.test(f.type_line||''));
export const independentlyPlayableLand=c=>{
 const fs=Array.isArray(c.card_faces)&&c.card_faces.length?c.card_faces:[c];
 const land=f=>/\bLand\b/.test((f.type_line||'').split('—')[0]);
 return c.layout==='modal_dfc'?fs.some(land):land(fs[0]);
};
export const independentlyHasCastableEldrazi=c=>independentlyCastableSubtype(c,'Eldrazi');
export const independentlyValidDeckCount=s=>s.trim().split(/\r?\n/).filter(Boolean).reduce((n,line)=>{
 const m=line.match(/^(\d+)\s+/);if(!m)throw Error('Bad decklist line '+line);return n+Number(m[1]);
},0);
