/** Actual browser/UI over a real disposable server/catalog. Generation replies
 * are controlled around an independently audited real API deck, separately
 * tested live; these clicks do not measure a new deck at the regenerated cap.
 * PLAYWRIGHT_MODULE=... CHROMIUM_PATH=... node ... BASE API_DECK OUTPUT */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const[base,file,out]=process.argv.slice(2),actual=JSON.parse(await readFile(file)),{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']}),errors=[],bodies=[],checks=[];
try{
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**',route=>route.abort());
 await page.route('**/api/generate',async route=>{const p=route.request().postDataJSON();bodies.push(p);assert.equal(p.autoResearch,false);assert.equal(p.budgetTolerance,4);assert.equal(p.basicLandsOwned,true);
  const max=p.budget+4;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...actual,budget:max,budgetPolicy:{...actual.budgetPolicy,target:p.budget,effectiveMaximum:max,unused:Math.round((max-actual.price)*100)/100,overTarget:Math.round(Math.max(0,actual.price-p.budget)*100)/100}})});
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});assert.equal(await page.locator('#research-on-generate').isChecked(),true);assert.equal(await page.locator('#budget-leeway').isChecked(),false);assert.equal(await page.locator('#basics-owned').isChecked(),true);
 await page.locator('#research-on-generate').uncheck();await page.locator('#budget-leeway').check();await page.locator('#budget').fill('160');await page.locator('#search').fill('Wilhelt');await page.locator('.search-item').first().click();await page.locator('#generate').click();await page.waitForFunction(()=>!document.getElementById('deck-result').hidden);
 const panel=page.locator('#why-this-deck');await panel.locator('..').locator('summary').first().click();assert.match(await panel.textContent(),/hard maximum €164.00/);assert.match(await panel.textContent(),/Requires:/);assert.match(await panel.textContent(),/provisional/i);checks.push('Actual Why this deck panel renders real named support, prerequisites, uncertainty and explicit 160+4 maximum');
 assert.ok((await panel.locator('textarea').count())>=1);for(const text of await panel.locator('textarea').evaluateAll(nodes=>nodes.map(n=>n.value)))assert.equal(text.split('\n').length,100);checks.push('Complete alternative exports contain 100 lines');
 await panel.locator('details').first().locator('summary').click();
 await panel.getByRole('button',{name:'Copy this complete deck'}).first().click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).split('\n').length,100);checks.push('Alternative clipboard copies its complete list');
 await page.locator('#actual-cart').fill('140');await page.locator('#extra-budget').fill('30');assert.match(await page.locator('#budget-preview').textContent(),/hard maximum €194.00/);await page.locator('#regenerate-extra').click();await page.waitForFunction(()=>!document.getElementById('previous-deck').hidden);
 assert.equal(bodies[1].budget,190);assert.equal(bodies[1].budgetTolerance,4);assert.match(await page.locator('#comparison-result').textContent(),/tolerance €4.00 once/);assert.equal((await page.locator('#previous-deck-text').inputValue()).split('\n').length,100);checks.push('Regeneration adds 30 to original 160 target, tolerance once; previous deck and actual-cart reference preserved');
 assert.deepEqual(errors,[]);await writeFile(out,JSON.stringify({browser:'Chromium/Playwright',realServerCatalogSearch:true,controlledAuditedDeckResponses:true,externalBrowserRequestsBlocked:true,requests:bodies.map(p=>({budget:p.budget,budgetTolerance:p.budgetTolerance,basicLandsOwned:p.basicLandsOwned})),checks,pageErrors:errors,limitations:'UI fixtures reuse an actual separately generated/audited API deck. Regeneration UI test is not a fresh quality or generation measurement at 194 EUR. Native Windows untested.'},null,2)+'\n');console.log(checks);
}finally{await browser.close();}
