# Ralph Loop - Operator's Guide

Quick reference for running, monitoring, debugging, and modifying the Ralph-BMAD autonomous implementation loop.

## Quick Start

```bash
# Prerequisites (all must exist before starting)
ls .ralph-plan.md .ralph-progress.md AGENTS.md
ls _bmad-output/implementation-artifacts/sprint-status.yaml

# Authenticate with OAuth (one-time, uses claude login token — NOT the app's API key)
claude login   # only needed once

# Start the loop (default: 20 iterations max)
./ralph.sh

# Start with custom iteration limit
./ralph.sh 10

# Start with verbose output (logs full Claude output to .ralph-loop.log)
./ralph.sh 5 --verbose
```

> **Auth note:** `ralph.sh` explicitly unsets `ANTHROPIC_API_KEY` before each `claude` invocation
> so it always uses your OAuth token, not the Fastify app's API key from `.env`.

## How It Works

```
ralph.sh (bash loop)
  |
  |-- per iteration --> claude --print "/ralph-run"  (fresh CLI session)
  |                       |
  |                       |-- ORIENT:     pick next story from .ralph-plan.md
  |                       |-- DELEGATE:   choose subagents based on [model: X] tag
  |                       |-- IMPLEMENT:  ralph-implementer (haiku) does TDD
  |                       |-- QA:         ralph-qa (sonnet) validates ACs
  |                       |-- REVIEW:     ralph-reviewer (sonnet) adversarial review
  |                       |-- COMMIT:     git add, commit, push
  |                       |-- OUTPUT:     signal (STORY_COMPLETE, etc.)
  |                       |
  |<-- signal ------------|
  |
  |-- next iteration (fresh context)
```

Each iteration = one fresh Claude Code session = one story. Context window stays healthy because the bash loop spawns a brand new `claude` process each time.

## Slash Commands (inside Claude Code)

| Command | What it does |
|---------|-------------|
| `/ralph-run` | Main loop prompt. Runs the full ORIENT-IMPLEMENT-QA-REVIEW-COMMIT cycle for ONE story. Used automatically by `ralph.sh`. |
| `/ralph-bridge` | Generates `.ralph-plan.md` from BMAD Phase 3 artifacts. Run this ONCE before starting the loop. |
| `/bmad:bmm:workflows:sprint-planning` | Creates `sprint-status.yaml`. Required before first loop run. |
| `/bmad:bmm:workflows:create-story` | Generates a detailed story file. Called automatically by `/ralph-run` when a story file doesn't exist. |
| `/bmad:bmm:workflows:workflow-status` | Check current BMAD phase and what's been completed. |
| `/bmad:bmm:workflows:sprint-status` | Summarize sprint progress, surface risks. |
| `/bmad:bmm:workflows:retrospective` | Run after epic completion to review sprint. |
| `/bmad:bmm:workflows:code-review` | Manual adversarial code review (outside the loop). |

## Subagents

Ralph uses specialized agents with model tiering:

| Agent | Model | Purpose |
|-------|-------|---------|
| `ralph-explorer` | Haiku | Fast codebase search. Read-only. |
| `ralph-implementer` | Haiku | TDD implementation. Red-green-refactor. |
| `ralph-qa` | Sonnet | Validates acceptance criteria. |
| `ralph-reviewer` | Sonnet | Adversarial code review (3-10 findings). |
| `ralph-architect` | Opus | Escalation only. Cross-cutting concerns. |

## Files Reference

| File | Purpose | When to edit manually |
|------|---------|----------------------|
| `.ralph-plan.md` | Story list with status markers | To mark stories `[!]` blocked or reorder |
| `.ralph-progress.md` | Accumulated learnings, completed stories, current state | To add blockers or reset state |
| `AGENTS.md` | Build commands, guardrails, patterns | To add new build commands or patterns |
| `ralph.sh` | Bash loop orchestrator | To change iteration limits or behavior |
| `.ralph-loop.log` | Loop log output | Read-only (auto-generated) |
| `.claude/commands/ralph-run.md` | The orchestrator prompt | To change the loop's decision logic |
| `.claude/commands/ralph-bridge.md` | Plan generator prompt | To change how plans are generated |
| `.claude/agents/ralph-*.md` | Subagent definitions | To change model or instructions per agent |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Sprint tracking state | To manually update sprint status |
| `_bmad-output/implementation-artifacts/{story-key}.md` | Per-story task breakdown | To modify tasks or acceptance criteria |

## Status Markers in .ralph-plan.md

```
- [ ]  Pending (not started)
- [~]  In Progress (currently being worked on)
- [x]  Done (implemented + QA + review passed)
- [!]  Blocked (needs human intervention)
```

## Completion Signals

These strings in Claude's output tell `ralph.sh` what happened:

