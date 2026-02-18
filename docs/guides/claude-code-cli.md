# Claude Code CLI Developer Guide -- TrailblazeAi

This guide covers how to use the Claude Code CLI for day-to-day development on the TrailblazeAi project. It is written for developers joining the team or picking up work on this codebase.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Configuration](#project-configuration)
3. [Working with BMAD V6 Workflow](#working-with-bmad-v6-workflow)
4. [Key Workflows](#key-workflows)
5. [MCP Servers](#mcp-servers)
6. [Tips and Best Practices](#tips-and-best-practices)
7. [Continuing Work Between Sessions](#continuing-work-between-sessions)

---

## Getting Started

### Installation

Install the Claude Code CLI globally:

```bash
npm install -g @anthropic-ai/claude-code
```

Verify the installation:

```bash
claude --version
```

### Authentication

Set your Anthropic API key as an environment variable. Add the following to your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent):

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Reload your shell or run `source ~/.bashrc` (or equivalent) after adding the key.

You can also pass the key inline for a single session:

```bash
ANTHROPIC_API_KEY="sk-ant-..." claude
```

### Running Claude Code

Navigate to the project root and start a session:

```bash
cd /path/to/TrailblazeAi
claude
```

Claude Code automatically reads the project configuration files (`.claude/`, `CLAUDE.md`) when launched from the project directory. Always launch from the repo root so that all MCP servers, permissions, and slash commands are available.

---

## Project Configuration

The project ships four configuration touchpoints that Claude Code reads on startup. Understanding each one helps you troubleshoot issues and customize behavior.

### `CLAUDE.md` -- Project Context File

Located at the repository root, `CLAUDE.md` is the primary project context document. Claude Code reads this file automatically at the start of every session. It contains:

- **Architecture overview** -- Frontend (Next.js 15), Backend (Fastify 5), Database (Supabase), AI (Claude API via AI SDK v5), Browser Automation (Playwright MCP), Job Queue (pg-boss).
- **Monorepo structure** -- Where each app and package lives (`apps/web/`, `apps/api/`, `packages/db/`, `packages/shared/`, `docker/`, `_bmad/`, `_bmad-output/`).
- **Key commands** -- `pnpm dev`, `pnpm build`, `pnpm type-check`, `pnpm clean`, and per-app filter commands.
- **Code conventions** -- TypeScript strict mode, ESM everywhere, Zod validation, Tailwind v4, shadcn/ui, Prettier.
- **BMAD reference** -- Pointers to the BMAD framework, config, output, and workflow status.
- **Important paths** -- Quick-reference table for planning artifacts, UI components, Supabase clients, config, types, and Docker files.
- **Environment variables** -- Reference to `.env.example` for Supabase, Anthropic, VPS, Salesforce, and Playwright settings.

If you need to add project-wide instructions that Claude should always follow, edit `CLAUDE.md`.

### `.claude/mcp.json` -- MCP Server Configuration

This file declares the Model Context Protocol servers that Claude Code connects to during a session. The project configures four servers:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "${SUPABASE_ACCESS_TOKEN}"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "./"]
    }
  }
}
```

| Server | Purpose |
|--------|---------|
| `playwright` | Browser automation for Trailhead content extraction and quiz interaction |
| `supabase` | Direct database operations -- schema inspection, queries, migrations |
| `sequential-thinking` | Structured multi-step reasoning for complex architectural and debugging tasks |
| `filesystem` | File system access scoped to the project directory |

**Note:** The `supabase` server requires `SUPABASE_ACCESS_TOKEN` to be set in your environment. Make sure this is configured before starting a session that needs database access.

### `.claude/settings.json` -- Permissions and Environment

This file controls what Claude Code is allowed to do and sets environment variables for every session:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)", "Bash(pnpm:*)", "Bash(npx:*)", "Bash(turbo:*)",
      "Bash(git:*)", "Bash(gh:*)", "Bash(docker:*)", "Bash(docker-compose:*)",
      "Bash(node:*)", "Bash(tsx:*)", "Bash(tsc:*)",
      "Bash(prettier:*)", "Bash(eslint:*)",
      "Read", "Write", "Edit", "Glob", "Grep", "WebFetch",
      "mcp__playwright__*", "mcp__supabase__*"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(sudo:*)",
      "Bash(curl|wget:*bash*)"
    ]
  },
  "env": {
    "NODE_ENV": "development",
    "TURBO_TELEMETRY_DISABLED": "1"
  }
}
```

Key points:

- **Allowed:** All standard dev toolchain commands (pnpm, git, docker, node, tsx, tsc, prettier, eslint), file operations, web fetching, and both the Playwright and Supabase MCP servers.
- **Denied:** Destructive root-level deletions, sudo, and piping downloaded scripts to bash.
- **Environment:** Forces `NODE_ENV=development` and disables Turbo telemetry.

If you need Claude to run a command that is not in the allow list, you will be prompted for permission at runtime. You can add frequently-used commands to the allow list here.

### `.claude/commands/` -- BMAD V6 Slash Commands

The `.claude/commands/` directory contains markdown files that register as slash commands in Claude Code. The project ships commands organized into four BMAD modules:

```
.claude/commands/bmad/
  core/           -> Core BMAD commands (bmad-master agent, brainstorming, party-mode)
  bmm/            -> BMAD Method Module (main development workflows and agents)
  bmb/            -> BMAD Builder Module (build new agents, workflows, modules)
  cis/            -> Creative and Innovation Suite (problem-solving, design thinking, storytelling)
```

You invoke these commands by typing the slash-command path in the Claude Code prompt. For example:

```
/bmad:bmm:workflows:workflow-status
```

This triggers the workflow-status command defined in `.claude/commands/bmad/bmm/workflows/workflow-status.md`.

---

## Working with BMAD V6 Workflow

BMAD (Build Measure Analyze Decide) V6 is the project management and development methodology framework integrated into this project. It provides structured workflows for every phase from initial analysis through implementation and retrospective.

### BMAD Modules

The installation includes four modules (defined in `_bmad/_config/manifest.yaml`):

| Module | Purpose |
|--------|---------|
| `core` | Foundation -- bmad-master agent, brainstorming workflows, party-mode, document indexing |
| `bmm` | BMAD Method Module -- the full development lifecycle: analysis, planning, solutioning, implementation |
| `bmb` | BMAD Builder Module -- create new agents, workflows, and modules for the framework itself |
| `cis` | Creative and Innovation Suite -- problem-solving, design thinking, innovation strategy, storytelling |

### BMM Workflow Slash Commands Reference

These are the primary commands you will use during development. They are organized by the BMAD phase they belong to.

#### Phase 1: Analysis

| Command | Description |
|---------|-------------|
| `/bmad:bmm:workflows:research` | Conduct comprehensive research (market, technical, domain) using web data and verified sources |
| `/bmad:bmm:workflows:create-product-brief` | Create a product brief through collaborative step-by-step discovery |

#### Phase 2: Planning

| Command | Description |
|---------|-------------|
| `/bmad:bmm:workflows:prd` | PRD tri-modal workflow -- Create, Validate, or Edit comprehensive PRDs |
| `/bmad:bmm:workflows:create-ux-design` | Collaborate with a UX Design expert to plan application UX patterns and look/feel |

#### Phase 3: Solutioning

| Command | Description |
|---------|-------------|
| `/bmad:bmm:workflows:create-architecture` | Collaborative architectural decision facilitation producing a decision-focused architecture document |
| `/bmad:bmm:workflows:create-epics-and-stories` | Transform PRD + Architecture into comprehensive epics and user stories organized by user value |
| `/bmad:bmm:workflows:check-implementation-readiness` | Adversarial validation of PRD, Architecture, and Epics for completeness and alignment before implementation |

#### Phase 4: Implementation

| Command | Description |
|---------|-------------|
| `/bmad:bmm:workflows:sprint-planning` | Generate and manage the sprint status tracking file, extracting epics and stories |
| `/bmad:bmm:workflows:sprint-status` | Summarize sprint-status.yaml, surface risks, and route to the right implementation workflow |
| `/bmad:bmm:workflows:create-story` | Create the next user story from epics with enhanced context analysis |
| `/bmad:bmm:workflows:dev-story` | Execute a story by implementing tasks/subtasks, writing tests, validating, and updating the story file |
| `/bmad:bmm:workflows:code-review` | Adversarial Senior Developer code review that finds 3-10 specific problems in every story |
| `/bmad:bmm:workflows:retrospective` | Review after epic completion -- extract lessons learned and assess impact on next epic |
| `/bmad:bmm:workflows:correct-course` | Navigate significant changes during sprint execution by analyzing impact and proposing solutions |

#### Cross-Phase / Utility

| Command | Description |
|---------|-------------|
| `/bmad:bmm:workflows:workflow-status` | Lightweight status checker -- answers "what should I do now?" Reads the YAML status file |
| `/bmad:bmm:workflows:workflow-init` | Initialize a new BMM project by determining level, type, and creating the workflow path |
| `/bmad:bmm:workflows:quick-dev` | Flexible development -- execute tech-specs or direct instructions with optional planning |
| `/bmad:bmm:workflows:quick-spec` | Conversational spec engineering -- ask questions, investigate code, produce implementation-ready tech-spec |
| `/bmad:bmm:workflows:generate-project-context` | Create a concise project-context.md with critical rules and patterns for AI agents |
| `/bmad:bmm:workflows:document-project` | Analyze and document brownfield projects by scanning codebase, architecture, and patterns |

#### Testing Workflows

| Command | Description |
|---------|-------------|
| `/bmad:bmm:workflows:testarch-test-design` | System-level testability review |
| `/bmad:bmm:workflows:testarch-automate` | Test automation workflow |
| `/bmad:bmm:workflows:testarch-nfr` | Non-functional requirements testing |
| `/bmad:bmm:workflows:testarch-test-review` | Test review workflow |
| `/bmad:bmm:workflows:testarch-trace` | Requirements traceability |
| `/bmad:bmm:workflows:testarch-atdd` | Acceptance test-driven development |
| `/bmad:bmm:workflows:testarch-framework` | Test framework setup |
| `/bmad:bmm:workflows:testarch-ci` | CI integration for tests |

#### Diagramming Workflows

| Command | Description |
|---------|-------------|
| `/bmad:bmm:workflows:create-excalidraw-diagram` | General Excalidraw diagram |
| `/bmad:bmm:workflows:create-excalidraw-flowchart` | Excalidraw flowchart |
| `/bmad:bmm:workflows:create-excalidraw-dataflow` | Excalidraw data flow diagram |
| `/bmad:bmm:workflows:create-excalidraw-wireframe` | Excalidraw wireframe |

### BMM Agent Commands

Agents are specialized personas that Claude adopts for specific types of work. Invoke them when you need domain expertise:

| Command | Description |
|---------|-------------|
| `/bmad:bmm:agents:analyst` | Business Analyst -- research, product briefs, requirements gathering |
| `/bmad:bmm:agents:pm` | Product Manager -- PRDs, epics and stories, feature prioritization |
| `/bmad:bmm:agents:architect` | Software Architect -- architecture decisions, technical design |
| `/bmad:bmm:agents:dev` | Developer -- implementation, coding, debugging |
| `/bmad:bmm:agents:sm` | Scrum Master -- sprint planning, status tracking, retrospectives |
| `/bmad:bmm:agents:tea` | Test Engineering Architect -- test strategy, automation, quality |
| `/bmad:bmm:agents:ux-designer` | UX Designer -- interface design, user flows, accessibility |
| `/bmad:bmm:agents:tech-writer` | Technical Writer -- documentation, guides, API docs |
| `/bmad:bmm:agents:quick-flow-solo-dev` | Quick Flow Solo Dev -- streamlined single-developer workflow |

### Core Commands

| Command | Description |
|---------|-------------|
| `/bmad:core:agents:bmad-master` | The BMAD master agent -- orchestrates other agents, provides menus |
| `/bmad:core:workflows:brainstorming` | Structured brainstorming sessions with multiple techniques |
| `/bmad:core:workflows:party-mode` | Multi-agent discussion -- load several agent personas for collaborative discussion |
| `/bmad:core:tasks:index-docs` | Index documentation files for reference |
| `/bmad:core:tasks:shard-doc` | Shard large documents into smaller pieces |

### Checking Workflow Status

At any point, run:

```
/bmad:bmm:workflows:workflow-status
```

This reads `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` and tells you:

- Which phases are complete (shown as file paths to their outputs)
- Which phases are still required, optional, or skipped
- What the next recommended action is

The current project status file shows four phases:

1. **Analysis** -- research and product brief are complete.
2. **Planning** -- PRD and UX design are complete.
3. **Solutioning** -- architecture is complete; epics/stories and implementation readiness still need to be done.
4. **Implementation** -- sprint planning and all subsequent work begins after solutioning is complete.

---

## Key Workflows

### Starting a New Feature (Full BMAD Method)

If you are starting from scratch or adding a major feature that needs full planning, follow the BMAD phases in order:

```
1. /bmad:bmm:workflows:workflow-init          # Initialize project tracking
2. /bmad:bmm:workflows:research               # Conduct research (optional)
3. /bmad:bmm:workflows:create-product-brief   # Define the product brief
4. /bmad:bmm:workflows:prd                    # Create the PRD
5. /bmad:bmm:workflows:create-ux-design       # Design UX (if UI involved)
6. /bmad:bmm:workflows:create-architecture    # Define architecture
7. /bmad:bmm:workflows:create-epics-and-stories  # Break down into epics/stories
8. /bmad:bmm:workflows:check-implementation-readiness  # Validate everything
9. /bmad:bmm:workflows:sprint-planning        # Plan the sprint
10. /bmad:bmm:workflows:dev-story             # Execute stories one by one
```

Each workflow produces artifacts in `_bmad-output/planning-artifacts/` that subsequent workflows consume. The workflow-status file tracks progress through these phases.

### Quick Development (Skip Planning)

For smaller changes, bug fixes, or when you already have a clear spec:

```
/bmad:bmm:workflows:quick-dev
```

This workflow supports executing tech-specs or direct instructions with optional lightweight planning. Pair it with:

```
/bmad:bmm:workflows:quick-spec
```

The quick-spec command starts a conversational session where Claude asks questions and investigates your code to produce an implementation-ready tech-spec, which quick-dev can then execute.

### Sprint Management Cycle

Once epics and stories exist, the sprint management cycle is:

```
1. /bmad:bmm:workflows:sprint-planning    # Create sprint plan from available stories
2. /bmad:bmm:workflows:sprint-status      # Check progress, surface risks
3. /bmad:bmm:workflows:create-story       # Detail the next story for implementation
4. /bmad:bmm:workflows:dev-story          # Implement the story
5. /bmad:bmm:workflows:code-review        # Adversarial review of the implementation
6. /bmad:bmm:workflows:retrospective      # Review after epic completion
```

If something changes mid-sprint that requires replanning:

```
/bmad:bmm:workflows:correct-course
```

### Code Review

The code review workflow is adversarial by design. It acts as a Senior Developer reviewer that:

- Finds 3-10 specific problems in every story
- Challenges code quality, test coverage, architecture compliance, security, and performance
- Never accepts "looks good" -- it must find minimum issues
- Can auto-fix issues with your approval

Run it after completing a story:

```
/bmad:bmm:workflows:code-review
```

---

## MCP Servers

The project configures four MCP (Model Context Protocol) servers that extend Claude Code's capabilities beyond text generation.

### Playwright MCP

**What it does:** Provides browser automation capabilities. Claude can launch a browser, navigate to URLs, interact with page elements, fill forms, click buttons, and extract content.

**How it is used in this project:**
- Extracting Trailhead module content (lessons, text, images)
- Interacting with Trailhead quizzes (reading questions, selecting answers, submitting)
- Scraping unit and module metadata from Trailhead pages

**Invoked via:** `mcp__playwright__*` tools (e.g., `mcp__playwright__browser_navigate`, `mcp__playwright__browser_click`).

**Prerequisite:** A Chromium-compatible browser must be available on the system. The `@playwright/mcp` package handles browser management.

### Supabase MCP

**What it does:** Provides direct access to the Supabase PostgreSQL database. Claude can inspect schemas, run queries, create and run migrations, and manage database resources.

**How it is used in this project:**
- Inspecting and modifying the database schema (modules, units, quizzes, knowledge_entries, progress tables)
- Running queries to check data integrity
- Creating database migrations
- Seeding development data

**Invoked via:** `mcp__supabase__*` tools.

**Prerequisite:** `SUPABASE_ACCESS_TOKEN` must be set in your environment. This is the Supabase Management API access token (not the anon key).

### Sequential Thinking MCP

**What it does:** Provides a structured, multi-step reasoning tool. Claude can break complex problems into sequential thought steps, revise earlier conclusions, and branch into alternative paths.

**How it is used in this project:**
- Debugging complex multi-system issues (frontend + API + database interactions)
- Architectural decision analysis (weighing trade-offs across multiple dimensions)
- Planning implementation strategies for stories that touch many files
- Reasoning through Trailhead quiz answers when content is ambiguous

**Invoked via:** `mcp__sequential-thinking__sequentialthinking` tool. No environment variables required.

### Filesystem MCP

**What it does:** Provides file system access tools (read, write, list, search) scoped to the project directory.

**How it is used in this project:** General-purpose file operations as a supplement to Claude Code's built-in file tools. Scoped to `./` (the project root).

**Invoked via:** `mcp__filesystem__*` tools. No environment variables required.

---

## Tips and Best Practices

### Always Check Status First

When starting a new session or returning after a break, begin with:

```
/bmad:bmm:workflows:workflow-status
```

This tells you exactly where the project stands and what to do next. It reads `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` and gives you actionable guidance.

### Use the Right Agent for the Job

BMAD agents carry specialized personas and knowledge. Invoking the right agent before a task improves output quality:

- Need to refine requirements? Load `/bmad:bmm:agents:pm`
- Debugging an architecture issue? Load `/bmad:bmm:agents:architect`
- Writing tests? Load `/bmad:bmm:agents:tea`
- Implementing a story? Load `/bmad:bmm:agents:dev`

You can also use `/bmad:core:agents:bmad-master` to get a menu-driven interface for selecting the right agent.

### Use Subagents for Specialized Tasks

Claude Code supports spawning subagents for parallel or specialized work. This is useful when:

- You need to research something while continuing to code
- A task requires a different agent persona than your current one
- You want to run tests in the background while implementing the next task

### Leverage Quick Flows for Small Changes

Not every change needs the full BMAD planning cycle. For bug fixes, small features, or changes with a clear scope:

1. `/bmad:bmm:workflows:quick-spec` -- Have Claude ask questions and generate a focused tech-spec
2. `/bmad:bmm:workflows:quick-dev` -- Execute the spec or direct instructions

### Reference Planning Artifacts

All planning output lives in `_bmad-output/planning-artifacts/`. Key files to reference:

| File | Content |
|------|---------|
| `bmm-workflow-status.yaml` | Current workflow phase tracking |
| `product-brief-TrailblazeAi-2026-02-17.md` | Product brief (5 sections) |
| `prd.md` | Product requirements (37 FRs, 25 NFRs) |
| `architecture.md` | Architecture decisions (15 decisions, 23 patterns) |
| `ux-design-specification.md` | UX specification (9 custom components, 4 journey flows) |
| `research/` | Research documents (Architecture Blueprint, Action Plan) |

When implementing, always refer back to these artifacts. Claude reads them during workflows to maintain consistency.

### Cost-Conscious Development

- For simple tasks (formatting, renaming, small edits), you can describe exactly what you want rather than invoking a full workflow.
- Use `/bmad:bmm:workflows:quick-dev` instead of the full planning cycle for small changes.
- The sequential-thinking MCP server adds context window usage; use it only when facing genuinely complex multi-step reasoning problems.

### Keep CLAUDE.md Updated

If you establish new conventions, add important paths, or change the architecture, update `CLAUDE.md`. Every Claude Code session reads it, so it is the single most important file for maintaining consistency across sessions and team members.

---

## Continuing Work Between Sessions

Claude Code sessions are stateless -- each new `claude` invocation starts fresh. Here is how to efficiently pick up where you left off.

### Step 1: Check Workflow Status

```
/bmad:bmm:workflows:workflow-status
```

This reads the YAML status file and tells you the current phase, what is complete, and what needs to happen next. It is the fastest way to orient yourself.

### Step 2: Check Sprint Status (If in Implementation Phase)

If the project is in Phase 4 (Implementation), sprint tracking moves to a separate file:

```
/bmad:bmm:workflows:sprint-status
```

This summarizes the current sprint, surfaces risks, and tells you which story to work on next.

### Step 3: Review Recent Git History

Check what was done in previous sessions:

```bash
git log --oneline -20
```

This gives context on what was recently implemented, which stories were completed, and what branch you should be on.

### Step 4: Resume the Current Story

If there is an in-progress story, resume it:

```
/bmad:bmm:workflows:dev-story
```

The dev-story workflow reads the story file, checks what tasks and subtasks remain, and picks up implementation from where it left off.

### Step 5: Run a Code Review (If Story Is Complete)

If the previous session completed a story but did not review it:

```
/bmad:bmm:workflows:code-review
```

### Quick Resume Checklist

For the fastest possible resume, run these in order:

1. `claude` -- Start a session from the project root
2. `/bmad:bmm:workflows:workflow-status` -- Where are we?
3. `/bmad:bmm:workflows:sprint-status` -- What is the sprint state? (if in Phase 4)
4. Check `git log --oneline -10` and `git status` -- What changed recently?
5. `/bmad:bmm:workflows:dev-story` -- Continue implementing

### Handing Off to Another Developer

When you finish a session and another developer will pick up:

1. Commit and push all changes.
2. Make sure the story file is updated with task completion status.
3. Run `/bmad:bmm:workflows:sprint-status` so the status file is current.
4. The next developer starts with `/bmad:bmm:workflows:workflow-status` and has full context.

---

## Appendix: File Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project context -- read by Claude Code on every session start |
| `.claude/mcp.json` | MCP server declarations (Playwright, Supabase, sequential-thinking, filesystem) |
| `.claude/settings.json` | Permissions (allow/deny lists) and environment variables |
| `.claude/commands/bmad/` | All BMAD slash commands organized by module |

### BMAD Framework Files

| Path | Purpose |
|------|---------|
| `_bmad/` | BMAD V6 framework source (agents, workflows, templates, config) |
| `_bmad/_config/manifest.yaml` | Installed modules and IDE configurations |
| `_bmad/_config/ides/claude-code.yaml` | Claude Code-specific BMAD configuration |
| `_bmad/bmm/` | BMAD Method Module -- core development lifecycle workflows |
| `_bmad/cis/` | Creative and Innovation Suite workflows and agents |
| `_bmad/bmb/` | BMAD Builder Module -- build new framework components |
| `_bmad/core/` | Core BMAD tasks, resources, and workflows |

### Planning Artifacts

| Path | Purpose |
|------|---------|
| `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` | Workflow phase tracking |
| `_bmad-output/planning-artifacts/product-brief-TrailblazeAi-2026-02-17.md` | Product brief |
| `_bmad-output/planning-artifacts/prd.md` | Product requirements document |
| `_bmad-output/planning-artifacts/architecture.md` | Architecture decisions document |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | UX design specification |
| `_bmad-output/planning-artifacts/research/` | Research documents |

### Project Source Code

| Path | Purpose |
|------|---------|
| `apps/web/` | Next.js 15 frontend (Tailwind v4, shadcn/ui) |
| `apps/api/` | Fastify 5 backend (pg-boss, AI SDK) |
| `packages/db/` | Supabase client factory and generated types |
| `packages/shared/` | Domain types (Trailhead models) and constants |
| `docker/` | Docker Compose and Dockerfiles |
