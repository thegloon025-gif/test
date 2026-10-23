/** Exact structural compression only: adjacent ability payloads are shared;
 * every identity/copy parent remains distinct. No loop or value inference. */
export class CompactNativeStack {
  #groups=[];
  #cards=new WeakMap();
  #cardSerial=0;
  length=0;
  get storageSize(){return this.#groups.length;}
  key(item){
    if(item.kind==='ability')return JSON.stringify([item.kind,item.source.id,item.sourceZone,item.effect,item.cause?.id,item.phase]);
    if(item.kind==='spell'&&item.copyOf){if(!this.#cards.has(item.slot.card))this.#cards.set(item.slot.card,this.#cardSerial++);return 'spell:'+this.#cards.get(item.slot.card);}
    return null;
  }
  canMerge(item){const k=this.key(item);return k!==null&&this.#groups.at(-1)?.key===k;}
  materialize(g,identity){const {slotId,...rest}=identity;return {...g.payload,...rest,...(g.payload.kind==='spell'?{slot:{...g.payload.slot,id:slotId}}:{})};}

  push(item){
    const key=this.key(item),last=this.#groups.at(-1);
    if(key!==null&&last?.key===key)last.ids.push({id:item.id,copyOf:item.copyOf,...(item.kind==='spell'?{slotId:item.slot.id}:{})});
    else if(key!==null){const {id,copyOf,...payload}=item;this.#groups.push({key,payload,ids:[{id,copyOf,...(item.kind==='spell'?{slotId:item.slot.id}:{})}]});}
    else this.#groups.push({key:null,item});
    this.length++;
  }
  pop(){const g=this.#groups.at(-1);if(!g)return undefined;this.length--;if(g.key===null){this.#groups.pop();return g.item;}
    const identity=g.ids.pop();if(!g.ids.length)this.#groups.pop();return this.materialize(g,identity);
  }
  toArray(){return this.#groups.flatMap(g=>g.key===null?[g.item]:g.ids.map(identity=>this.materialize(g,identity)));}
  slice(){return this.toArray();}
  map(fn){return this.toArray().map(fn);}
  filter(fn){return this.toArray().filter(fn);}
  find(fn){for(const g of this.#groups){if(g.key===null){if(fn(g.item))return g.item;}else for(const identity of g.ids){const item=this.materialize(g,identity);if(fn(item))return item;}}}
  topGroup(){const g=this.#groups.at(-1);return g?.key!==null&&g?{item:this.materialize(g,g.ids.at(-1)),count:g.ids.length}:null;}
}
/** A safe overestimate, not a payment planner: ignores activation fees and
 * mutually exclusive output colors. If even this bound is <2, C C is impossible.
 * Each supported source is usable at most once in this bounded mana model. */
export function colorlessUpperBound(state){
  let n=state.pool.filter(u=>u.type==='C').length;
  for(const s of state.sources){if(s.consumed)continue;let best=0;
    for(const m of s.modes){if(m.tap&&(s.tapped||s.sick))continue;
      best=Math.max(best,...m.outputs.map(o=>o.filter(c=>c==='C').length));
    }n+=best;
  }return n;
}
