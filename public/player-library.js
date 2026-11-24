import {deckTxtFilename} from './deck-filename.js';
import {localPost} from './local-api.js';
const $=id=>document.getElementById(id);
const panel=document.createElement('details');
panel.className='panel player-library';
panel.id='player-library';
panel.innerHTML=`<summary><strong>Deck library &amp; practice</strong></summary>
<p>Save a starting list, branch from a version, and compare changes. Versions and your collection stay on this computer.</p>
<label>Saved version<select id="pl-versions"></select></label>
<button id="pl-open">Open version</button> <button id="pl-new">Start a separate deck</button>
<p id="pl-parent"></p>
<label>Version name<input id="pl-name" maxlength="120" placeholder="e.g. Trostani · more token makers"></label>
<label>Working decklist<textarea id="pl-text" rows="6" placeholder="Paste 100 cards. Mark the commander with *CMDR*."></textarea></label>
<div class="field-row"><label>Target bracket<select id="pl-bracket"><option>2</option><option selected>3</option><option>4</option><option>5</option></select></label>
<label>Upgrade budget remaining (€)<input id="pl-budget" type="number" value="40" min="0" step="0.01"></label>
<label>Price source<select id="pl-prices"><option value="scryfall_eur">Scryfall EUR</option><option value="estimated_en_nm">Modeled English NM</option><option value="cardmarket_en_nm">Imported Cardmarket offers</option></select></label></div>
<label><input type="checkbox" id="pl-basics" checked> Assume basic lands are already owned</label>
<label>Locked card names (one per line)<textarea id="pl-locks" rows="2"></textarea></label>
<button id="pl-save">Save version</button> <button id="pl-upgrade">Open in Upgrader</button>
<button id="pl-inspect">Check bracket &amp; purchase cost</button>
<button id="pl-archidekt">Export Archidekt TXT</button> <button id="pl-mox">Export Moxfield TXT</button>
<div id="pl-review"></div>
<h3>Compare versions</h3><label>Compare working list against<select id="pl-before"></select></label>
<button id="pl-compare">Show cuts &amp; additions</button><div id="pl-diff"></div>
<details><summary>Practice opening hands</summary>
<label>Shuffle seed<input id="pl-seed" value="opening-1" maxlength="100"></label>
<button id="pl-draw">Draw seven</button> <button id="pl-replay">Replay this seed on comparison version</button>
<div id="pl-hand"></div></details>
<details><summary>My collection</summary>
<label><input id="pl-enabled" type="checkbox"> Use available copies for generation, budget search and upgrades</label>
<label>Collection CSV file<input type="file" accept=".csv,text/csv" id="pl-file"></label>
<label>Or paste CSV<textarea id="pl-csv" rows="3" placeholder="Name,Quantity,Reserved"></textarea></label>
<button id="pl-import">Replace collection from CSV</button>
<p id="pl-stock"></p><label>Filter owned cards<input id="pl-filter" type="search"></label>
<label>Card<select id="pl-card"></select></label><label>Copies reserved for other decks<input id="pl-reserved" type="number" min="0" step="1"></label>
<button id="pl-reserve">Save reservation</button></details>
<p id="pl-status" role="status"></p>`;
$('architect-main').after(panel);
const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
const euro=value=>value==null?'Unpriced':'€'+value.toFixed(2);
const status=text=>{$('pl-status').textContent=text;};
let parent=null,commanderId=null,collection={enabled:false,rows:[]},versions=[],working=false;
async function post(action,p={}){
  const response=await localPost('/api/player/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Request failed.');return result;
}
function command(id,fn){
  $(id).onclick=()=>run(fn);
}
async function run(fn){
  if(working)return;
  working=true;
  // Keep selections stable while a server operation is outstanding.
  panel.inert=true;
  try{await fn();}catch(e){status(e.message);}finally{panel.inert=false;working=false;}
}
const locks=()=>$('pl-locks').value.split('\n').map(s=>s.trim()).filter(Boolean);
function inputs(){return {parentId:parent?.id,text:$('pl-text').value,commanderId,bracket:Number($('pl-bracket').value),
  budget:Number($('pl-budget').value),pricingMode:$('pl-prices').value,ownedBasics:$('pl-basics').checked,locked:locks()};}
