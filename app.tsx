import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { definePluginApp, useRpc, useRealtime, useRealtimeConnectionState, useBbContext, useComposer, type ExperimentalThreadContextSegmentProps } from '@get-bb/plugin-sdk/app';
import { type rpcContract, type PCState, type Activity, type Agent, type PendingLead } from './contract';
import { ballSvg } from './balls';
import { spriteUrl } from './pets';
import { systems, systemModes, type SystemMode } from './systems';
import { AgentEditor, Party, Profile, Tasks, ExpBar, Sprite, Ball, displayAgent } from './components';
import './app.css';

function usePC() {
 const rpc=useRpc<typeof rpcContract>();const [state,setState]=useState<PCState|null>(null),[error,setError]=useState('');
 const request=useRef(0);const connection=useRealtimeConnectionState();
 const refresh=useCallback(()=>{const n=++request.current;return rpc.call('state').then(s=>{if(n===request.current){setState(s);setError('');}},e=>{if(n===request.current)setError(String(e));});},[rpc]);
 useEffect(()=>{void refresh();return()=>{request.current++;};},[refresh,connection]);useRealtime('pc-changed',refresh);
 return {rpc,state,error,setError,refresh};
}
function useThemeEnabled() {
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{const check=()=>setEnabled(getComputedStyle(document.documentElement).getPropertyValue('--pokemon-pc-enabled').trim()==='1');check();const observer=new MutationObserver(check);observer.observe(document.documentElement,{attributes:true,childList:true,subtree:true,attributeFilter:['class','style','href']});return()=>observer.disconnect();},[]);
 return enabled;
}
export function Boxes() {
 const pc=usePC();const {threadId}=useBbContext();
 const [selected,setSelected]=useState<string|null>(null),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[undo,setUndo]=useState(''),[notice,setNotice]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);const active=pc.state?.assignments.find(a=>a.threadId===threadId);const agent=pc.state?.agents.find(a=>a.id===selected)??null;
 const visible=editing||!!agent;
 useEffect(()=>{if(visible&&!dialog.current?.open)dialog.current?.showModal();else if(!visible)dialog.current?.close();},[visible]);
 function close(){setSelected(null);setEditing(false);}
 async function action(fn:()=>Promise<unknown>,message='') {setBusy(true);pc.setError('');try{await fn();await pc.refresh();setNotice(message);return true;}catch(e){pc.setError(String(e));return false;}finally{setBusy(false);}}
 return <div className="ppc-boxes" data-bb-plugin="pokemon-pc" data-bb-plugin-root="">
  <Party agents={pc.state?.agents??[]} active={active} onSelect={id=>{pc.setError('');setSelected(id);}} onAdd={()=>{pc.setError('');setSelected(null);setEditing(true);}} busy={busy} onRestore={a=>void action(()=>pc.rpc.call('archive_agent',{id:a.id,revision:a.revision,archived:false}),'Agent restored.')}/>
  <Tasks state={pc.state} busy={busy} undo={!!undo} onAdd={fields=>action(()=>pc.rpc.call('add',fields),'Task saved.')} onDone={t=>void action(()=>pc.rpc.call('set_done',{id:t.id,done:!t.done,revision:t.revision}),t.done?'Task reopened.':'Task completed.')} onOwner={(t,owner)=>void action(()=>pc.rpc.call('set_owner',{id:t.id,owner,revision:t.revision}),'Task agent updated.')} onClear={()=>void action(async()=>{const result=await pc.rpc.call('clear');setUndo(result.token);},'Finished tasks archived.')} onRestore={()=>void action(async()=>{await pc.rpc.call('restore',{token:undo});setUndo('');},'Tasks restored.')}/>
  {pc.error&&!visible&&<p className="ppc-error" role="alert">{pc.error}<button onClick={()=>void pc.refresh()}>Retry</button></p>}<p className="ppc-announcement" role="status">{notice}</p>
  {createPortal(<dialog className="ppc-dialog" ref={dialog} data-bb-plugin="pokemon-pc" data-bb-plugin-root="" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}}>
   {editing?<AgentEditor key={selected??'new'} agent={agent} busy={busy} error={pc.error} onCancel={close} onSave={async (fields,revision)=>{if(await action(()=>agent?pc.rpc.call('update_agent',{...fields,id:agent.id,revision:revision!}):pc.rpc.call('create_agent',fields),'Agent saved.'))close();}}/>:agent&&<Profile key={agent.id} agent={agent} agents={pc.state?.agents??[]} active={active} threadId={threadId} busy={busy} error={pc.error} onClose={close} onEdit={()=>setEditing(true)} onArchive={async()=>{if(await action(()=>pc.rpc.call('archive_agent',{id:agent.id,revision:agent.revision,archived:true}),'Agent archived.'))close();}} onAssign={async(helpers,systemMode)=>{if(threadId&&await action(()=>pc.rpc.call('assign',{threadId,lead:agent.id,helpers,systemMode}),'Lead assigned for the next provider session.'))close();}}/>}
  </dialog>,document.body)}
 </div>;
}
export function SidebarIntegration() {
 const {state}=usePC();const live=useRef(state);live.current=state;
 const [mount,setMount]=useState<HTMLElement|null>(null);const enabled=useThemeEnabled();const update=useRef<()=>void>(()=>{});
 useLayoutEffect(()=>{
  const owned=new Set<HTMLElement>();let box:HTMLElement|null=null;let frame=0;
  const cleanupMarks=()=>document.querySelectorAll<HTMLElement>('[data-pc-owner="pokemon-pc"]').forEach(row=>{row.removeAttribute('data-pc-thread');row.removeAttribute('data-pc-owner');row.style.removeProperty('--pc-thread-sprite');row.querySelectorAll('.ppc-row-label').forEach(n=>n.remove());});
  const reconcile=()=>{
   frame=0;if(!enabled){cleanupMarks();return;}
   const content=document.querySelector<HTMLElement>('[data-sidebar="content"]:has([data-bb-plugin="thread-list"])');
   if(content&&!box?.isConnected){box=document.createElement('div');box.className='ppc-sidebar-mount';box.setAttribute('data-bb-plugin','pokemon-pc');box.setAttribute('data-bb-plugin-root','');content.prepend(box);owned.add(box);setMount(box);}
   const assignments=new Map(live.current?.assignments.map(a=>[a.threadId,a])??[]);
   document.querySelectorAll<HTMLElement>('[data-sidebar-thread-id]').forEach(anchor=>{
    const row=anchor.closest<HTMLElement>('[data-sidebar-rename-row]');if(!row||(row.dataset.pcOwner&&row.dataset.pcOwner!=='pokemon-pc'))return;
    const assignment=assignments.get(anchor.dataset.sidebarThreadId!);const base=live.current?.agents.find(a=>a.id===assignment?.lead&&!a.archived);
    const source=base?spriteUrl(displayAgent(base,assignment?.systemMode).spriteId):'data:image/svg+xml,'+encodeURIComponent(ballSvg('poke',true));
    const value=`url("${source}")`;if(row.style.getPropertyValue('--pc-thread-sprite')!==value)row.style.setProperty('--pc-thread-sprite',value);
    if(row.dataset.pcThread!==(base?.id??'unassigned'))row.dataset.pcThread=base?.id??'unassigned';if(row.dataset.pcOwner!=='pokemon-pc')row.dataset.pcOwner='pokemon-pc';
    const provider=row.querySelector<HTMLElement>('[data-sidebar-thread-provider]');if(provider){let label=provider.querySelector<HTMLElement>('.ppc-row-label');if(!label){label=document.createElement('span');label.className='ppc-row-label';provider.append(label);}const text=base?`Lead: ${base.name}`:'No lead assigned';if(label.textContent!==text)label.textContent=text;}
   });
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(reconcile);};update.current=schedule;
  const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-sidebar-thread-id','data-pc-owner']});reconcile();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);owned.forEach(n=>n.remove());cleanupMarks();setMount(null);update.current=()=>{};};
 },[enabled]);
 useEffect(()=>update.current(),[state]);
 return enabled&&mount?createPortal(<Boxes/>,mount):null;
}
export function ChatExperience({threadId}:Pick<ExperimentalThreadContextSegmentProps,'threadId'>) {
 const pc=usePC(),enabled=useThemeEnabled();const anchor=useRef<HTMLSpanElement>(null);const [mount,setMount]=useState<HTMLElement|null>(null);
 const [activity,setActivity]=useState<Activity|null>(null),[error,setError]=useState('');
 useLayoutEffect(()=>{
  if(!enabled)return;
  const pane=anchor.current?.closest('[data-split-pane-id]');const header=pane?.querySelector(':scope > header');
  if(!header)return;
  const node=document.createElement('div');node.className='ppc-exp-mount';node.dataset.bbPlugin='pokemon-pc';header.after(node);setMount(node);
  return()=>{node.remove();setMount(null);};
 },[threadId,enabled]);
 useEffect(()=>{
  if(!enabled)return;let disposed=false;let timer:ReturnType<typeof setTimeout>;setActivity(null);setError('');
  const poll=async()=>{try{const value=await pc.rpc.call('activity',{threadId});if(!disposed){setActivity(value);setError('');}}catch{if(!disposed)setError('Could not read activity. Retrying…');}finally{if(!disposed)timer=setTimeout(poll,2500);}};
  void poll();return()=>{disposed=true;clearTimeout(timer);};
 },[pc.rpc,threadId,enabled]);
 const assigned=pc.state?.assignments.find(a=>a.threadId===threadId);const ids=assigned?[assigned.lead,...assigned.helpers]:[];
 const agents=ids.flatMap(id=>{const a=pc.state?.agents.find(a=>a.id===id&&!a.archived);return a?[displayAgent(a,assigned?.systemMode)]:[];});
 const bar=<ExpBar key={threadId} agents={agents} activity={activity} error={error}/>;
 return <span ref={anchor} className="ppc-exp-anchor">{enabled&&(mount?createPortal(bar,mount):bar)}</span>;
}
// New-chat composer: choose who works on the next chat. Single battle picks a lead; double battle
// adds one partner. The server's message.dispatch hook claims the pick before the session is built.
type LeadChoice={agent:Agent;mode:SystemMode};
const leadChoices=(agents:Agent[]):LeadChoice[]=>agents.filter(a=>!a.archived).flatMap(a=>a.systems?systemModes.map(mode=>({agent:a,mode})):[{agent:a,mode:'build' as SystemMode}]);
const choiceLabel=({agent,mode}:LeadChoice)=>agent.systems?`${agent.name} · ${systems[mode].label}`:agent.name;
export function AgentPicker() {
 const composer=useComposer();const {state}=usePC();const p=state?.pending;
 const lead=state?.agents.find(a=>a.id===p?.lead);const partner=state?.agents.find(a=>a.id===p?.partner);
 const label=lead?(partner?`${lead.name} + ${partner.name}`:lead.name):'Agent';
 return <span className="ppc-agent-root" data-bb-plugin="pokemon-pc" data-bb-plugin-root=""><button type="button" className="ppc-agent-pick" aria-haspopup="dialog" title={lead?(partner?`Double battle: ${label}`:`${lead.name} will lead this chat`):'Choose who works on this chat'} onClick={()=>composer.experimental_openPopup('agent-party')}>{lead?<><Sprite id={displayAgent(lead,p?.systemMode).spriteId}/>{partner&&<Sprite id={displayAgent(partner,p?.systemMode).spriteId}/>}</>:<Ball closed/>}<span>{label}</span><span aria-hidden="true">▾</span></button></span>;
}
export function AgentPopup() {
 const composer=useComposer();const pc=usePC();const p=pc.state?.pending;
 const [double,setDouble]=useState(!!p?.partner);const [lead,setLead]=useState<LeadChoice|null>(null);const [busy,setBusy]=useState(false);
 const choices=leadChoices(pc.state?.agents??[]);
 async function save(next:PendingLead|null){setBusy(true);pc.setError('');try{await pc.rpc.call('set_pending',next);await pc.refresh();composer.experimental_closePopup();}catch(e){pc.setError(String(e));}finally{setBusy(false);}}
 const picking=double&&lead?'partner':'lead';
 const shown=picking==='partner'?(pc.state?.agents??[]).filter(a=>!a.archived&&a.id!==lead!.agent.id).map(agent=>({agent,mode:lead!.mode})):choices;
 return <div className="ppc-agent-popup" data-bb-plugin="pokemon-pc" data-bb-plugin-root="">
  <div className="ppc-agent-modes" role="group" aria-label="Battle format"><button type="button" aria-pressed={!double} onClick={()=>{setDouble(false);setLead(null);}}>Single</button><button type="button" aria-pressed={double} onClick={()=>{setDouble(true);setLead(null);}}>Double battle</button></div>
  <small>{!double?'CHOOSE WHO LEADS THE NEXT CHAT':picking==='lead'?'1 OF 2 · CHOOSE THE LEAD':`2 OF 2 · CHOOSE ${lead!.agent.name.toUpperCase()}’S PARTNER`}</small>
  {!choices.length?<p className="ppc-empty">Build your party with + in the sidebar first.</p>:<div className="ppc-agent-grid" role="group" aria-label={picking==='partner'?'Partner':'Lead'}>{shown.map(c=>{const current=picking==='lead'?p?.lead===c.agent.id&&(!c.agent.systems||p.systemMode===c.mode)&&(double?!!p.partner:!p.partner):p?.partner===c.agent.id;return <button key={c.agent.id+':'+c.mode} type="button" disabled={busy} aria-pressed={current} className={'ppc-slot'+(current?' ppc-selected':'')} onClick={()=>double&&picking==='lead'?setLead(c):void save({lead:double?lead!.agent.id:c.agent.id,systemMode:double?lead!.mode:c.mode,partner:double?c.agent.id:null})}><Sprite id={displayAgent(c.agent,c.mode).spriteId}/><strong>{picking==='partner'?c.agent.name:choiceLabel(c)}</strong><small>{c.agent.role}</small></button>;})}</div>}
  {double&&picking==='lead'&&choices.length<2&&<p className="ppc-footnote">A double battle needs at least two agents in your party.</p>}
  {double&&<p className="ppc-footnote">Both profiles guide one chat: the lead owns the result and brings in its partner’s expertise. No second agent is started.</p>}
  <div className="ppc-agent-actions">{picking==='partner'&&<button type="button" disabled={busy} onClick={()=>setLead(null)}>← Change lead</button>}<button type="button" className="ppc-agent-none" disabled={busy} aria-pressed={!p} onClick={()=>void save(null)}><Ball closed/>No agent</button></div>
  {pc.error&&<p role="alert" className="ppc-error">{pc.error}</p>}
 </div>;
}
export default definePluginApp(app=>{
 app.composer.customize({id:'lead-pokemon',scopes:['new-thread'],actions:[{id:'agent',component:AgentPicker}],experimental_popups:[{id:'agent-party',label:'Choose who works on this chat',component:AgentPopup}]});
 app.slots.experimental_appOverlay({id:'ppc-sidebar',component:SidebarIntegration});
 app.slots.experimental_threadContextSegment({id:'party-exp',title:'Party activity XP',group:'pokemon-pc',summary:ChatExperience});
 app.slots.experimental_threadAction({id:'lead-pokemon',title:'Lead pet',icon:'User',group:'organize',useData:()=>usePC(),item:({thread,data})=>{
  const current=data.state?.assignments.find(a=>a.threadId===thread.id);const roster=data.state?.agents.filter(a=>!a.archived)??[];
  const choices=roster.flatMap(a=>a.systems?systemModes.map(mode=>({id:a.id+':'+mode,label:`${a.name} · ${systems[mode].label}`,selected:current?.lead===a.id&&current.systemMode===mode})):[{id:a.id,label:`${a.name} · ${a.role}`,selected:current?.lead===a.id}]);
  return {label:'Lead pet',icon:'User',detail:roster.find(a=>a.id===current?.lead)?.name??'Unassigned',choices:{items:[...choices,{id:'none',label:'Unassigned'}]},run:async({value})=>{
   if(value==='none')await data.rpc.call('unassign',{threadId:thread.id});
   else {const [lead,rawMode]=String(value).split(':');if(roster.some(a=>a.id===lead)){const mode=systemModes.includes(rawMode as SystemMode)?rawMode as SystemMode:current?.systemMode??'build';await data.rpc.call('assign',{threadId:thread.id,lead,helpers:current?.helpers.filter(h=>h!==lead)??[],systemMode:mode});}}
   await data.refresh();
  }};
 }});
});
