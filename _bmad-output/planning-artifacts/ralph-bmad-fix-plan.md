# Plan: Fix & Optimize Ralph-BMAD Workflow

**Date:** 2026-02-19
**Branch:** `claude/fix-ralph-bmad-workflow-whjML`
**Status:** Awaiting Approval

---

## Root Cause Analysis

### What Went Wrong

After analyzing the codebase, git history, and researching Ralph/BMAD/Claude Code best practices, I identified **7 root causes** for the 3-4 hour loop with no commits:

| # | Severity | Root Cause | Evidence |
|---|----------|-----------|----------|
| 1 | **CRITICAL** | **ralph-run.md COMMIT phase has no git operations** — it updates markdown files (`.ralph-plan.md`, `sprint-status.yaml`, `.ralph-progress.md`) but never runs `git add`, `git commit`, or `git push` | Lines 159-186 of `.claude/commands/ralph-run.md` — no git commands anywhere |
| 2 | **CRITICAL** | **No bash loop script** — `/ralph-run` runs as a single Claude Code session processing ALL stories sequentially in ONE context window. After ~8 stories the context degrades and the loop gets stuck | No `ralph.sh` exists; all 3 Ralph reference implementations (snarktank, ClaytonFarr, coleam00) require a bash loop spawning fresh contexts |
| 3 | **CRITICAL** | **No progress/memory file created** — `.ralph-progress.md` is referenced in ralph-run but never existed, so there's no cross-session memory | `find . -name ".ralph-progress*"` returns nothing |
| 4 | **HIGH** | **Path inconsistency for project-context.md** — ralph-run references `_bmad-output/project-context.md` but the file is at `_bmad-output/project-context.md` (some agents reference `_bmad-output/planning-artifacts/project-context.md` which doesn't exist) | Architecture.md frontmatter references `_bmad-output/project-context.md`; ralph-implementer references `_bmad-output/project-context.md` |
| 5 | **HIGH** | **No quality gate enforcement** — ralph-run delegates to subagents but never verifies tests/type-check pass between stories | COMMIT phase has no `pnpm test` or `pnpm type-check` validation |
| 6 | **HIGH** | **Story 3-1 stuck in-progress** — sprint-status.yaml and .ralph-plan.md show 3-1 as in-progress but no implementation exists (only the story file was created) | `git diff --stat 941a557..2c1cf1b` shows only 3 files changed (status files + story file) |
| 7 | **MEDIUM** | **No operational knowledge file (AGENTS.md)** — each fresh session loses all discovered patterns, gotchas, and conventions from previous iterations | Ralph Playbook, snarktank Ralph, and coleam00 quickstart all require AGENTS.md or equivalent |

### The Universal Pattern All Ralph Implementations Agree On

> **One story = one fresh context window = one git commit**

This is the atomic unit. Running multiple stories in one context window violates the fundamental Ralph design pattern. All three reference implementations (snarktank/ralph, ClaytonFarr/ralph-playbook, coleam00/ralph-loop-quickstart) enforce this via a bash loop that spawns fresh Claude Code sessions.

---

## Implementation Plan

### Phase A: Fix Core Infrastructure (Files to Modify/Create)

#### A1. Fix ralph-run.md — Add Git Commit Operations to COMMIT Phase
**File:** `.claude/commands/ralph-run.md`
**Change:** Add explicit git operations to the COMMIT phase section

Add after the status update steps in COMMIT phase:
```markdown
5. **Git commit the completed story:**
   - Stage all changes: `git add -A`
   - Commit with message: `feat({story-key}): implement {story title}`
   - Verify commit succeeded: `git status`

6. **Push to remote (if configured):**
   - Push: `git push`
   - If push fails, log error but continue to next story
```

Also add context-awareness:
```markdown
## Context Management

Before starting each new story, check available context:
- If you have completed 2+ stories in this session, OUTPUT:
  `<promise>SESSION_CHECKPOINT</promise>`
  This signals the loop script to start a fresh session.
- The loop script will resume from the next pending story.
```

#### A2. Fix ralph-run.md — Add Quality Gates Before Commit
**File:** `.claude/commands/ralph-run.md`
**Change:** Add mandatory quality verification before COMMIT phase

Between REVIEW and COMMIT phases, add:
```markdown
## PRE-COMMIT VERIFICATION

Before proceeding to COMMIT:
1. Run `pnpm type-check` — must pass with 0 errors
2. Run `pnpm test` — all tests must pass
3. If either fails: return to IMPLEMENT phase to fix
4. Maximum 2 pre-commit fix cycles before marking story [!]
```

#### A3. Create ralph.sh — Bash Loop for Fresh-Context Execution
**File:** `ralph.sh` (project root)
**Purpose:** The actual Ralph loop that spawns fresh Claude Code CLI sessions per story

```bash
#!/bin/bash
# Ralph-BMAD Loop — Fresh context per story iteration
# Usage: ./ralph.sh [max_iterations]

MAX_ITERATIONS=${1:-20}
ITERATION=0
PLAN_FILE=".ralph-plan.md"
PROGRESS_FILE=".ralph-progress.md"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo "=== Ralph Iteration $ITERATION / $MAX_ITERATIONS ==="

    # Check if all stories are done
    if ! grep -q '^\- \[ \]' "$PLAN_FILE" && ! grep -q '^\- \[~\]' "$PLAN_FILE"; then
        echo "All stories complete!"
        exit 0
    fi

    # Run Claude Code with fresh context
    OUTPUT=$(claude --dangerously-skip-permissions --print "/ralph-run" 2>&1)

    # Check for completion signals
    if echo "$OUTPUT" | grep -q "RALPH_BMAD_COMPLETE"; then
        echo "All stories complete!"
        exit 0
    fi

    if echo "$OUTPUT" | grep -q "RALPH_BMAD_BLOCKED"; then
        echo "All remaining stories blocked. Check .ralph-progress.md"
        exit 1
    fi

    if echo "$OUTPUT" | grep -q "SESSION_CHECKPOINT"; then
        echo "Session checkpoint — starting fresh context..."
    fi

    if echo "$OUTPUT" | grep -q "STORY_COMPLETE"; then
        echo "Story completed. Starting fresh context for next story..."
    fi

    # Brief pause between iterations
    sleep 2
done

echo "Reached max iterations ($MAX_ITERATIONS)"
exit 1
```

#### A4. Create .ralph-progress.md — Cross-Session Memory
**File:** `.ralph-progress.md` (project root)
**Purpose:** Append-only log of completed work, learnings, and patterns

```markdown
# Ralph-BMAD Progress — TrailBlazeAI

Last updated: 2026-02-19
Current story: 3-1 (reset to pending)
Current phase: ORIENT

## Summary
- Stories complete: 8/18
- Stories blocked: 0
- Current sprint: 3
- Total iterations: 0 (fresh start with fixed loop)
- Architect escalations: 0

## Codebase Patterns (Accumulated Learnings)
<!-- Append patterns discovered during implementation here -->
- PipelineClient structural type avoids generated-type lag (from Stories 2.x)
- `as unknown as PipelineClient` is the established cast pattern — never use `as any`
- pg-boss `send()` for job chaining belongs in queue-handlers.ts, NOT in stage functions
- Supabase `insert()` takes an array, not a single object
- YAML prompts loaded at module level (not per-call) for performance

## Completed Stories
### 1-1 through 2-4: COMPLETE (pre-loop, batch committed)
- Completed: 2026-02-19
- Commits: 400e938 (sprint-1), 941a557 (sprint-2)
- Quality: Needs review (implemented in single long session)

## Blocked Stories
(none)
```

#### A5. Create AGENTS.md — Operational Knowledge
**File:** `AGENTS.md` (project root)
**Purpose:** Build/test commands, conventions, and guardrails for Claude Code sessions

```markdown
# AGENTS.md — TrailBlazeAI Operational Knowledge

## Build & Test Commands
- `pnpm test` — Run all tests (Vitest)
- `pnpm type-check` — TypeScript strict check all packages
- `pnpm build` — Build all packages
- `pnpm --filter @trailblaze/api test` — API tests only
- `pnpm --filter @trailblaze/web test` — Web tests only
- `pnpm dev` — Start all dev servers

## Key File Locations
- Story files: `_bmad-output/implementation-artifacts/{story-key}.md`
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- Project context: `_bmad-output/project-context.md`
- Ralph plan: `.ralph-plan.md`
- Ralph progress: `.ralph-progress.md`

## Patterns to Follow
- `PipelineClient` structural type for Supabase (see extract-content.ts)
- `as unknown as PipelineClient` — NEVER use `as any`
- Pipeline stages are pure functions: `(input, supabase) => Promise<void>`
- Queue chaining happens in `queue-handlers.ts`, not in stage functions
- YAML prompts loaded at module level with `readFileSync` + `parseYaml`
- Error handling: throw `PipelineError` from pipeline stages
- API routes: `ApiResponse` envelope (`ApiSuccess<T> | ApiError`)

## Guardrails
- NEVER modify files outside the current story's scope
- NEVER mark tasks [x] without running tests
- NEVER skip RED phase (write failing test first)
- NEVER use `any` type — use `unknown` + Zod/narrowing
- Run full test suite between stories
```

#### A6. Reset Story 3-1 to Pending
**Files:** `.ralph-plan.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`
**Change:** Reset `3-1-content-chunking-with-salesforce-specific-rules` from `[~]`/`in-progress` to `[ ]`/`backlog`

Also delete or regenerate the story file at `_bmad-output/implementation-artifacts/3-1-content-chunking-with-salesforce-specific-rules.md` since it was created in the broken session (the create-story workflow should re-run it in a fresh context to incorporate learnings).

---

### Phase B: Add New Capabilities

#### B1. Create /planning-with-files Skill
**File:** `.claude/skills/planning-with-files/SKILL.md`
**Purpose:** Cross-session context, memory, and task management

```markdown
---
name: planning-with-files
description: Manage context, memory, and task tracking across Claude Code sessions using file-based state. Use at the start of any session to load context or when you need to save progress.
---

# Planning With Files Skill

## Session Start Protocol
1. Read `.ralph-progress.md` for accumulated learnings and current state
2. Read `AGENTS.md` for build commands and patterns
3. Read `.ralph-plan.md` for the implementation plan and current story
4. Read `_bmad-output/implementation-artifacts/sprint-status.yaml` for sprint state

## Session End Protocol
1. Update `.ralph-progress.md` with:
   - Current story status
   - Any new learnings/patterns discovered
   - Files changed
2. Update `AGENTS.md` if new operational patterns were discovered
3. Commit all progress files

## Context Budget Check
Run `/context` to check remaining context budget. If >70% used:
- Save state to .ralph-progress.md
- Output `<promise>SESSION_CHECKPOINT</promise>`
- A fresh session will resume from the checkpoint

## Memory Files
| File | Purpose | When to Update |
|------|---------|---------------|
| `.ralph-progress.md` | What was done, what to do next | After each story |
| `AGENTS.md` | How to build/test, patterns | When patterns discovered |
| `.ralph-plan.md` | Implementation order | After story completion |
| `sprint-status.yaml` | BMAD sprint tracking | After story completion |
```

#### B2. Update ralph-run.md — Single-Story Mode with Context Awareness
**File:** `.claude/commands/ralph-run.md`
**Change:** Add initialization from progress file and single-story-with-exit mode

Add to Initialization section:
```markdown
## Initialization
1. Read `.ralph-progress.md` for accumulated learnings and current state
2. Read `AGENTS.md` for build commands and patterns
3. Read `.ralph-plan.md` for implementation plan
4. Read `_bmad-output/implementation-artifacts/sprint-status.yaml`
5. Read `_bmad-output/project-context.md` for coding standards

## Session Scope
- Implement ONE story per session (default)
- After story completes: commit, update progress, output `<promise>STORY_COMPLETE</promise>`
- If context budget >70% used mid-story: save checkpoint, output `<promise>SESSION_CHECKPOINT</promise>`
- The bash loop (`ralph.sh`) handles spawning fresh sessions
```

#### B3. Update ralph-implementer.md — Reference AGENTS.md
**File:** `.claude/agents/ralph-implementer.md`
**Change:** Add AGENTS.md to the workflow initialization

Add step: `Read AGENTS.md for build commands and established patterns`

#### B4. Update ralph-reviewer.md — Include Commit Check
**File:** `.claude/agents/ralph-reviewer.md`
**Change:** Add verification that story changes are committed

---

### Phase C: Testing Strategy (Git Worktrees)

#### C1. Document Worktree-Based Testing Strategy
**Problem:** User wants to test changes while Ralph loop runs without disrupting the dev environment.

**Solution: Git Worktrees**

Git worktrees allow multiple working directories from the same repo, each on a different branch. This lets you:
- Run Ralph loop on the main working tree (continues development)
- Create a worktree on a testing branch to manually test completed stories

**Commands:**
```bash
# Create a worktree for testing completed stories
git worktree add ../TrailblazeAi-test main

# In the test worktree, cherry-pick or merge Ralph's commits
cd ../TrailblazeAi-test
git merge origin/main  # or specific commits

# Run the full application
pnpm install && pnpm dev

# When done testing, remove the worktree
cd ../TrailblazeAi
git worktree remove ../TrailblazeAi-test
```

**Alternative: Docker-based testing**
Since the project already has Docker compose, you can:
```bash
# Build and run the API + Worker in Docker
cd docker && docker-compose up --build

# This doesn't interfere with the dev environment
```

Add testing instructions to AGENTS.md.

---

### Phase D: Epic 1+2 Quality Review Strategy

#### D1. Create a Quality Review Workflow
**Approach:** Use a git worktree + adversarial review to assess epic 1+2 quality

1. Create a worktree for review: `git worktree add ../TrailblazeAi-review main`
2. In a separate Claude Code session, run `/bmad:bmm:workflows:code-review` against each completed story
3. Document findings in `.ralph-progress.md` under a "Quality Review" section
4. If critical issues found: create fix stories in the sprint plan

This does NOT block the Ralph loop from continuing with story 3-1+.

---

## Execution Order

| Step | Phase | Action | Files |
|------|-------|--------|-------|
| 1 | A6 | Reset story 3-1 to pending | `.ralph-plan.md`, `sprint-status.yaml` |
| 2 | A4 | Create `.ralph-progress.md` | new file |
| 3 | A5 | Create `AGENTS.md` | new file |
| 4 | A1+A2 | Fix ralph-run.md (git commits + quality gates + context mgmt) | `.claude/commands/ralph-run.md` |
| 5 | A3 | Create `ralph.sh` loop script | new file |
| 6 | B1 | Create /planning-with-files skill | new file |
| 7 | B2 | Update ralph-run.md single-story mode | `.claude/commands/ralph-run.md` |
| 8 | B3+B4 | Update subagent files | `.claude/agents/*.md` |
| 9 | C1 | Document testing strategy in AGENTS.md | `AGENTS.md` |
| 10 | D1 | Quality review prompt for epic 1+2 | documented in plan |

---

## Prompts for Claude Code (Web + CLI)

### Prompt 1: Start Ralph Loop (CLI)
```bash
# Make ralph.sh executable and run
chmod +x ralph.sh
./ralph.sh 20
```

### Prompt 2: Run Single Story (CLI — manual mode)
```
/ralph-run
```
(The updated ralph-run will now handle one story, commit, and exit)

### Prompt 3: Run Single Story (Web — manual mode)
```
Read .ralph-progress.md, AGENTS.md, and .ralph-plan.md.
Find the next pending story whose dependencies are met.
Follow the ORIENT → IMPLEMENT → QA → REVIEW → COMMIT cycle from .claude/commands/ralph-run.md.
After completing the story, commit all changes and update .ralph-progress.md.
```

### Prompt 4: Quality Review (CLI or Web)
```
/bmad:bmm:workflows:code-review

Review story 1-1-api-foundation-and-docker-deployment against its acceptance criteria.
Story file: _bmad-output/implementation-artifacts/1-1-api-foundation-and-docker-deployment.md
```

### Prompt 5: Test with Worktree (CLI)
```bash
# Create test worktree
git worktree add ../TrailblazeAi-test main

# In test worktree
cd ../TrailblazeAi-test
pnpm install
pnpm dev  # Start dev servers to test
```

### Prompt 6: Planning Session (CLI or Web)
```
/planning-with-files

Load my current Ralph-BMAD state and show me:
1. Current sprint progress
2. Next story to implement
3. Any blocked stories
4. Accumulated learnings
```

---

## Verification Criteria

After implementation, verify:
- [ ] `ralph-run.md` COMMIT phase includes `git add`, `git commit`, `git push`
- [ ] `ralph-run.md` has quality gates (pnpm test, pnpm type-check) before COMMIT
- [ ] `ralph-run.md` has SESSION_CHECKPOINT signal for context management
- [ ] `ralph.sh` exists and is executable
- [ ] `ralph.sh` handles STORY_COMPLETE, SESSION_CHECKPOINT, RALPH_BMAD_COMPLETE, RALPH_BMAD_BLOCKED
- [ ] `.ralph-progress.md` exists with correct initial state
- [ ] `AGENTS.md` exists with build commands and patterns
- [ ] Story 3-1 is reset to pending in `.ralph-plan.md` and `sprint-status.yaml`
- [ ] `/planning-with-files` skill exists at `.claude/skills/planning-with-files/SKILL.md`
- [ ] All subagent files reference AGENTS.md
- [ ] Worktree testing strategy documented
