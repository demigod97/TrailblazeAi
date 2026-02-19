---
name: planning-with-files
description: Manage context, memory, and task tracking across Claude Code sessions using file-based state. Use at the start of any session to load context, check progress, or when you need to save state before session ends.
---

# Planning With Files

Cross-session context and memory management for the Ralph-BMAD implementation loop.

## Session Start — Load Context

When invoked at session start, load these files in order:

1. **`.ralph-progress.md`** — What was done, what to do next, accumulated learnings
2. **`AGENTS.md`** — Build commands, established patterns, guardrails
3. **`.ralph-plan.md`** — Implementation order, story statuses, dependencies
4. **`_bmad-output/implementation-artifacts/sprint-status.yaml`** — Sprint tracking

Then report:
- Current sprint progress (done/total per epic)
- Next story to implement (first `[ ]` with all deps `[x]`)
- Any blocked stories and reasons
- Key learnings from previous stories

## Session End — Save State

Before ending a session or when context is getting large:

1. **Update `.ralph-progress.md`:**
   - Current story and phase
   - Tasks completed this session
   - Any new codebase patterns discovered
   - Blockers encountered

2. **Update `AGENTS.md`** if new patterns/commands were discovered

3. **Commit progress files:**
   ```bash
   git add .ralph-progress.md AGENTS.md
   git commit -m "chore: update ralph progress and learnings"
   ```

## Context Budget Monitor

If you notice the conversation getting long (many tool calls, large file reads):
- Save current state to `.ralph-progress.md`
- Note exactly where you stopped (story, task, subtask)
- Output `<promise>SESSION_CHECKPOINT</promise>`
- The bash loop or user will start a fresh session that picks up from the checkpoint

## Quick Status Check

Read `.ralph-plan.md` and count:
```
Pending: [ ]  — stories waiting to start
Active:  [~]  — story currently in progress
Done:    [x]  — completed stories
Blocked: [!]  — stories needing intervention
```

## Memory Architecture

| File | Type | Update Frequency |
|------|------|-----------------|
| `.ralph-progress.md` | Append-only log | After each story, each session |
| `AGENTS.md` | Accumulated knowledge | When new patterns discovered |
| `.ralph-plan.md` | Implementation tracker | After each story completion |
| `sprint-status.yaml` | BMAD sprint state | After each story completion |
| `_bmad-output/project-context.md` | Tech stack constants | Rarely (architecture changes only) |

## Integration with BMAD Workflows

This skill works alongside BMAD V6 Phase 4 workflows:
- `/ralph-run` — Reads progress file for state, writes back after each story
- `/bmad:bmm:workflows:code-review` — Review completed stories for quality
- `/bmad:bmm:workflows:sprint-status` — Check overall sprint health
- `/bmad:bmm:workflows:retrospective` — Run after epic completion

## Testing While Ralph Runs

Use git worktrees to test without disrupting the loop:

```bash
# Create isolated test environment
git worktree add ../TrailblazeAi-test main

# Test in the worktree
cd ../TrailblazeAi-test && pnpm install && pnpm dev

# Clean up when done
cd ../TrailblazeAi && git worktree remove ../TrailblazeAi-test
```
