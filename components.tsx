import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { pokedex, spriteUrl } from './pokedex';
import { systems, systemModes, type SystemMode } from './systems';
import { type Agent, type AgentFields, type Activity, type Assignment, type PCState, type Skin, type Task } from './contract';
import { skins, ballSvg, ballNames } from './balls';

export function displayAgent(agent:Agent,mode:SystemMode='build') {
 return agent.systems?{...agent,spriteId:systems[mode].spriteId}:agent;
}
export function Sprite({id}:{id:number}) {
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[id]);
 return failed?<span className="ppc-sprite ppc-sprite-fallback" aria-label="Sprite unavailable">#{id}</span>:<img className="ppc-sprite" src={spriteUrl(id)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;
}
export function Ball({skin='poke',closed=false}:{skin?:Skin;closed?:boolean}) {
 return <span className="ppc-ball" dangerouslySetInnerHTML={{__html:ballSvg(skin,closed)}}/>;
}
export function AgentEditor({agent,onSave,onCancel,busy,error}:{agent:Agent|null;onSave:(fields:AgentFields,revision?:number)=>void;onCancel:()=>void;busy:boolean;error:string}) {
 const [draftRevision]=useState(agent?.revision);
 const [fields,setFields]=useState<AgentFields>(agent??{name:'',spriteId:1,role:'',mission:'',instructions:'',systems:false});
 const [query,setQuery]=useState('');const [generation,setGeneration]=useState(0);const [limit,setLimit]=useState(60);
 const filtered=pokedex.filter(p=>(!generation||p.generation===generation)&&(`${p.id} ${p.name}`.toLowerCase().includes(query.toLowerCase())));
 function field<K extends keyof AgentFields>(key:K,value:AgentFields[K]){setFields(old=>({...old,[key]:value}));}
 return <form className="ppc-editor" onSubmit={e=>{e.preventDefault();const {name,spriteId,role,mission,instructions,systems}=fields;onSave({name,spriteId,role,mission,instructions,systems},draftRevision);}}>
  <h2>{agent?'Edit agent':'Build an agent'}</h2><p>Choose a Pokémon, then give it a purpose. Build a party of six—or keep growing.</p>
  <div className="ppc-editor-chosen"><Sprite id={fields.spriteId}/><strong>{pokedex[fields.spriteId-1].name}</strong><small>#{fields.spriteId}</small></div>
  <div className="ppc-picker-filters"><input aria-label="Search Pokémon" placeholder="Search name or Pokédex number" value={query} onChange={e=>{setQuery(e.target.value);setLimit(60);}}/><select aria-label="Generation" value={generation} onChange={e=>{setGeneration(Number(e.target.value));setLimit(60);}}><option value={0}>All generations</option>{[1,2,3,4].map(g=><option key={g} value={g}>Gen {g}</option>)}</select></div>
  <div className="ppc-pokedex" role="group" aria-label="Choose a Pokémon">{filtered.slice(0,limit).map(p=><button type="button" key={p.id} aria-label={`Choose ${p.name}`} aria-pressed={fields.spriteId===p.id} onClick={()=>field('spriteId',p.id)}><Sprite id={p.id}/><span>{p.name}</span></button>)}{!filtered.length&&<p>No Pokémon match.</p>}</div>
  {filtered.length>limit&&<button type="button" onClick={()=>setLimit(limit+60)}>Show more ({filtered.length-limit})</button>}
  <label>Agent name<input required maxLength={60} value={fields.name} placeholder="e.g. Scout" onChange={e=>field('name',e.target.value)}/></label>
  <label>Role<input required maxLength={80} value={fields.role} placeholder="e.g. Research assistant" onChange={e=>field('role',e.target.value)}/></label>
  <label>Mission<textarea required rows={2} maxLength={1000} value={fields.mission} placeholder="What should this agent help you accomplish?" onChange={e=>field('mission',e.target.value)}/></label>
  <label>Instructions & scaffolding<textarea rows={7} maxLength={12000} value={fields.instructions} placeholder={'Scope:\nSources and tools:\nPreferred workflow:\nExpected output:\nChecks and boundaries:'} onChange={e=>field('instructions',e.target.value)}/></label>
  <label className="ppc-checkbox"><input type="checkbox" checked={fields.systems} onChange={e=>field('systems',e.target.checked)}/>Enable Porygon Build / Operate / Repair modes</label>
  <p className="ppc-footnote">Modes use Porygon-family sprites. Instructions guide the next provider session. They do not install tools, create workers, or grant permissions.</p>
  {error&&<p className="ppc-error" role="alert">{error}</p>}
  <div className="ppc-form-actions"><button type="button" onClick={onCancel}>Cancel</button><button className="ppc-primary" disabled={busy}>{busy?'Saving…':'Save agent'}</button></div>
 </form>;
}
export function Party({agents,active,onSelect,onAdd,onRestore,busy}:{agents:Agent[];active?:Assignment;onSelect:(id:string)=>void;onAdd:()=>void;onRestore:(agent:Agent)=>void;busy:boolean}) {
 const [open,setOpen]=useState(true);const roster=agents.filter(a=>!a.archived);
 return <section className="ppc-box"><header><button className="ppc-box-title" onClick={()=>setOpen(!open)} aria-expanded={open}>YOUR PARTY <span>{roster.length} AGENTS</span></button><button className="ppc-plus" aria-label="Build an agent" onClick={onAdd}>+</button></header>{open&&<>
 {roster.length?<div className="ppc-grid">{roster.map(a=><button key={a.id} className={'ppc-slot'+(active?.lead===a.id?' ppc-selected':'')} onClick={()=>onSelect(a.id)} aria-label={`${a.name}: ${a.role}`}><Sprite id={displayAgent(a,active?.systemMode).spriteId}/><strong>{a.name}</strong><small>{a.role}</small></button>)}<button className="ppc-slot ppc-add-slot" onClick={onAdd}><span>+</span><strong>Add agent</strong></button></div>:<div className="ppc-welcome"><span className="ppc-empty-ball"><Ball/></span><strong>Your adventure starts here.</strong><p>Choose any Pokémon from Gen I–IV and make it your own agent.</p><button className="ppc-primary" onClick={onAdd}>+ Build your first agent</button></div>}
 <p className="ppc-footnote">{active?`${agents.find(a=>a.id===active.lead)?.name??'Agent'} leads this chat`:'Choose an agent to assign a chat lead.'}</p>
 {agents.some(a=>a.archived)&&<details className="ppc-archived"><summary>Archived agents</summary>{agents.filter(a=>a.archived).map(a=><p key={a.id}>{a.name} <button disabled={busy} onClick={()=>onRestore(a)}>Restore</button></p>)}</details>}
 </>}</section>;
}
export function Profile({agent,agents,active,threadId,busy,error,onAssign,onEdit,onArchive,onClose}:{agent:Agent;agents:Agent[];active?:Assignment;threadId:string|null;busy:boolean;error:string;onAssign:(helpers:string[],mode:SystemMode)=>void;onEdit:()=>void;onArchive:()=>void;onClose:()=>void}) {
 const [helpers,setHelpers]=useState(active?.helpers.filter(h=>h!==agent.id)??[]);const [mode,setMode]=useState<SystemMode>(active?.systemMode??'build');
 return <div className="ppc-profile"><button className="ppc-close" aria-label="Close profile" onClick={onClose}>×</button><div className="ppc-profile-heading"><Sprite id={displayAgent(agent,mode).spriteId}/><div><small>AGENT PROFILE</small><h2>{agent.name}</h2><p>{agent.role} · {pokedex[agent.spriteId-1].name}</p></div></div><p>{agent.mission}</p>
 {agent.systems&&<div className="ppc-mode-picker" role="group" aria-label="Porygon mode">{systemModes.map(m=><button key={m} aria-pressed={mode===m} onClick={()=>setMode(m)}><Sprite id={systems[m].spriteId}/><strong>{systems[m].label}</strong></button>)}</div>}
 <pre className="ppc-instructions">{agent.instructions||'No extra instructions yet. Edit this profile to add your workflow.'}</pre>
 <div className="ppc-party"><strong>Supporting perspectives</strong><p>Include these profiles in the same session. This does not launch separate agents.</p>{agents.filter(a=>!a.archived&&a.id!==agent.id).map(a=><label key={a.id}><input type="checkbox" checked={helpers.includes(a.id)} onChange={e=>setHelpers(e.target.checked?[...helpers,a.id]:helpers.filter(h=>h!==a.id))}/>{a.name} · {a.role}</label>)}</div>
 {error&&<p role="alert" className="ppc-error">{error}</p>}
 <button className="ppc-primary" disabled={!threadId||busy} onClick={()=>onAssign(helpers,mode)}>Make {agent.name} this chat’s lead</button><p className="ppc-footnote">{threadId?'Applies at the next provider session construction.':'Open a chat to assign its lead.'}</p><div className="ppc-form-actions"><button onClick={onEdit}>Edit agent</button><button disabled={busy} onClick={onArchive}>Archive agent</button></div><p className="ppc-footnote">Archiving clears this agent’s chat assignments. Tasks and the profile are retained.</p></div>;
}
export function Tasks({state,busy,onAdd,onDone,onOwner,onClear,onRestore,undo}:{state:PCState|null;busy:boolean;onAdd:(fields:{title:string;category:'work'|'personal';skin:Skin;owner:string|null})=>Promise<boolean>;onDone:(task:Task)=>void;onOwner:(task:Task,owner:string|null)=>void;onClear:()=>void;onRestore:()=>void;undo:boolean}) {
 const [open,setOpen]=useState(true),[form,setForm]=useState(false),[title,setTitle]=useState(''),[category,setCategory]=useState<'work'|'personal'>('work'),[skin,setSkin]=useState<Skin>('poke'),[owner,setOwner]=useState(''),[filter,setFilter]=useState('all');
 const tasks=state?.tasks.filter(t=>filter==='all'||t.category===filter)??[];
 return <section className="ppc-box ppc-todos"><header><button className="ppc-box-title" onClick={()=>setOpen(!open)} aria-expanded={open}>TO DOS <span>{state?.openCount??'…'} OPEN</span></button><button className="ppc-plus" aria-label="Add a To Do" onClick={()=>{setOpen(true);setForm(!form);}}>+</button></header>{open&&<><div className="ppc-filters">{['all','work','personal'].map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}</div>
 {form&&<form className="ppc-add" onSubmit={async e=>{e.preventDefault();if(await onAdd({title,category,skin,owner:owner||null})){setTitle('');setForm(false);}}}><input required autoFocus maxLength={240} aria-label="Task title" placeholder="What needs doing?" value={title} onChange={e=>setTitle(e.target.value)}/><select aria-label="Task category" value={category} onChange={e=>{const c=e.target.value as 'work'|'personal';setCategory(c);setSkin(c==='personal'?'quick':'poke');}}><option value="work">Work</option><option value="personal">Personal</option></select><select aria-label="Task owner" value={owner} onChange={e=>setOwner(e.target.value)}><option value="">Unassigned</option>{state?.agents.filter(a=>!a.archived).map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select><div className="ppc-skins" role="group" aria-label="Ball skin">{skins.map(s=><button type="button" key={s} aria-label={ballNames[s]} aria-pressed={skin===s} onClick={()=>setSkin(s)}><Ball skin={s} closed/></button>)}</div><div className="ppc-form-actions"><button type="button" onClick={()=>setForm(false)}>Cancel</button><button className="ppc-primary" disabled={busy||!title.trim()}>Add task</button></div></form>}
 <div className="ppc-task-list">{!state?<p className="ppc-empty">Loading tasks…</p>:!tasks.length?<p className="ppc-empty">A little room for what’s next.<br/>Add a task with +.</p>:tasks.map(t=><div className={'ppc-task'+(t.done?' ppc-done':'')} key={t.id}><button className="ppc-complete" disabled={busy} aria-label={`${t.done?'Reopen':'Complete'} ${t.title}`} aria-pressed={t.done} onClick={()=>onDone(t)}><Ball skin={t.skin} closed={t.done}/></button><div><span>{t.title}</span><small>{t.category} · <select className="ppc-owner" aria-label={`Agent working on ${t.title}`} disabled={busy||t.done} value={t.owner??''} onChange={e=>onOwner(t,e.target.value||null)}><option value="">Unassigned</option>{state.agents.filter(a=>!a.archived||a.id===t.owner).map(a=><option value={a.id} key={a.id}>{a.name}{a.archived?' (archived)':''}</option>)}</select></small></div></div>)}</div>
 {state&&state.total>200&&<p className="ppc-footnote">Showing 200 of {state.total}. Clear finished tasks to make room.</p>}
 <footer><button disabled={busy||!state?.tasks.some(t=>t.done)} onClick={onClear}>Clear finished</button>{undo&&<button disabled={busy} onClick={onRestore}>Undo</button>}</footer></>}</section>;
}
export function ExpBar({agents,activity,error}:{agents:Agent[];activity:Activity|null;error?:string}) {
 const [paused,setPaused]=useState(()=>{try{return localStorage.getItem('pokemon-pc:motion')==='off';}catch{return false;}}),[collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem('pokemon-pc:exp-collapsed')==='yes';}catch{return false;}}),[levelUp,setLevelUp]=useState(false);
 const toggleMotion=()=>setPaused(value=>{try{localStorage.setItem('pokemon-pc:motion',value?'on':'off');}catch{}return !value;});
 const toggleCollapsed=()=>setCollapsed(value=>{try{localStorage.setItem('pokemon-pc:exp-collapsed',value?'no':'yes');}catch{}return !value;});const previous=useRef<number|null>(null);
 useEffect(()=>{if(!activity){previous.current=null;setLevelUp(false);return;}if(previous.current!==null&&!activity.catchingUp&&activity.level>previous.current){setLevelUp(true);const timer=setTimeout(()=>setLevelUp(false),1200);previous.current=activity.level;return()=>clearTimeout(timer);}previous.current=activity.level;},[activity?.level]);
 const value=levelUp?100:activity?.xp??0;
 return <section className={'ppc-exp'+(activity?.active&&!activity.catchingUp?' ppc-exp-active':'')+(paused?' ppc-exp-paused':'')+(collapsed?' ppc-exp-collapsed':'')} aria-label="Party activity XP" data-level-up={levelUp}>
 <button className="ppc-exp-collapse" aria-label={collapsed?'Expand Pokémon display':'Collapse Pokémon display'} aria-expanded={!collapsed} onClick={toggleCollapsed} title={collapsed?'Show Pokémon':'Show only EXP line'}>{collapsed?'⌄':'⌃'}</button>
 <div className="ppc-exp-scene" aria-hidden="true">{agents.map((a,i)=><div key={a.id} className={`ppc-walker ppc-move-${i%3}`} style={{'--pc-delay':`${-(i*1.73)}s`,'--pc-duration':`${5.2+(i%5)*1.3}s`} as CSSProperties}><Sprite id={a.spriteId}/></div>)}{!agents.length&&<span className="ppc-exp-invite">Build your party with + in the sidebar</span>}</div>
 <div className="ppc-exp-label"><strong>EXP <span>Lv. {activity?.level??1}</span></strong><span role="status">{error?'Activity unavailable':activity?.catchingUp?'Syncing history…':levelUp?'Level up!':activity?.active?'Working…':activity?.lastKind??'Connecting…'}</span><button aria-label={paused?'Resume Pokémon animations':'Pause Pokémon animations'} onClick={toggleMotion}>{paused?'Play':'Pause'}</button></div>
 <div className="ppc-exp-track" role="progressbar" aria-label="Activity XP, not task completion percentage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div className="ppc-exp-fill" style={{width:`${value}%`}}/></div>
 <div className="ppc-exp-caption">{activity?.actions??0} work actions · steps earn levels · {value}/100 XP</div>
 {error&&<p className="ppc-error" role="alert">{error}</p>}
 </section>;
}
