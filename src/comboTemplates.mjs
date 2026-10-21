/** Fail-closed, local subset of Scryfall/Spellbook template predicates.
 * This tests whether a CATALOGUED CARD is an eligible replacement, NOT whether
 * a combo can be played with that card in the specified zone or game state.
 */
import {castFaces,castHasSubtype,castHasType,hasTypeLine,isLandSlot} from './cards.mjs';

const manaValue=c=>Number.isFinite(c.cmc)?c.cmc:NaN;
const types=new Set(['creature','artifact','enchantment','instant','sorcery','planeswalker','land','battle','kindred']);
const subtypes=new Set(['eldrazi','zombie','ninja','goblin','elf','dragon','human','wizard','spirit','vampire','soldier']);
const hasChangeling=c=>(c.keywords||[]).some(k=>String(k).toLowerCase()==='changeling')||castFaces(c).some(f=>/^\s*changeling(?:\s|$)/im.test(f.oracle_text||''));
const matchType=(c,t)=>types.has(t)?(t==='land'?isLandSlot(c):castHasType(c,t[0].toUpperCase()+t.slice(1))):subtypes.has(t)?(castHasSubtype(c,t[0].toUpperCase()+t.slice(1))||(castHasType(c,'Creature')&&hasChangeling(c))):false;

// Parse *only* unambiguous finite templates. Never infer a general expression
// such as 'a creature you control that can untap itself' from a word match.
export function parseTemplateName(name){
 const raw=String(name||'').toLowerCase().replace(/\s+/g,' ').trim().replace(/^((?:eldrazi|zombie|ninja|goblin|elf|dragon|human|wizard|spirit|vampire|soldier)\s+)(creature|artifact|enchantment|instant|sorcery)\s+card\s+with\s+mv\s*=/,'an $1$2 with mana value ');
 const base=raw.match(/^(?:an?|any|one|another) (?:additional )?((?:(?:colorless|eldrazi|zombie|ninja|goblin|elf|dragon|human|wizard|spirit|vampire|soldier) )?)(creature|artifact|enchantment|instant|sorcery|planeswalker|land|battle|kindred)(?: (?:card|spell))?(.*)$/i);
 if(!base)return null;
 const extra=base[3].trim();let values=null,min=null,max=null;
 if(extra){
  let m=extra.match(/^with mana value (\d+)(?:,\s*(\d+))?(?:,?\s*or\s*(\d+))?$/);
  if(m)values=m.slice(1).filter(Boolean).map(Number);
  else if((m=extra.match(/^with mana value (\d+)\s*(?:-|through|to)\s*(\d+)$/))){min=Number(m[1]);max=Number(m[2]);}
  else if((m=extra.match(/^with mana value between (\d+) and (\d+)$/))){min=Number(m[1]);max=Number(m[2]);}
  else if((m=extra.match(/^with mana value (?:at least|greater than or equal to) (\d+)$/))){min=Number(m[1]);}
  else if((m=extra.match(/^with mana value (?:at most|less than or equal to) (\d+)$/))){max=Number(m[1]);}
  else return null;
 }
 const qualifier=base[1].trim(),kind=base[2];
 return card=>(!qualifier||qualifier==='colorless'?(qualifier!=='colorless'||((Array.isArray(card.colors)&&card.colors.length===0)||(card.color_identity||[]).length===0||castFaces(card).some(f=>/\bdevoid\b/i.test(f.oracle_text||'')))):matchType(card,qualifier))&&matchType(card,kind)&&(!values||values.includes(manaValue(card)))&&(min===null||manaValue(card)>=min)&&(max===null||manaValue(card)<=max);
}
// Spellbook's documented query for template 34 uses a bounded OR group.
// These explicit parsers do not claim to implement arbitrary Scryfall syntax.
const normalizedQuery=q=>q.trim().replace(/\s+/g,' ').toLowerCase();
export function parseTemplateQuery(query){
 if(typeof query!=='string'||!query.trim())return null;
 const expression=normalizedQuery(query);
 if(expression==='(t:eldrazi or keyword:changeling) t:creature mv>3 mv<7'){
  return c=>castHasType(c,'Creature')&&manaValue(c)>3&&manaValue(c)<7&&(castHasSubtype(c,'Eldrazi')||hasChangeling(c));
 }
 if(expression==='mv<=1 (mana={0} or mana={1} or mana={c}) is:permanent'){
  return c=>manaValue(c)<=1&&castFaces(c).some(f=>['Creature','Artifact','Enchantment','Planeswalker','Battle','Kindred'].some(t=>hasTypeLine(f.type_line||c.type_line,t))&&['{0}','{1}','{C}'].includes(String(f.mana_cost||c.mana_cost).trim()));
 }
 const terms=query.trim().match(/(?:-?(?:t|type):[\w-]+|(?:mv|cmc)(?:=|<=|>=|<|>)\d+)/gi)||[];
 if(!terms.length||terms.join(' ').toLowerCase()!==expression)return null;
 const checks=[];
 for(const term of terms){
  const t=term.match(/^(-?)(?:t|type):([\w-]+)$/i);
  if(t){const kind=t[2].toLowerCase();if(!types.has(kind)&&!subtypes.has(kind))return null;checks.push(c=>t[1]? !matchType(c,kind):matchType(c,kind));continue;}
  const m=term.match(/^(?:mv|cmc)(<=|>=|=|<|>)(\d+)$/i);if(!m)return null;
  const v=Number(m[2]);checks.push(c=>{const n=manaValue(c);return m[1]==='='?n===v:m[1]==='<='?n<=v:m[1]==='>='?n>=v:m[1]==='<'?n<v:n>v;});
 }
 return c=>checks.every(check=>check(c));
}
export function templatePredicate(req){
 const named=parseTemplateName(req?.name);
 const hasQuery=!!String(req?.scryfallQuery||'').trim();
 const queried=hasQuery?parseTemplateQuery(req.scryfallQuery):null;
 if((!named&&!queried)||(hasQuery&&!queried))return null;
 return card=>(!named||named(card))&&(!queried||queried(card));
}
/** Match each template occurrence to a distinct deck card, respecting quantities.
 * Named combo cards are reserved and cannot also fill a wildcard slot.
 * Returns unresolved (not unsatisfied) for predicates we cannot parse. */
