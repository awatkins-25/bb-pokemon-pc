import { JSDOM } from 'jsdom';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','HTMLDialogElement','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','localStorage','Node','Element','Event','MouseEvent'])Object.defineProperty(globalThis,key,{value:typeof dom.window[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?dom.window[key].bind(dom.window):dom.window[key],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
await build({entryPoints:['app.tsx','components.tsx'],outdir:'.testbuild/frontend',bundle:true,platform:'node',format:'esm',packages:'external',loader:{'.css':'empty'},jsx:'automatic'});
const React=await import('react');const {render,screen,fireEvent,waitFor,act,cleanup}=await import('@testing-library/react');
const {loadPluginApp,renderSlot}=await import('@get-bb/plugin-sdk/testing/app');
const {createFakePluginHost,makeThreadResponse}=await import('@get-bb/plugin-sdk/testing');
const {default:plugin}=await import('./dist/server.js');
const {bb,harness}=createFakePluginHost({pluginId:'pokemon-pc',sdk:{threads:{get:async()=>makeThreadResponse({id:'synthetic-chat'}),events:{list:async()=>[]}}}});await plugin(bb);
const appModule=await import('./.testbuild/frontend/app.js');const app=await loadPluginApp(()=>appModule);assert.equal(app.appOverlays.length,1);assert.equal(app.threadContextSegments.length,1);
const rpc=Object.fromEntries(['state','create_agent','update_agent','archive_agent','activity','add','set_done','set_owner','clear','restore','assign','unassign','set_pending'].map(method=>[method,input=>harness.behavior.callRpc(method,input??null)]));
const boxes=renderSlot({component:appModule.Boxes},{},{rpc,context:{threadId:'synthetic-chat',projectId:'synthetic-project'}});
await screen.findByText('Your adventure starts here.');fireEvent.click(screen.getByRole('button',{name:/Build your first agent/}));
await screen.findByRole('heading',{name:'Build an agent'});
fireEvent.change(screen.getByLabelText('Search Pokémon'),{target:{value:'Arceus'}});fireEvent.click(screen.getByRole('button',{name:'Choose Arceus'}));
fireEvent.change(screen.getByLabelText('Agent name'),{target:{value:'Demo Scout'}});fireEvent.change(screen.getByLabelText('Role',{exact:true}),{target:{value:'Research'}});fireEvent.change(screen.getByLabelText('Mission'),{target:{value:'Explore a synthetic example'}});fireEvent.change(screen.getByLabelText('Instructions & scaffolding'),{target:{value:'Use synthetic fixtures and verify findings.'}});fireEvent.click(screen.getByRole('button',{name:'Save agent'}));
await screen.findByRole('button',{name:'Demo Scout: Research'});fireEvent.click(screen.getByRole('button',{name:'Demo Scout: Research'}));fireEvent.click(await screen.findByRole('button',{name:'Make Demo Scout this chat’s lead'}));
await waitFor(async()=>assert.equal((await rpc.state()).assignments.length,1));
fireEvent.click(screen.getByLabelText('Add a To Do'));fireEvent.change(screen.getByLabelText('Task title'),{target:{value:'Review synthetic preview'}});fireEvent.click(screen.getByRole('button',{name:'Add task'}));
const completeButton=await screen.findByRole('button',{name:'Complete Review synthetic preview'});await waitFor(()=>assert.equal(completeButton.disabled,false));fireEvent.click(completeButton);await screen.findByRole('button',{name:'Reopen Review synthetic preview'});
await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Clear finished'}).disabled,false));fireEvent.click(screen.getByRole('button',{name:'Clear finished'}));await waitFor(()=>assert.ok(!screen.queryByText('Review synthetic preview')));await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Undo',exact:true}).disabled,false));fireEvent.click(screen.getByRole('button',{name:'Undo',exact:true}));await screen.findByText('Review synthetic preview');

// A task's owner can be changed from its row.
fireEvent.click(screen.getByLabelText('Add a To Do'));fireEvent.change(screen.getByLabelText('Task title'),{target:{value:'Owned synthetic task'}});fireEvent.click(screen.getByRole('button',{name:'Add task'}));
const ownerSelect=await screen.findByLabelText('Agent working on Owned synthetic task');await waitFor(()=>assert.equal(ownerSelect.disabled,false));const scout=(await rpc.state()).agents[0];
fireEvent.change(ownerSelect,{target:{value:scout.id}});await waitFor(async()=>assert.equal((await rpc.state()).tasks.find(t=>t.title==='Owned synthetic task').owner,scout.id));

// Realtime cannot silently update the revision of a draft already being edited.
fireEvent.click(screen.getByRole('button',{name:'Demo Scout: Research'}));fireEvent.click(await screen.findByRole('button',{name:'Edit agent'}));const saved=(await rpc.state()).agents[0];
await rpc.update_agent({id:saved.id,revision:saved.revision,name:'Changed elsewhere',role:saved.role,spriteId:saved.spriteId,mission:saved.mission,instructions:saved.instructions,systems:saved.systems});
await boxes.behavior.emitRealtime('pc-changed',{});fireEvent.click(screen.getByRole('button',{name:'Save agent'}));await screen.findByText(/changed elsewhere. Reopen/);assert.equal((await rpc.state()).agents[0].name,'Changed elsewhere');
boxes.lifecycle.unmount();cleanup();

