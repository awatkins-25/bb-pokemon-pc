import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const files={'/':['.preview/index.html','text/html'],'/preview.js':['.preview/preview.js','application/javascript'],'/preview.css':['.preview/preview.css','text/css']};
const server=createServer((req,res)=>{const file=files[req.url];if(!file){res.writeHead(404).end();return;}res.setHeader('Content-Type',file[1]);res.end(readFileSync(file[0]));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1200,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.getByRole('heading',{name:'Make room for your next idea.'}).waitFor();
 await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0));
 mkdirSync('docs',{recursive:true});await page.screenshot({path:'docs/party-preview.png'});
 await page.getByRole('button',{name:'Complete demo step'}).click();await page.getByText('Level up!',{exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='0');
 await page.getByLabel('Collapse pet display').click();assert.equal(await page.locator('.ppc-exp-scene').isVisible(),false);await page.reload();assert.equal(await page.locator('.ppc-exp-scene').isVisible(),false);await page.screenshot({path:'docs/collapsed-preview.png'});
 await page.getByLabel('Expand pet display').click();await page.getByLabel('Pause pet animations').click();await page.reload();await page.getByLabel('Resume pet animations').waitFor();
 await page.getByRole('button',{name:'Empty party',exact:true}).click();await page.screenshot({path:'docs/empty-party.png'});
 await page.getByRole('button',{name:/Build your first agent/}).click();await page.getByLabel('Search pets').fill('Fox');await page.getByRole('button',{name:'Choose Fox'}).click();await page.getByLabel('Agent name').fill('Sentry');await page.getByLabel('Role',{exact:true}).fill('Review');await page.getByLabel('Mission').fill('Check the work and explain what still needs attention.');await page.getByLabel('Instructions & scaffolding').fill('Scope: Review code and written plans.\nWorkflow: Read the source, test assumptions, explain material issues.\nOutput: Findings with clear next steps.');await page.screenshot({path:'docs/agent-builder.png'});await page.getByRole('button',{name:'Save agent'}).click();await page.getByRole('button',{name:'Sentry: Review'}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/mobile-preview.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.ppc-walker').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);console.log('PASS: browser preview, loaded sprites, custom Gen IV agent, EXP level-up/reset, persisted collapse/pause, mobile overflow, reduced motion.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
