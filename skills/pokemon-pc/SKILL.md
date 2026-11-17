---
name: pokemon-pc
description: Manage durable PC To Dos and assign user-created Pokémon profiles to BB chats.
---
Read `bb pokemon-pc list --json` for saved agents, tasks, and assignments. A new installation has an empty party. Users create and edit agents through the party's + button; use the returned agent IDs rather than inventing role names.

Add tasks with `bb pokemon-pc add '<JSON>' --json`. JSON fields: title (1–240 characters), category (work/personal), skin (poke/great/ultra/quick/net/nest/dusk/master), optional owner (saved agent ID), and optional sourceKey for idempotent creation. Personal tasks default to Quick Ball. Tasks default to no owner. Change the agent working on a task with `bb pokemon-pc owner <task-id> <agent-id|none>`. Do not store secrets or raw personal messages in shared task storage.

Complete only after verifying the requested outcome: `bb pokemon-pc done <id> '<completion evidence>'`. Drafting, assigning, starting a run, or a run ending does not by itself complete a task. `undo <id>` reopens it. `clear` archives completed tasks and returns a token; `restore <token>` reverses that batch.

Assign a saved profile with `bb pokemon-pc assign <thread-id> <agent-id> [build|operate|repair]`. `unassign <thread-id>` clears the assignment. Profiles apply when the provider session is next constructed. Porygon modes apply only when enabled on that profile. Users can also pick a lead, or a lead plus one partner (a "double battle"), in the new-chat composer's Agent button. That pick shows as `pending` in `list --json` and is claimed by the next new chat's first human-typed message, before its session is constructed. Agent- and automation-started chats never claim it. Supporting roles guide one execution; assignment does not launch separate workers, grant permissions, install tools, or enforce data isolation. In a double battle the lead owns the outcome; bring in the partner's profile where its role applies, and say which partner a recommendation comes from.

The EXP bar is activity XP, not a percentage estimate of task completion. It records successful work events and levels up on completed plan steps, or successful turns without a structured plan. Never create unnecessary tool calls to earn XP. XP does not mark To Dos complete. External actions still require user authorization.