function clearReports(){
  for(const id of ['pl-review','pl-hand','pl-diff'])$(id).replaceChildren();
}
function describeParent(){
  $('pl-budget').readOnly=!!parent;
  $('pl-parent').textContent=parent?'Branching from '+parent.name+' · '+euro(parent.remaining)+' remaining':'New deck · the starting list is already owned for incremental upgrade budgeting.';
}
function fill(entry){
  parent=entry.parent||null;commanderId=entry.commanderId||null;
  $('pl-text').value=entry.text||'';$('pl-name').value=entry.name||'';
  $('pl-budget').value=parent?.remaining??entry.budget??40;$('pl-bracket').value=entry.bracket||3;
  $('pl-prices').value=entry.pricingMode||'scryfall_eur';$('pl-basics').checked=entry.ownedBasics!==false;
  $('pl-locks').value=(entry.locked||[]).join('\n');describeParent();clearReports();status('');
}
function versionOptions(selected){
  for(const id of ['pl-versions','pl-before']){
    const select=$(id),prior=selected||select.value;
    select.replaceChildren(...versions.slice().reverse().map(v=>new Option(v.name+' · '+v.commander+' · '+new Date(v.created).toLocaleString(),v.id)));
    if(versions.some(v=>v.id===prior))select.value=prior;
  }
}
function showStock(){
  $('pl-enabled').checked=collection.enabled;
  $('pl-stock').textContent=collection.rows.length+' distinct cards · '+(collection.enabled?'Available copies count toward purchase budgets.':'Collection credits are off.');
  const q=$('pl-filter').value.toLowerCase(),select=$('pl-card'),id=select.value;
  const rows=collection.rows.filter(r=>r.name.toLowerCase().includes(q)).slice(0,200);
  select.replaceChildren(...rows.map(r=>new Option(r.name+' · '+(r.quantity-r.reserved)+' available of '+r.quantity,r.id)));
  if(rows.some(r=>r.id===id))select.value=id;
  showReserved();
}
function showReserved(){const r=collection.rows.find(r=>r.id===$('pl-card').value);$('pl-reserved').value=r?.reserved??0;$('pl-reserved').max=r?.quantity??0;}
async function refresh(){
  const s=await post('state');versions=s.versions;collection=s.collection;versionOptions();showStock();
}
function confirmReplace(){return !$('pl-text').value.trim()||window.confirm('Replace the working list? Saved versions stay in the library.');}
panel.ontoggle=()=>{if(panel.open)run(refresh);};
command('pl-open',async()=>{
  if(!$('pl-versions').value)throw Error('Choose a saved version.');
  if(!confirmReplace())return;
  const v=await post('version',{id:$('pl-versions').value});fill({...v,parent:v});$('pl-before').value=v.id;
});
command('pl-new',()=>{if(confirmReplace())fill({});});
command('pl-save',async()=>{
  const entry=await post('save',{...inputs(),name:$('pl-name').value,parentId:parent?.id});
  const old=parent;versions.push(entry);fill({...entry,parent:entry});versionOptions(entry.id);$('pl-before').value=old?.id||entry.id;
  status('Saved '+entry.name+' · '+euro(entry.spent)+' in additions · '+euro(entry.remaining)+' remaining.');
});
command('pl-upgrade',()=>{
  if(!$('pl-text').value.trim())throw Error('Open or paste a deck first.');
  window.dispatchEvent(new CustomEvent('library-upgrade',{detail:{...inputs(),parent}}));
});