| Signal | Meaning | ralph.sh behavior |
|--------|---------|-------------------|
| `RALPH_BMAD_COMPLETE` | All stories `[x]` | Exit 0 (success) |
| `RALPH_BMAD_BLOCKED` | All remaining stories `[!]` | Exit 1 |
| `SPRINT_PLANNING_NEEDED` | Missing sprint-status.yaml | Exit 1 |
| `STORY_COMPLETE` | One story finished cleanly | Continue to next iteration |
| `STORY_BLOCKED` | Story failed, WIP committed | Continue to next iteration |
| `SESSION_CHECKPOINT` | Context limit approaching | Continue (resets stall counter) |

## Safety Mechanisms

| Mechanism | Trigger | What happens |
|-----------|---------|-------------|
| **Max iterations** | `$MAX_ITERATIONS` reached (default 20) | Loop exits with warning |
| **Circuit breaker** | 3 consecutive iterations with no new git commits | Loop exits with error |
| **Rate limit cap** | 5 consecutive rate limit detections | Loop exits with error |
| **Rate limit pause** | Rate limit detected in output | Waits 5 minutes, retries |
| **Adaptive pause** | After each iteration | 3s normally, 10s if stalling |
| **Per-story iteration cap** | 10 total cycles (implement+QA+review) on one story | Story marked `[!]`, moves on |
| **QA retry cap** | 3 failed QA cycles on one story | Story marked `[!]`, moves on |
| **Review cycle cap** | 2 review rounds on one story | Story marked `[!]`, moves on |
| **Pre-commit gate** | Tests or type-check fail 2x | WIP commit + story `[!]` |

---

## Monitoring (while loop is running)

```bash
# Watch the loop log in real-time
tail -f .ralph-loop.log

# Check current story status
grep '\[~\]' .ralph-plan.md

# Count progress
echo "Done: $(grep -c '^\- \[x\]' .ralph-plan.md) | Pending: $(grep -c '^\- \[ \]' .ralph-plan.md) | Blocked: $(grep -c '^\- \[!\]' .ralph-plan.md)"

# Check git commits (did the loop actually produce work?)
git log --oneline -10

# Check ralph-progress for current phase and story
head -6 .ralph-progress.md

# Watch for new commits landing (story complete)
watch -n5 "git log --oneline -3"
```

### Reading the Process Tree

When the loop is healthy you'll see a 3-level hierarchy:

```
ralph.sh (bash)                          ← loop controller
  └── claude --print /ralph-run          ← orchestrator (one per iteration)
        ├── claude --model sonnet ...    ← subagent (ralph-qa / ralph-reviewer)
        ├── claude --model sonnet ...    ← subagent (ralph-qa / ralph-reviewer)
        └── claude --model sonnet ...    ← subagent (ralph-implementer or resumed)
```

```bash
# See the full process tree with PIDs, CPU, and start time
ps aux | grep -E 'claude|ralph\.sh' | grep -v grep | awk '{print $1,$2,$3,$9,$11,$12,$13}'

# Live view updating every 2 seconds
watch -n2 "ps aux | grep -E 'claude.*ralph|ralph\.sh' | grep -v grep | awk '{print \$1,\$2,\$3,\$9,\$11,\$12,\$13}'"
```

**What you'll see in `ps` output:**

| Command fragment | What it is |
|-----------------|-----------|
| `/bin/bash ./ralph.sh` | The bash loop itself |
| `claude --dangerously-skip-permissions --print /ralph-run` | The orchestrator for this iteration |
| `claude --model claude-sonnet-4-5 --disallowedTools Bash,Read...` | A subagent (ralph-qa, ralph-reviewer, ralph-explorer) |
| `claude ... --resume <uuid>` | A subagent that was paused and resumed mid-task |
| `node .../mcp-server.cjs` | MCP plugin sidecar — one per claude process, normal |

**CPU/activity clues:**

- High CPU (10–20%) on a subagent = actively processing (generating, running tools)
- Low CPU (0–2%) = waiting for API response or idle
- A `--resume <uuid>` subagent with highest CPU = it's the active one mid-task
- No subagents visible = orchestrator is in ORIENT phase (reading files, planning)

**ORIENT phase indicator:** No `[~]` in `.ralph-plan.md` yet means the orchestrator hasn't claimed a story. It's reading files and deciding which story to pick. This is normal for the first 30–60 seconds of an iteration.

## Stopping the Loop

```bash
# Graceful: Ctrl+C in the terminal running ralph.sh
# The trap will clean up temp files

# Hard stop (if hung): find and kill the claude process
pkill -f "claude.*ralph-run"

# Nuclear (kills everything): kill the bash loop itself
pkill -f ralph.sh
```

After stopping, check the state:

```bash
# Is there uncommitted work?
git status

# What was the last story being worked on?
grep '\[~\]' .ralph-plan.md

# Are there changes to save?
git diff --stat
```

## Resuming After a Stop

```bash
# If there's uncommitted work from the interrupted story:
git add apps/ packages/ _bmad-output/ .ralph-plan.md .ralph-progress.md AGENTS.md
git commit -m "wip: interrupted ralph loop, partial work on $(grep '\[~\]' .ralph-plan.md | head -1)"
git push

# Option A: Reset the in-progress story to pending and restart
# Edit .ralph-plan.md: change [~] back to [ ]
./ralph.sh

# Option B: Leave as [~] — ralph-run will try to resume it
./ralph.sh

# Option C: Mark as blocked and skip to next story
# Edit .ralph-plan.md: change [~] to [!]
./ralph.sh
```

