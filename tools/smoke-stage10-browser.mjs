/** Optional development check; Playwright is not an application dependency.
 * PLAYWRIGHT_MODULE=/installed/playwright/index.mjs node tools/smoke-stage10-browser.mjs BASE ACTUAL_RESPONSE OUTPUT
 * Browser responses below are controlled fixtures, not live research claims. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const[base,input,output]=process.argv.slice(2),{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const actual=JSON.parse(await readFile(input)),browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[],errors=[];let requests=0;
try{
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**',route=>route.abort());
 await page.route('**/api/generate',async route=>{
  const body=route.request().postDataJSON();assert.equal(body.autoResearch,true);assert.equal(body.budget,191);requests++;
  const automaticResearch={matchingSaved:0,discovery:{status:'completed',added:0,unknownBracket:12,cacheAgeMs:0,structuralExamples:[]},commanderLookup:{status:requests===1?'checked':'cached-fallback',variants:80,total:null,truncated:true,fromCache:requests!==1,stale:requests!==1,cacheAgeMs:requests===1?0:86400000,fetchedAt:'2026-10-23T23:00:00.000Z'},colorLookup:{status:'unavailable',variants:null,total:null,error:'Controlled offline fixture'},combos:{status:'no-source'},scryfall:{status:'local-catalog',records:32197}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...actual,automaticResearch})});
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#search').fill('Wilhelt');await page.locator('.search-item').first().click();await page.locator('#generate').click();
 await page.waitForFunction(()=>document.getElementById('checks').textContent.includes('80 retrieved'));
 let text=await page.locator('#checks').textContent();for(const term of ['Commander-containing Spellbook','Other color-compatible','80 retrieved','total unknown','no source deck checked','not executable'])assert.ok(text.includes(term),term);
 assert.equal((await page.locator('#deck-text').inputValue()).trim().split('\n').length,100);checks.push('Default Research & Generate exposes independent candidates with zero Archidekt sources');
 await page.locator('#copy-archidekt').click();const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(copied.trim().split('\n').length,100);assert.ok(copied.split('\n')[0].includes('[Commander]'));checks.push('100-card Archidekt clipboard export identifies commander');
 await page.locator('#generate').click();await page.waitForFunction(()=>document.getElementById('checks').textContent.includes('stale fallback'));text=await page.locator('#checks').textContent();assert.ok(text.includes('1440 min old'));checks.push('Stale cache date/age and independent unavailable channel remain visible');
 assert.equal(errors.length,0);
 await writeFile(output,JSON.stringify({browser:'Chromium headless with Playwright',controlledGenerationResponses:true,externalNetworkBlockedInBrowser:true,serverCatalogAndSearch:'real disposable-cache server',checks,pageErrors:errors,requests,limitations:'Generation responses are explicitly controlled research fixtures wrapped around an actual audited API deck. Separate HTTP test covers real local generation. Native Windows BAT not executed.'},null,2)+'\n');
 console.log(checks);
}finally{await browser.close();}
