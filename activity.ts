import { createHash } from 'node:crypto';
import type { Activity } from './contract';
// Only event metadata enters the reducer. No command, output, message, or plan text is stored.
export type ActivityEvent = {seq:number;type:string;data:any};
type ActivityState=Activity & {completedKeys:string[]};
export const emptyActivity=():ActivityState=>({level:1,xp:0,actions:0,active:false,lastSeq:0,completedSteps:0,hasPlan:false,lastKind:'Ready',catchingUp:false,completedKeys:[]});
const workTypes=new Set(['commandExecution','mcpToolCall','toolCall','webSearch','webFetch','fileChange','fileRead','search','imageView','imageGeneration']);
export function reduceActivity(previous:ActivityState,events:ActivityEvent[]):ActivityState {
 const next={...previous,completedKeys:[...(previous.completedKeys??[])]};
 for(const event of [...events].sort((a,b)=>a.seq-b.seq)) {
  if(event.seq<=next.lastSeq)continue;
  next.lastSeq=event.seq;
  const d=event.data;
  if(event.type==='turn/started') {next.active=true;next.completedSteps=0;next.hasPlan=false;next.lastKind='Working';}
  if(event.type==='item/completed') {
   const item=d.item;
   if(item&&workTypes.has(item.type)&&!item.error&&(!item.status||item.status==='completed')&&(item.exitCode==null||item.exitCode===0)) {
    next.actions++;next.xp=Math.min(90,next.xp+12);next.lastKind='Work recorded';
   }
  }
  const plan=event.type==='turn/plan/updated'?d.plan:event.type==='item/completed'&&d.item?.type==='planSteps'?d.item.steps:null;
  if(Array.isArray(plan)) {
   next.hasPlan=plan.length>0||next.hasPlan;
   const occurrences=new Map<string,number>();
   for(const step of plan) {
    const text=String(step.step).trim();const occurrence=occurrences.get(text)??0;occurrences.set(text,occurrence+1);
    const key=createHash('sha256').update(`${text}#${occurrence}`).digest('hex');
    if(step.status==='completed'&&!next.completedKeys.includes(key)) {
     next.completedKeys.push(key);next.completedSteps++;next.level++;next.xp=0;next.lastKind='Step complete';
    }
   }
   // Bounded deduplication history. Repeated unchanged plan snapshots do not earn XP.
   next.completedKeys=next.completedKeys.slice(-2048);
  }
  if(event.type==='turn/completed') {
   next.active=false;
   if(d.status==='completed'&&!next.hasPlan){next.level++;next.xp=0;next.lastKind='Turn complete';}
   else if(d.status!=='completed')next.lastKind=d.status==='failed'?'Run failed':'Run interrupted';
   else next.lastKind='Turn ended';
  }
 }
 return next;
}
