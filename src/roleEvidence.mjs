/** v0.8.11 — evidence-led card roles. A potential effect is not a guaranteed
 * source of advantage. Classification is intentionally conservative, offline,
 * and general across commanders. No hardcoded card names or decklists. */
import {castFaces,castHasType,isLandSlot} from './cards.mjs';

export const oracleText=c=>castFaces(c).map(f=>f.oracle_text||c.oracle_text||'').join('\n');
export const spellIs=(c,type)=>castHasType(c,type);
const val=c=>Number(c.cmc)||0;

export function roleEvidence(c){
 if(isLandSlot(c))return {draw:'none',removal:'none',shield:'none',reason:[]};
 const t=oracleText(c),cmc=val(c),reason=[];
 const instant=spellIs(c,'Instant');
 const positive=/\bdraw (?:two|three|four|five|six|[2-9]|x|that many) cards?\b/i.test(t);
 const discard=/\b(?:then )?(?:discard|put) (?:two|three|four|[2-9]) cards?\b/i.test(t);
 const replaces=/\bdraw (?:a|one|1) card\b/i.test(t);
 const reusable=/\b(?:whenever|at the beginning of|each time)\b[^.\n]{0,180}\bdraw\b/i.test(t)||/:\s*draw (?:a|one|two) card/i.test(t);
 const restricted=/\b(?:only if|if you|unless|whenever an opponent|whenever a player|whenever you cycle|whenever you cast or copy an instant or sorcery|whenever you cast an instant or sorcery)\b/i.test(t);
 const costly=/\{[4-9]\}[^\n.]*:\s*draw/i.test(t)||cmc>=6;
 let draw='none';
 if(positive&&!discard&&!costly&&!restricted)draw='positive';
 else if(reusable)draw='engine-conditional';
 else if(positive||replaces)draw='cantrip-or-conditional';
 if(draw==='engine-conditional')reason.push('draw requires repeatable trigger/activation conditions');
 if(draw==='cantrip-or-conditional')reason.push('card text does not establish positive card advantage');
 // Removal distinguishes broad unconditional targets from narrow board states.
 const counter=/\bcounter (?:target|all|each)\b/i.test(t);
 const broad=/\b(?:exile|destroy) target (?:nonland )?(?:permanent|creature|planeswalker)\b|return target (?:nonland )?permanent to its owner's hand/i.test(t);
 const narrower=/\b(?:exile|destroy) target (?:artifact|enchantment|attacking creature|tapped creature|creature with|noncreature)\b/i.test(t);
 const mass=/\b(?:destroy|exile) (?:all|each) creatures\b/i.test(t);
 const counterBroad=/\bcounter target spell\b/i.test(t)&&!/\bunless\b/i.test(t);
 let removal=mass||broad||counterBroad?'broad':narrower||counter?'conditional':'none';
 if(removal==='conditional')reason.push('answer has a targeting or payment restriction');
 const protection=/(?:target|equipped|enchanted|creatures you control|permanents you control)[^.\n]{0,140}(?:hexproof|indestructible|protection from|phases? out|shroud)/i.test(t);
 const selfOnly=/\b(?:this creature|~|itself) (?:has|gains|gets)\b/i.test(t)&&!protection;
 const shield=protection&&(instant||spellIs(c,'Equipment')||cmc<=4)?'dedicated':counterBroad&&instant?'counterspell':'none';
 if(selfOnly)reason.push('self-protection is not commander shielding');
 return {draw,removal,shield,reason,cmc};
}

/** Whole-deck evidence: dependency status and strict role tallies.
 * The audit does NOT certify how often conditions resolve in gameplay. */
export function dependencyEvidence(c,cards){
 const t=oracleText(c),spells=cards.filter(x=>!isLandSlot(x)),issues=[];
 const cyclePayoff=/\bwhenever (?:you cycle|a player cycles|you discard a card)\b/i.test(t);
 if(cyclePayoff){const n=spells.filter(x=>x!==c&&/\bcycling\b/i.test(oracleText(x))).length;
  if(n<6)issues.push(`cycling/discard payoff has only ${n} cycling cards`);}
 const instantPayoff=/\bwhenever you cast or copy an instant or sorcery|\bwhenever you cast an instant or sorcery|\bwhenever you cast or copy (?:an? )?(?:instant|sorcery)/i.test(t);
 if(instantPayoff){const n=spells.filter(x=>x!==c&&(spellIs(x,'Instant')||spellIs(x,'Sorcery'))).length;
  if(n<16)issues.push(`spell-cast payoff has ${n} instant/sorcery spells; repeated activation unproven`);}
 const artifactPayoff=/\bwhenever (?:an?|another) artifact (?:enters|you control)|for each artifact you control\b/i.test(t);
 if(artifactPayoff){const n=spells.filter(x=>x!==c&&spellIs(x,'Artifact')).length;
  if(n<10)issues.push(`artifact payoff has only ${n} supporting artifacts`);}
 // Modal/spend-condition mana is not treated as independently spendable.
 const granted=/\bspend this mana only|\bthis mana can't be spent to cast nonartifact/i.test(t);
 if(granted&&/(?:Add|add)\b[^.\n]*\{[WUBRGC]\}/.test(t))issues.push('mana spending restrictions require a separate casting audit');
 return issues;
}

export function evidenceAudit(cards){
 const spells=cards.filter(c=>!isLandSlot(c));
 const rows=spells.map(c=>({card:c.name,role:roleEvidence(c),issues:dependencyEvidence(c,cards)}));
 const counts={positiveDraw:rows.filter(r=>r.role.draw==='positive').length,
  conditionalDraw:rows.filter(r=>r.role.draw==='engine-conditional').length,
  cantrips:rows.filter(r=>r.role.draw==='cantrip-or-conditional').length,
  broadAnswers:rows.filter(r=>r.role.removal==='broad').length,
  conditionalAnswers:rows.filter(r=>r.role.removal==='conditional').length,
  dedicatedShields:rows.filter(r=>r.role.shield==='dedicated').length};
 const unsupported=rows.filter(r=>r.issues.length).map(r=>({card:r.card,reasons:r.issues}));
 return {counts,unsupported,method:'Conservative evidence classes; conditional triggers do not count as guaranteed value; no game simulation'};
}