// New-chat composer: the picker is registered for new chats only; Single and Double battle save the pick.
assert.equal(app.composerCustomizations.length,1);assert.deepEqual(app.composerCustomizations[0].scopes,['new-thread']);
const second=await rpc.create_agent({name:'Demo Partner',spriteId:25,role:'Review',mission:'Check the work',instructions:'',systems:false});
const popup=renderSlot({component:appModule.AgentPopup},{},{rpc,context:{threadId:null,projectId:'synthetic-project'}});
fireEvent.click(await screen.findByRole('button',{name:/Changed elsewhere/}));await waitFor(async()=>assert.deepEqual((await rpc.state()).pending,{lead:scout.id,systemMode:'build',partner:null}));
fireEvent.click(screen.getByRole('button',{name:'Double battle'}));await screen.findByText('1 OF 2 · CHOOSE THE LEAD');fireEvent.click(screen.getByRole('button',{name:/Demo Partner/}));
await screen.findByText(/2 OF 2/);assert.ok(!screen.queryByRole('button',{name:/Demo Partner/}),'the lead cannot partner itself');fireEvent.click(screen.getByRole('button',{name:/Changed elsewhere/}));
await waitFor(async()=>assert.deepEqual((await rpc.state()).pending,{lead:second.id,systemMode:'build',partner:scout.id}));
popup.lifecycle.unmount();cleanup();
const picker=renderSlot({component:appModule.AgentPicker},{},{rpc,context:{threadId:null,projectId:'synthetic-project'}});await screen.findByRole('button',{name:/Demo Partner \+ Changed elsewhere/});picker.lifecycle.unmount();cleanup();await rpc.set_pending(null);

// Ownership guard: inactive/active cleanup must preserve another plugin's row.
document.body.innerHTML='<div data-sidebar="content"><div data-bb-plugin="thread-list"><div data-sidebar-rename-row data-pc-owner="another-theme" data-pc-thread="other"><span data-sidebar-thread-id="other"><button data-sidebar-thread-provider><span class="ppc-row-label">Keep me</span></button></span></div><div data-sidebar-rename-row><span data-sidebar-thread-id="synthetic-chat"><button data-sidebar-thread-provider></button></span></div></div></div>';
document.documentElement.style.setProperty('--pokemon-pc-enabled','1');
const integration=renderSlot({component:appModule.SidebarIntegration},{},{rpc,context:{threadId:'synthetic-chat',projectId:'synthetic-project'}});
await waitFor(()=>assert.equal(document.querySelectorAll('[data-pc-owner="pokemon-pc"]').length,1));
let changes=0;const observer=new MutationObserver(records=>changes+=records.length);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-pc-owner']});await act(()=>new Promise(resolve=>setTimeout(resolve,100)));assert.equal(changes,0,'No continuous ownership mutation loop');observer.disconnect();
await act(()=>document.documentElement.style.setProperty('--pokemon-pc-enabled','0'));await waitFor(()=>assert.equal(document.querySelectorAll('[data-pc-owner="pokemon-pc"]').length,0));assert.equal(document.querySelector('[data-pc-owner="another-theme"] .ppc-row-label').textContent,'Keep me');await act(async()=>integration.lifecycle.unmount());cleanup();

// Header portal follows the SDK's thread context and disposes its timer and mount.
document.body.innerHTML='<main data-split-pane-id="demo"><header>Demo chat</header><div id="context"></div></main>';document.documentElement.style.setProperty('--pokemon-pc-enabled','1');
const ChatWrapper=()=>React.createElement('main',{'data-split-pane-id':'demo'},React.createElement('header',null,'Demo chat'),React.createElement(appModule.ChatExperience,{threadId:'synthetic-chat'}));
const chat=renderSlot({component:ChatWrapper},{},{rpc,context:{threadId:'synthetic-chat',projectId:'synthetic-project'},container:document.getElementById('context')});
await waitFor(()=>assert.ok(document.querySelector('header + .ppc-exp-mount')));await screen.findByRole('progressbar');chat.lifecycle.unmount();assert.equal(document.querySelector('.ppc-exp-mount'),null);cleanup();
const {ExpBar}=await import('./.testbuild/frontend/components.js');const {emptyActivity}=await import('./.testbuild/activity.js');const base=emptyActivity();
const exp=render(React.createElement(ExpBar,{agents:[],activity:{...base,xp:24,active:true}}));assert.equal(screen.getByRole('progressbar').getAttribute('aria-valuenow'),'24');
exp.rerender(React.createElement(ExpBar,{agents:[],activity:{...base,level:2}}));assert.equal(screen.getByRole('progressbar').getAttribute('aria-valuenow'),'100');await waitFor(()=>assert.equal(screen.getByRole('progressbar').getAttribute('aria-valuenow'),'0'),{timeout:2000});cleanup();
await harness.lifecycle.dispose();dom.window.close();console.log('PASS: real UI create/select Gen IV/edit/CAS/assign/task complete/archive/undo/owner, composer single and double battle picker, ownership and theme cleanup, header portal, EXP fill-reset.');