function showDiff(box,diff){
  box.replaceChildren(node('p','Estimated new purchases '+euro(diff.purchase.cost)+' · Average nonland mana value change '+diff.curveDelta.toFixed(2)));
  if(diff.purchase.missing.length)box.append(node('p','Unpriced additions: '+diff.purchase.missing.join(', ')));
  const columns=document.createElement('div');columns.className='pl-columns';
  for(const [title,sign] of [['Cuts',-1],['Additions',1]]){
    const col=node('section','');col.append(node('h4',title));
    const changes=diff.changes.filter(c=>Math.sign(c.delta)===sign).sort((a,b)=>a.roles[0].localeCompare(b.roles[0])||a.name.localeCompare(b.name));
    if(!changes.length)col.append(node('p','None'));
    let prior='';
    for(const c of changes){
      if(prior!==c.roles[0]){col.append(node('h5',c.roles[0]));prior=c.roles[0];}
      const detail=document.createElement('details');detail.append(node('summary',Math.abs(c.delta)+' × '+c.name+' · '+euro(c.unitPrice)+(c.owned?' · '+c.owned+' owned':'')));
      detail.append(node('p',c.text||'Oracle text unavailable.'));
      for(const reason of c.reasons)detail.append(node('p',reason));
      if(c.paths.length)detail.append(node('p','Win paths using this card: '+c.paths.join(' · ')));
      col.append(detail);
    }
    columns.append(col);
  }
  box.append(columns,node('p','Win paths gained: '+(diff.gained.join(' · ')||'None detected')),node('p','Win paths lost: '+(diff.lost.join(' · ')||'None detected')));
}
command('pl-compare',async()=>{
  const beforeId=$('pl-before').value;if(!beforeId)throw Error('Save a version to compare against.');
  showDiff($('pl-diff'),await post('compare',{...inputs(),beforeId}));
});
command('pl-inspect',async()=>{
  const p=inputs(),v=await post('inspect',p),box=$('pl-review');
  box.replaceChildren(node('h3','Bracket '+v.bracket+' review'),node('p','Game Changers: '+(v.gameChangers.join(', ')||'None detected')+' · Allowance: '+(v.allowance??'unrestricted')),
    node('p','Game Changers above allowance: '+v.excess+' · Matched infinite lines flagged by local policy: '+v.conflicts.length),
    node('p','Estimated cost to complete from your collection: '+euro(v.purchase.cost)+(v.purchase.missing.length?' · Unpriced: '+v.purchase.missing.join(', '):'')));
  for(const line of v.conflicts)box.append(node('p',line.cards.join(' + ')+' · Spellbook '+line.id));
  box.append(node('small','Catalog '+(v.asOf?.slice(0,10)||'date unavailable')+' · '+v.coverage+'. Local bracket rules. Win turn: Not modeled.'));
  if(v.excess||v.conflicts.length){
    const preview=node('button','Preview a bracket swap');box.append(preview);
    preview.onclick=()=>run(async()=>{
      const {proposal:s}=await post('preview',p);preview.remove();
      if(!s){box.append(node('p','No supported replacement found within the budget and locks.'));return;}
      box.append(node('h4',s.cut+' → '+s.add),node('p','After swap: '+s.excess+' excess Game Changers · '+s.conflicts+' flagged combo lines.'));
      const diff=document.createElement('div');showDiff(diff,s.diff);box.append(diff);
      const apply=node('button',parent?'Apply swap to working list':'Save baseline and apply swap');box.append(apply);
      apply.onclick=()=>run(async()=>{
        if(!parent){
          const baseline=await post('save',{...inputs(),name:$('pl-name').value.trim()||'Before bracket swap'});
          versions.push(baseline);parent=baseline;versionOptions(baseline.id);describeParent();
        }
        $('pl-text').value=s.text;clearReports();status('Working list updated. Save a version to record the change.');
      });
    });
  }
});
async function download(format){
  const v=await post('inspect',inputs()),url=URL.createObjectURL(new Blob([format==='Archidekt'?v.archidekt:v.text],{type:'text/plain'}));
  const a=document.createElement('a');a.href=url;a.download=deckTxtFilename(v.text,v.bracket);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
command('pl-archidekt',()=>download('Archidekt'));command('pl-mox',()=>download('Moxfield'));
$('pl-filter').oninput=showStock;$('pl-card').onchange=showReserved;
async function stockChange(p){
  try{collection=await post('collection',{enabled:$('pl-enabled').checked,...p});clearReports();status('Collection saved for future calculations.');}
  finally{showStock();}
}
$('pl-enabled').onchange=()=>run(()=>stockChange({}));
command('pl-import',async()=>{
  const file=$('pl-file').files[0];if(file&&file.size>5000000)throw Error('File exceeds 5 MB.');
  const csv=file?await file.text():$('pl-csv').value;
  if(collection.rows.length&&!window.confirm('Replace the saved collection and reservations with this CSV?'))return;
  await stockChange({csv});
});
command('pl-reserve',()=>stockChange({reserveId:$('pl-card').value,reserved:Number($('pl-reserved').value)}));
let practice;
async function startHand(replay){
  const p=inputs();
  if(replay){
    if(!$('pl-before').value)throw Error('Select a saved comparison version.');
    const v=await post('version',{id:$('pl-before').value});
    practice={p:{...p,text:v.text,commanderId:v.commanderId,referenceText:p.text,referenceCommanderId:p.commanderId},label:v.name};
  }else practice={p,label:'Working list'};
  Object.assign(practice,{seed:$('pl-seed').value,attempt:0,bottom:null,choices:[],casts:[],turn:0});
  await hand();
}
async function hand(){
  const h=practice;
  const data=await post('hand',{...h.p,seed:h.seed,attempt:h.attempt,bottomIds:h.bottom,landChoices:h.choices,firstCasts:h.casts});
  const box=$('pl-hand'),pay=Math.max(0,h.attempt-1);
  box.replaceChildren(node('h4',h.label+' · '+h.seed),node('p','Random seven before mulligans: '+(100*data.landOdds).toFixed(1)+'% to see a land · '+(100*data.rampOdds).toFixed(1)+'% to see recognized ramp.'));
  function button(label,fn){const b=node('button',label);b.onclick=()=>run(fn);box.append(b);return b;}
  if(!h.turn){
    box.append(node('p','Mulligans taken: '+h.attempt+(pay?' · Select '+pay+' to put on the bottom.':' · Keep seven.')));
    const checks=[];
    for(const card of data.opening){
      const label=node('label','');if(pay){const check=document.createElement('input');check.type='checkbox';check.value=card.id;checks.push(check);label.append(check);}
      label.append(document.createTextNode(card.name));box.append(label);
    }
    button('Keep this hand',async()=>{
      const selected=checks.filter(c=>c.checked).map(c=>c.value);
      if(selected.length!==pay)throw Error('Choose exactly '+pay+' to bottom.');
      h.bottom=selected;h.turn=1;await hand();
    });
    if(h.attempt<3)button(h.attempt===0?'Take free mulligan':'Mulligan again',async()=>{h.attempt++;await hand();});
    return;
  }
  box.append(node('p','Kept: '+data.opening.filter(c=>!data.bottomed.includes(c.id)).map(c=>c.name).join(' · ')));
  box.append(node('p','Chance to see four land slots by turn four from this keep: '+(100*data.fourthLandOdds).toFixed(1)+'% with normal multiplayer draws.'));
  for(const turn of data.turns.slice(0,h.turn)){
    box.append(node('h4','Turn '+turn.turn));
    if(turn.lands.length){
      const select=document.createElement('select'),label=node('label','Land to play');
      select.replaceChildren(...turn.lands.map(c=>new Option(c.name,c.id)));select.value=h.choices[turn.turn-1]||turn.lands[0].id;
      select.onchange=()=>run(async()=>{h.choices=h.choices.slice(0,turn.turn-1);h.casts=h.casts.slice(0,turn.turn-1);h.choices[turn.turn-1]=select.value;h.turn=turn.turn;await hand();});
      label.append(select);box.append(label);
    }
    if(turn.casts.length){
      const label=node('label','First spell'),select=document.createElement('select');
      select.replaceChildren(new Option('Simulator choice',''),...turn.casts.map(c=>new Option(c.name,c.id)),new Option('Hold spells this turn','pass'));
      select.value=h.casts[turn.turn-1]||'';
      select.onchange=()=>run(async()=>{h.casts=h.casts.slice(0,turn.turn-1);h.casts[turn.turn-1]=select.value;h.choices=h.choices.slice(0,turn.turn);h.turn=turn.turn;await hand();});
      label.append(select);box.append(label);
    }
    box.append(node('p',turn.events.map(e=>e.kind+' '+(e.card||'')).join(' · ')));
  }
  if(h.turn<4)button('Play next turn',async()=>{h.turn++;await hand();});
  box.append(node('small','Multiplayer draw steps. Choose a land and first spell. The simulator sequences remaining supported casts. Combat, opponents and triggered effects: Not modeled.'));
}
command('pl-draw',()=>startHand(false));command('pl-replay',()=>startHand(true));
for(const id of ['pl-text','pl-budget','pl-bracket','pl-prices','pl-basics','pl-locks','pl-before','pl-seed']){
  $(id).addEventListener('input',()=>{if(id==='pl-text')commanderId=null;clearReports();});
}
window.addEventListener('player-deck',event=>{
  if(working||!event.detail?.text||!confirmReplace())return;
  fill(event.detail);panel.open=true;panel.scrollIntoView();
});
describeParent();