## Debugging a Failed Story

When a story gets marked `[!]`:

```bash
# 1. Check why it was blocked
grep -A 5 'Blocked Stories' .ralph-progress.md

# 2. Look at the story file for task completion state
cat _bmad-output/implementation-artifacts/{story-key}.md | grep '\[.\]'

# 3. Check the log for errors
grep -i "error\|fail\|block" .ralph-loop.log | tail -20

# 4. Check if there's a WIP commit
git log --oneline -5

# 5. Run tests manually to see what's failing
pnpm --filter @trailblaze/api test
pnpm --filter @trailblaze/web test
pnpm type-check

# 6. Fix the issue manually, then:
#    - Edit .ralph-plan.md: change [!] back to [ ]
#    - Update .ralph-progress.md to note the manual fix
#    - Restart the loop
./ralph.sh
```

## Debugging a Stalled Loop

If the circuit breaker fires (3 iterations with no commits):

```bash
# 1. Check the log
tail -100 .ralph-loop.log

# 2. Common causes:
#    - Tests failing repeatedly (check test output)
#    - Type errors (run pnpm type-check)
#    - Missing dependencies (check if a prerequisite story was skipped)
#    - Rate limiting (check for 429 errors)
#    - Story file missing or incomplete

# 3. Run a single iteration interactively to see what's happening
claude "/ralph-run"
# (this opens an interactive session where you can watch/intervene)
```

## Modifying the Loop

### Change iteration limit
```bash
./ralph.sh 50           # Run up to 50 iterations
```

### Skip a story
Edit `.ralph-plan.md` — change `[ ]` to `[!]`:
```markdown
- [!] 3-2-embedding-generation-and-vector-storage [model: haiku] [depends: 3-1]
```
Add a reason in `.ralph-progress.md` under "Blocked Stories".

### Change a story's model tier
Edit `.ralph-plan.md` — change the `[model: X]` tag:
```markdown
- [ ] 3-1-content-chunking [model: sonnet]          # was haiku
- [ ] 3-4-hybrid-search [model: sonnet] [escalation: opus]  # add escalation
```

### Rerun a completed story
Edit `.ralph-plan.md` — change `[x]` back to `[ ]`:
```markdown
- [ ] 2-2-unit-content-extraction-pipeline [model: haiku] [depends: 2-1]
```
Note: this won't undo the previous implementation. The implementer will find existing code and the story file with tasks already checked.

### Add a new story
Add a new line in `.ralph-plan.md` under the appropriate sprint:
```markdown
- [ ] 3-6-custom-story-name [model: haiku] [depends: 3-5]
```
You'll also need to add it to `_bmad-output/planning-artifacts/epics.md` for the create-story workflow to find its acceptance criteria.

### Change subagent behavior
Edit the agent files in `.claude/agents/`:
```bash
# Change implementer to use sonnet instead of haiku
# Edit .claude/agents/ralph-implementer.md and change model: haiku -> model: sonnet
```

## First-Time Setup Checklist

If starting from scratch (Phase 3 complete, no Ralph artifacts yet):

```bash
# 1. Check BMAD phase status
claude "/bmad:bmm:workflows:workflow-status"

# 2. Run sprint planning (creates sprint-status.yaml)
claude "/bmad:bmm:workflows:sprint-planning"

# 3. Generate the ralph plan from BMAD artifacts
claude "/ralph-bridge"

# 4. Verify prerequisites exist
ls .ralph-plan.md .ralph-progress.md AGENTS.md
ls _bmad-output/implementation-artifacts/sprint-status.yaml

# 5. Make ralph.sh executable
chmod +x ralph.sh

# 6. Start the loop
./ralph.sh
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Missing .ralph-plan.md` | Never ran ralph-bridge | Run `claude "/ralph-bridge"` |
| `Missing sprint-status.yaml` | Never ran sprint planning | Run `claude "/bmad:bmm:workflows:sprint-planning"` |
| `Claude Code CLI not found` | CLI not installed | Install from https://docs.anthropic.com/claude-code |
| `SPRINT_PLANNING_NEEDED` signal | sprint-status.yaml missing | Run sprint planning (see above) |
| Loop exits immediately | All stories done or blocked | Check `.ralph-plan.md` status markers |
| Rate limit keeps triggering | Hitting API limits | Wait, or reduce concurrency |
| Circuit breaker fires | Claude keeps failing to commit | Run interactive session: `claude "/ralph-run"` |
| `Not on any branch` | Detached HEAD | `git checkout main` or your feature branch |
| `Unresolved merge conflicts` | Failed merge in progress | `git merge --abort` or resolve conflicts |
| Push keeps failing | Network or auth issue | Check `git remote -v` and credentials |
| Story stuck in `[~]` | Loop was interrupted | Resume loop or reset to `[ ]` |
| Wrong files getting committed | Should not happen (explicit staging) | Check `git diff --cached --name-only` before commit |
