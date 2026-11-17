import { defineRpcContract } from '@get-bb/plugin-sdk';
import { z } from 'zod';
import { skins } from './balls';
export { skins } from './balls';
export const role = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
export const systemMode = z.enum(['build','operate','repair']);
export const agentFields = z.object({
 name:z.string().trim().min(1).max(60), spriteId:z.number().int().min(1).max(493),
 role:z.string().trim().min(1).max(80), mission:z.string().trim().min(1).max(1000),
 instructions:z.string().trim().max(12000), systems:z.boolean().default(false)
}).strict();
export const agent = agentFields.extend({id:role,revision:z.number().int(),archived:z.boolean()});
export const task = z.object({id:z.string(),title:z.string(),category:z.enum(['work','personal']),skin:z.enum(skins),owner:role.nullable(),done:z.boolean(),archived:z.boolean(),revision:z.number(),createdAt:z.string(),completedAt:z.string().nullable(),completedBy:z.string().nullable(),evidence:z.string().nullable()});
export const assignment = z.object({threadId:z.string().min(1).max(200),lead:role,helpers:z.array(role).max(99),systemMode:systemMode.default('build')});
export const activity = z.object({level:z.number(),xp:z.number(),actions:z.number(),active:z.boolean(),lastSeq:z.number(),completedSteps:z.number(),hasPlan:z.boolean(),lastKind:z.string(),catchingUp:z.boolean()});
export type Agent = z.infer<typeof agent>;
export type AgentFields = z.infer<typeof agentFields>;
export type Activity = z.infer<typeof activity>;
export type Task = z.infer<typeof task>;
export type Assignment = z.infer<typeof assignment>;
export type Role = z.infer<typeof role>;
export type Skin = typeof skins[number];
export const addInput = z.object({title:z.string().trim().min(1).max(240),category:z.enum(['work','personal']).default('work'),skin:z.enum(skins).optional(),owner:role.nullable().optional(),sourceKey:z.string().min(1).max(300).optional()}).strict();
export const stateSchema=z.object({agents:z.array(agent),tasks:z.array(task),assignments:z.array(assignment),openCount:z.number(),total:z.number()});
export type PCState=z.infer<typeof stateSchema>;
export const rpcContract = defineRpcContract({
 state:{input:z.null(),output:stateSchema},
 create_agent:{input:agentFields,output:agent},
 update_agent:{input:agentFields.extend({id:role,revision:z.number().int()}),output:agent},
 archive_agent:{input:z.object({id:role,revision:z.number().int(),archived:z.boolean()}).strict(),output:agent},
 activity:{input:z.object({threadId:z.string().min(1).max(200)}).strict(),output:activity},
 add:{input:addInput,output:task},
 set_done:{input:z.object({id:z.string(),done:z.boolean(),revision:z.number().int()}).strict(),output:task},
 clear:{input:z.null(),output:z.object({token:z.string(),count:z.number()})},
 restore:{input:z.object({token:z.string()}).strict(),output:z.object({count:z.number()})},
 assign:{input:assignment.strict(),output:assignment},
 unassign:{input:z.object({threadId:z.string()}).strict(),output:z.object({ok:z.boolean()})}
});
