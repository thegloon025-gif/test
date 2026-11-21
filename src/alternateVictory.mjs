import {castFaces,isBasic,oracleId} from './cards.mjs';

const emptyLibrary=/your library has no cards in it|no cards in your library|(?:greater than or equal to|at least) the number of cards in your library/i;
const lifeThreshold=/you have (\d+) or more life/i;
const treasureThreshold=/you control (\w+) or more Treasures/i;

// Evidence for reaching the printed condition. Keep the actual draw or
// intervening-if trigger conditional even when the deck contains an enabler.
export function alternateVictoryPaths(route,text,card,deck,published){
 const all=[deck.commander,...deck.cards];
 const library=emptyLibrary.test(text),life=text.match(lifeThreshold),treasures=text.match(treasureThreshold);
 const paths=[];
 const add=(pieces,setup,note)=>{
  const cards=[...new Set([...route.cards,...pieces])];
  paths.push({...route,cards,setup:[...new Set([...route.setup,...setup])],
   name:route.name+(cards.length>1?' via '+cards.filter(n=>n!==card.name).join(' + '):''),
   prerequisites:[...route.prerequisites,note],family:'alternate victory:'+card.name,
   guidanceNote:note});
 };
 const outcome=library?/^(?:infinite self-mill|draw your (?:entire )?(?:deck|library)|infinite card draw)\.?$/i:
   life?/^infinite (?:life ?gain|life)\.?$/i:treasures?/^infinite Treasure tokens\.?$/i:null;
 for(const v of published){
  if(v.classification==='INCOMPLETE'||v.family?.startsWith('conversion:')||!v.steps.length)continue;
  const lethal=v.cards.includes(card.name)&&v.results?.some(r=>/^(?:you )?win the game\b/i.test(r));
  if(lethal||outcome&&v.results?.some(r=>outcome.test(r))){
   // The published win already has its own entry. Use only verified
   // inventory, starting state and steps as supporting evidence.
   const note='Meet the recorded setup for '+v.name+' and follow its published steps before resolving the printed win condition.';
   add(v.cards,v.setup,note);
   Object.assign(paths.at(-1),{prerequisites:[...paths.at(-1).prerequisites,...v.prerequisites],
    steps:[...v.steps,...route.steps],url:v.url,source:'Commander Spellbook and Scryfall Oracle'});
  }
 }
 const seen=new Set();
 for(const other of all){
  if(seen.has(oracleId(other)))continue;
  seen.add(oracleId(other));
  const face=castFaces(other)[0],rules=face?.oracle_text||'';
  let note;
  if(library){
   if(other.name==='Paradigm Shift'&&/exile all (?:the )?cards (?:from|in) your library/i.test(rules)&&/shuffle your graveyard into your library/i.test(rules))
    note='Resolve Paradigm Shift with an empty graveyard so shuffling it back leaves your library empty.';
   else if(/\bexile (?:all (?:the )?cards (?:from|in) your library|your (?:entire )?library)\.|\bdraw (?:a number of )?cards equal to the number of cards in your library\./i.test(rules))
    note='Use '+other.name+' to empty or nearly empty your library.';
   else if(other.name==='Demonic Consultation'&&/exile/i.test(rules)&&/name|choose a card name/i.test(rules))
    note='Resolve Demonic Consultation naming a card absent from your library to exile the library.';
   else if(other.name==='Tainted Pact'&&/same name/i.test(rules)&&new Set(deck.cards.map(c=>c.name)).size===deck.cards.length)
    note='Resolve Tainted Pact, declining each card. Confirm all remaining library cards have distinct names.';
   else if(/reveal cards from the top of your library until you reveal a basic land card/i.test(rules)&&/graveyard/i.test(rules)&&!deck.cards.some(isBasic))
    note='Activate '+other.name+' with no basic land in your library to put the library into your graveyard.';
  }else if(life&&(/each opponent loses X life\. You gain life equal to the life lost this way/i.test(rules)||
    /whenever [^.\n]*, you gain (?:\d+|that much) life\./i.test(rules))){
   note='Use '+other.name+' to build life. Verify enough resources or repeated triggers to reach '+life[1]+' life at the required time.';
  }else if(treasures&&/whenever [^.\n]*, (?:you may )?create (?:a|one|two|that many) Treasure tokens?/i.test(rules)){
   note='Use '+other.name+'’s Treasure triggers and retain at least '+treasures[1]+' Treasures through the win trigger.';
  }
  if(note){
   if(library)note+=/would draw/i.test(text)?' Keep the payoff active for the next draw attempt.':' Check the remaining library size as the win ability resolves.';
   add([other.name],other.name===card.name?[]:[other.name+' · '+(/Instant|Sorcery/.test(face.type_line)?'Hand':'Battlefield')],note);
  }
 }
 if(life&&Number(life[1])<=40)add([],[],'The multiplayer Commander starting total is 40. Retain or recover at least '+life[1]+' life through the required trigger.');
 if(/cast from your hand/i.test(text)&&/cast another spell named .+ this game/i.test(text))
  add([],[],'Cast the spell once, recover or draw it again, then cast it from hand and let the second spell resolve.');
 if(paths.length)return paths;
 const guidance=library?'First identify a way to empty your own library, such as a full-library exile effect or repeatable self-mill.':
  life?'First identify sufficient life gain to reach '+life[1]+' life at the required time.':
  treasures?'First identify enough Treasure production to retain '+treasures[1]+' Treasures through the trigger.':
  'First identify the cards and resources that can meet the printed victory condition.';
 const gap=card.name+' · '+guidance+' The current analysis could not establish that setup.';
 return [{...route,setupGap:gap,prerequisites:[...route.prerequisites,gap],guidanceNote:guidance}];
}
