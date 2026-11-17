import type { BbPluginApi } from '@get-bb/plugin-sdk';
import { rpcContract, assignment } from './contract';
import { createStore } from './store';
import { sharedPrinciples } from './data';
import { systems } from './systems';
export default function plugin(bb:BbPluginApi){
 const store=createStore(bb.storage.database());
 const changed=()=>bb.realtime.publish('pc-changed',{});
 const change=<T>(fn:()=>T)=>{const value=fn();changed();return value};
 bb.rpc.register(rpcContract,{
  state:async()=>store.state(),
  create_agent:async i=>change(()=>store.createAgent(i)),
  update_agent:async ({id,revision,...fields})=>change(()=>store.updateAgent(id,revision,fields)),
  archive_agent:async i=>change(()=>store.archiveAgent(i.id,i.revision,i.archived)),
  activity:async ({threadId})=>{
   await bb.sdk.threads.get({threadId});
   const before=store.activityState(threadId);
   const events=await bb.sdk.threads.events.list({threadId,afterSeq:String(before.lastSeq),limit:'200',order:'asc',types:['turn/started','item/completed','turn/plan/updated','turn/completed']});
   return {...store.applyActivity(threadId,events),catchingUp:events.length===200};
  },
  add:async input=>change(()=>store.add(input)),
  set_done:async i=>change(()=>store.done(i.id,i.done,i.revision)),
  clear:async()=>change(()=>store.clear()),restore:async i=>change(()=>store.restore(i.token)),
  assign:async i=>{await bb.sdk.threads.get({threadId:i.threadId});return change(()=>store.assign(i))},
  unassign:async i=>change(()=>store.unassign(i.threadId))
 });
 bb.agents.contributeInstructions(({threadId})=>{
  const a=store.assignment(threadId);if(!a)return null;
  const chosen=[a.lead,...a.helpers].map(id=>{const p=store.getAgent(id);return p.systems?{...p,pokemon:systems[a.systemMode].pokemon,systemMode:a.systemMode,modeInstructions:systems[a.systemMode].instructions}:p});
  return `Pokémon PC assignment: lead ${chosen[0].name}; supporting perspectives ${chosen.slice(1).map(p=>p.name).join(', ')||'none'}. These profiles guide one session; they do not start independent workers or grant tool access. Configuration applies at the next provider session construction.\n${JSON.stringify({principles:sharedPrinciples,agents:chosen})}\nUse bb pokemon-pc for durable To Dos. Completion requires evidence; assigning or drafting is not completion.`;
 });
 const usage='bb pokemon-pc list | add <JSON> | done <id> <evidence> | undo <id> | assign <thread-id> <role> [build|operate|repair] | unassign <thread-id> | clear | restore <token>';
 bb.cli.register({name:'pokemon-pc',summary:'Durable PC To Dos and explicit lead-agent assignments',commands:[{name:'list',summary:'Read tasks and assignments',usage:'bb pokemon-pc list [--json]'},{name:'add',summary:'Add task; JSON accepts title, category, skin, owner, sourceKey',usage:'bb pokemon-pc add <JSON> [--json]'},{name:'done',summary:'Complete task with evidence',usage:'bb pokemon-pc done <id> <evidence> [--json]'},{name:'undo',summary:'Reopen task',usage:'bb pokemon-pc undo <id>'},{name:'assign',summary:'Assign role to an existing thread; applies when session is constructed',usage:'bb pokemon-pc assign <thread-id> <role> [build|operate|repair]'},{name:'unassign',summary:'Clear role assignment',usage:'bb pokemon-pc unassign <thread-id>'},{name:'clear',summary:'Archive completed tasks only',usage:'bb pokemon-pc clear'},{name:'restore',summary:'Restore a clear batch',usage:'bb pokemon-pc restore <token>'}],async run(argv){try{const [cmd,...args]=argv.filter(a=>a!=='--json');let out:unknown;switch(cmd){case 'list':out=store.state();break;case 'add':out=change(()=>store.add(JSON.parse(args.join(' ')),'agent/CLI'));break;case 'done':{const evidence=args.slice(1).join(' ').trim();if(!evidence||evidence.length>2000)throw Error('Provide completion evidence (1–2000 characters).');const t=store.get(args[0]);out=change(()=>store.done(t.id,true,t.revision,'agent/CLI',evidence));break}case 'undo':{const t=store.get(args[0]);out=change(()=>store.done(t.id,false,t.revision,'agent/CLI'));break}case 'assign':{const a=assignment.parse({threadId:args[0],lead:args[1],helpers:[],systemMode:args[2]??'build'});await bb.sdk.threads.get({threadId:a.threadId});out=change(()=>store.assign(a));break}case 'unassign':out=change(()=>store.unassign(args[0]));break;case 'clear':out=change(()=>store.clear());break;case 'restore':out=change(()=>store.restore(args[0]));break;default:return{exitCode:0,stdout:usage}}return{exitCode:0,stdout:JSON.stringify(out)}}catch(e){return{exitCode:1,stderr:e instanceof Error?e.message:String(e)}}}});
}
