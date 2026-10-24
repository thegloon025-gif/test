// Structured Scryfall card semantics: choose the face appropriate to an action.
export const COLORS=['W','U','B','R','G'];
const hasType=(line,type)=>String(line||'').split('—')[0].trim().split(/\s+/).includes(type);
export const faces=c=>Array.isArray(c.card_faces)&&c.card_faces.length?c.card_faces:[c];
export function castFaces(c){const f=faces(c);if(['transform','meld','reversible_card','double_faced_token'].includes(c.layout))return [f[0]];if(c.layout==='modal_dfc')return f.filter(x=>!hasType(x.type_line,'Land'));return f;}
export function playableLand(c){const f=faces(c);return c.layout==='modal_dfc'?f.some(x=>hasType(x.type_line,'Land')):hasType(f[0]?.type_line||c.type_line,'Land');}
export function landFaces(c){return c.layout==='modal_dfc'?faces(c).filter(x=>hasType(x.type_line,'Land')):playableLand(c)?[faces(c)[0]]:[];}
export const castHasType=(c,t)=>castFaces(c).some(f=>hasType(f.type_line||c.type_line,t));
export function castHasSubtype(c,t){return castFaces(c).some(f=>String((f.type_line||c.type_line||'').split('—')[1]||'').trim().split(/\s+/).includes(t));}
export const isCreatureSpell=c=>castHasType(c,'Creature');
export const isBasic=c=>landFaces(c).some(f=>hasType(f.type_line,'Basic'));
export function castOracle(c){return castFaces(c).map(f=>f.oracle_text||c.oracle_text||'').join('\n');}
// Read actual mana *production* clauses, not colored symbols in activation costs.
// This is intentionally narrower than Scryfall's produced_mana (which can include
// restricted, conditional or once-only colors). The latter is useful as metadata,
// but not proof that a land fixes those colors every turn.
export function coloredSources(c){
 // A source whose color choices occur only during a draft has no selected
 // colors in normal constructed Commander play. This is a rules predicate,
 // not a card-name exclusion.
 const draftOnly=landFaces(c).some(f=>/as you draft(?:ed)?|when you draft|as you drafted/i.test(f.oracle_text||''));
 if(draftOnly)return [];
 const result=new Set();
 const fs=landFaces(c).length?landFaces(c):faces(c).slice(0,1);
 for(const f of fs){
  const s=String(f.oracle_text||c.oracle_text||'');
  for(const line of s.split('\n')){
   for(const m of line.matchAll(/\badd\s+([^.;]+?)(?=\.|;|$)/gi)){
    const clause=m[1];
    for(const sym of clause.matchAll(/\{([WUBRG])\}/g))result.add(sym[1]);
    if(/mana of any colo[u]?r|mana of any type/i.test(clause))COLORS.forEach(x=>result.add(x));
   }
  }
 }
 if(isBasic(c)){
  const name=faces(c)[0].name||c.name;
  const idx=['Plains','Island','Swamp','Mountain','Forest'].indexOf(name);
  if(idx>=0)result.add(COLORS[idx]);
 }
 return [...result];
}
export function landManaQuality(c){
 const s=landFaces(c).map(f=>f.oracle_text||'').join('\n')||c.oracle_text||'';
 const sourceColors=coloredSources(c);
 const canC=trueColorlessSource(c);
 const restricted=/spend this mana only|use this mana only|only to cast|only to activate/i.test(s);
 const needsActivationPayment=/\{[1-9]\}[^\n.]*: add|\{[1-9]\},? \{T\}[^\n.]*add/i.test(s);
 const consumable=/remove an energy counter|pay \{e\}|sacrifice [^.]*: add|sacrifice [^.]*to add/i.test(s);
 const entersTapped=/enters (?:the battlefield )?tapped|enters tapped/i.test(s);
 const unusable=/as you draft(?:ed)?|when you draft|as you drafted/i.test(s);
 // A utility land that cannot provide useful colored mana pays a large slot tax
 // in four- or five-color decks, even when it produces unrestricted {C}.
 return {colors:sourceColors,canC,restricted,needsActivationPayment,consumable,entersTapped,unusable};
}
export function trueColorlessSource(c){const fs=landFaces(c).length?landFaces(c):faces(c).slice(0,1);if(c.name==='Wastes')return true;return fs.some(f=>{const s=f.oracle_text||c.oracle_text||'';return s.split('\n').some(line=>/\bAdd\s+\{C\}/i.test(line)&&!/spend this mana only|use this mana only|only to cast|activate only|can.t be spent to cast|can.t be spent on nonartifact/i.test(line)&&!/powerstone token/i.test(s));});}
export const priceOf=c=>isBasic(c)&&c.basicLandValuation!=='catalog'?0:(typeof c.prices?.eur==='number'&&Number.isFinite(c.prices.eur)?c.prices.eur:null);
export const oracleId=c=>c.oracle_id||c.id||c.name;
export function compact(raw){const f=faces(raw),front=f[0];const eur=raw.prices?.eur ?? raw.prices?.eur_foil;const price=eur==null?null:Number(eur);return {id:oracleId(raw),name:raw.name||front.name,layout:raw.layout||'normal',type_line:raw.type_line||front.type_line||'',card_faces:f.length>1?f.map(x=>({name:x.name,type_line:x.type_line||'',oracle_text:x.oracle_text||'',mana_cost:x.mana_cost||'',power:x.power,toughness:x.toughness})):undefined,oracle_text:raw.oracle_text||front.oracle_text||'',mana_cost:raw.mana_cost||front.mana_cost||'',cmc:Number(raw.cmc)||0,color_identity:raw.color_identity||[],colors:raw.colors||undefined,produced_mana:raw.produced_mana||[],legalities:{commander:raw.legalities?.commander||'not_legal'},prices:{eur:Number.isFinite(price)&&price>=0?price:null},edhrec_rank:raw.edhrec_rank??null,image_url:raw.image_uris?.normal||front.image_uris?.normal||'',set:raw.set,printing:{set:raw.set,setName:raw.set_name||null,collectorNumber:raw.collector_number||null,language:raw.lang||null,border:raw.border_color||null,finish:raw.prices?.eur!=null?'normal':raw.prices?.eur_foil!=null?'foil':null,source:'Scryfall bulk printing',eligibleVersion:2},game_changer:!!raw.game_changer,cardmarketIds:raw.cardmarket_id!=null?[String(raw.cardmarket_id)]:[],power:front.power??raw.power,keywords:raw.keywords||[]};}
export function legalFor(card,commander){return card.legalities?.commander==='legal'&&oracleId(card)!==oracleId(commander)&&(card.color_identity||[]).every(c=>(commander.color_identity||[]).includes(c))&&!/^(Token|Emblem|Scheme|Vanguard|Plane|Phenomenon|Conspiracy)\b/i.test(card.type_line||'')&&(playableLand(card)||castFaces(card).some(f=>['Creature','Artifact','Enchantment','Instant','Sorcery','Planeswalker','Battle','Kindred','Tribal'].some(t=>hasType(f.type_line||card.type_line,t))));}
export function isCommander(c){const type=faces(c)[0]?.type_line||c.type_line||'';return c.legalities?.commander==='legal'&&((hasType(type,'Legendary')&&hasType(type,'Creature'))||/can be your commander/i.test(c.oracle_text||faces(c)[0]?.oracle_text||''));}
export function isLandSlot(c){return playableLand(c)&&landFaces(c).length>0;}
export function hasTypeLine(line,type){return hasType(line,type);}