export function satisfyTemplates(requirements,cards,{reservedIds=new Set(),idOf=c=>c.oracle_id||c.id||c.name}={}){
 const slots=[];const unresolved=[];
 for(const req of requirements||[]){
  const quantity=Number(req.quantity??1);
  const pred=templatePredicate(req);
  if(!pred||!Number.isInteger(quantity)||quantity<1||quantity>10){unresolved.push(req.name);continue;}
  for(let i=0;i<quantity;i++)slots.push({req,pred});
 }
 if(unresolved.length)return {satisfied:false,unresolved,matched:[],missing:slots.map(x=>x.req.name)};
 const taken=new Set(reservedIds),chosen=[];
 // Most restrictive first, then a deterministic stable card selection.
 const sorted=slots.map(s=>({...s,options:cards.filter(c=>!reservedIds.has(idOf(c))&&s.pred(c)).sort((a,b)=>a.name.localeCompare(b.name))})).sort((a,b)=>a.options.length-b.options.length||a.req.name.localeCompare(b.req.name));
 function search(i){if(i===sorted.length)return true;
  for(const c of sorted[i].options){const id=idOf(c);if(taken.has(id))continue;taken.add(id);chosen[i]=c;if(search(i+1))return true;taken.delete(id);}
  return false;
 }
 const satisfied=search(0);
 return {satisfied,unresolved:[],matched:satisfied?chosen.map(c=>c.name):[],missing:satisfied?[]:sorted.map(s=>s.req.name)};
}
