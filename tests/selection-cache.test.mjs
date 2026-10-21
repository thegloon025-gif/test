import test from 'node:test';
import assert from 'node:assert/strict';
import {createSelectionLimitChecker,fitsSelectionLimits} from '../src/selectionPolicy.mjs';
const c=(name,type_line,oracle_text='')=>({name,type_line,oracle_text});
const counter=c('Counter','Instant','Counter target spell.');
const narrow=c('Narrow','Instant','Counter target creature spell.');
const creature=c('Creature','Creature — Human');
const land=c('Island','Basic Land — Island');
const limits={maxInstants:2,maxCounters:1,maxNarrow:1};
test('request-scoped selection cache matches existing gates after append, replace, removal and duplicate references',()=>{
 const check=createSelectionLimitChecker(),chosen=[land,creature];
 const verify=()=>{for(const next of [counter,narrow,creature,land])for(const replaces of [null,...chosen])
  assert.equal(check(next,chosen,limits,replaces),fitsSelectionLimits(next,chosen,limits,replaces));};
 verify();chosen.push(counter);verify();chosen[2]=narrow;verify();chosen.splice(0,1);verify();
 chosen.push(narrow);verify();chosen.pop();verify();
});
