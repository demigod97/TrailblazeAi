# Google Gemini CLI Developer Guide

Guide for working with Google Gemini CLI on the TrailblazeAi project.

## Table of Contents

- [Setup](#setup)
- [Configuration](#configuration)
- [Working with the Project](#working-with-the-project)
- [BMAD Integration](#bmad-integration)
- [Key Commands](#key-commands)
- [Model Selection](#model-selection)
- [Best Practices](#best-practices)
- [Continuing Work](#continuing-work)
- [Limitations](#limitations)

---

## Setup

### Installation

Install the Gemini CLI globally via npm:

```bash
npm install -g @google/gemini-cli
```

Or via Google's distribution method if available. Verify the installation:

```bash
gemini --version
```

### Authentication

Gemini CLI requires a Google API key for authentication. You can authenticate in one of two ways:

1. **Environment variable** -- Set `GOOGLE_API_KEY` in your shell profile or `.env`:

   ```bash
   export GOOGLE_API_KEY="your-google-api-key"
   ```

2. **Interactive login** -- Run `gemini` and follow the browser-based authentication flow when prompted.

You can obtain an API key from [Google AI Studio](https://aistudio.google.com/apikey).

---

## Configuration

### Settings File

The project includes a pre-configured `.gemini/settings.json` at the repository root:

```json
{
  "model": "gemini-2.5-flash",
  "codeExecution": true,
  "sandbox": false,
  "systemInstruction": "You are working on TrailblazeAi, an AI-powered Salesforce Trailhead completion assistant. Follow the project conventions in CLAUDE.md. Use TypeScript strict mode, ESM modules, Zod validation. The monorepo has apps/web (Next.js 15), apps/api (Fastify 5), packages/db (Supabase), packages/shared (types). Use pnpm for package management and turbo for task running."
}
```

Key settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| `model` | `gemini-2.5-flash` | Default model for cost-efficient everyday tasks |
| `codeExecution` | `true` | Allows Gemini to run code snippets |
| `sandbox` | `false` | Allows file system access for the monorepo |
| `systemInstruction` | _(see above)_ | Provides project context on every request |

### Project Context: GEMINI.md

The `.gemini/GEMINI.md` file serves as the project context document that Gemini CLI automatically reads at session start. It mirrors the content of `CLAUDE.md` and provides Gemini with:

- Project architecture overview (Next.js 15, Fastify 5, Supabase, Claude API)
- Monorepo structure (`apps/web`, `apps/api`, `packages/db`, `packages/shared`)
- Key commands (`pnpm dev`, `pnpm build`, `pnpm type-check`)
- Code conventions (TypeScript strict mode, ESM, Zod validation, Tailwind v4)
- Important file paths and their purposes
- BMAD framework reference points
- Environment variable documentation

If you update `CLAUDE.md`, keep `GEMINI.md` in sync to ensure consistent behavior across AI tools.

### Slash Commands Directory

The `.gemini/commands/` directory contains `.toml` files that define slash commands for Gemini CLI. Each `.toml` file maps a slash command name to a prompt that activates a specific BMAD agent or workflow. These commands are available when running Gemini CLI from the project root.

---

## Working with the Project

### Understanding the Monorepo

When working with Gemini CLI, be aware of the monorepo structure:

```
apps/
  web/          -- Next.js 15, Tailwind v4, shadcn/ui (deployed to Vercel)
  api/          -- Fastify 5, pg-boss, AI SDK (Docker on Hetzner VPS)
packages/
  db/           -- Supabase client factory + generated types
  shared/       -- Domain types (Trailhead models) + constants
docker/         -- Compose + Dockerfiles for API + Worker
_bmad/          -- BMAD V6 framework (agents, workflows)
_bmad-output/   -- Planning artifacts, research docs, project context
```

### Running Builds and Type Checks

From the project root, use pnpm with Turborepo:

```bash
# Start all dev servers
pnpm dev

# Build all packages
pnpm build

# TypeScript check all packages
pnpm type-check

# Clean build artifacts
pnpm clean

# Target a specific workspace
pnpm --filter @trailblaze/web dev     # Next.js dev server
pnpm --filter @trailblaze/api dev     # Fastify dev server (tsx watch)
```

When asking Gemini to run these commands, it can execute them directly thanks to the `codeExecution: true` setting.

### Code Conventions to Communicate

When prompting Gemini for code generation, reference these conventions:

- **TypeScript strict mode** -- No `any` types; use `unknown` and narrow with type guards or Zod
- **`noUncheckedIndexedAccess`** -- Always handle potential `undefined` from index access
- **ESM everywhere** -- Use `import`/`export`, never `require()`
- **Zod validation** -- All external data boundaries (env vars, API inputs, responses)
- **Tailwind CSS v4** -- CSS-first config with `@import "tailwindcss"`, not `tailwind.config.ts`
- **shadcn/ui** -- new-york style, radix-ui primitives, components in `apps/web/src/components/ui/`
- **Import alias** -- `@/*` maps to `src/` in `apps/web`

---

## BMAD Integration

### What is BMAD?

BMAD (Build Measure Analyze Design) V6 is a framework for AI-assisted software development methodology. It provides structured agents, workflows, and templates that guide the development process from analysis through implementation. The framework lives in the `_bmad/` directory.

### Commands as .toml Files

All BMAD commands are available as `.toml` files in `.gemini/commands/`. Each file defines a `description` and a `prompt` that instructs Gemini to load and execute a specific BMAD agent or workflow.

Commands fall into three categories:

#### Agent Commands (activate a persona)

Agent commands load a specific BMAD agent persona. The agent stays in character and provides a menu system for interaction.

| Command | Description |
|---------|-------------|
| `/bmad-agent-bmm-dev` | Activates the Dev agent persona |
| `/bmad-agent-bmm-architect` | Activates the Architect agent persona |
| `/bmad-agent-bmm-pm` | Activates the Product Manager agent persona |
| `/bmad-agent-bmm-sm` | Activates the Scrum Master agent persona |
| `/bmad-agent-bmm-tea` | Activates the Test Engineering Agent persona |
| `/bmad-agent-bmm-analyst` | Activates the Analyst agent persona |
| `/bmad-agent-bmm-ux-designer` | Activates the UX Designer agent persona |
| `/bmad-agent-bmm-tech-writer` | Activates the Tech Writer agent persona |
| `/bmad-agent-bmm-quick-flow-solo-dev` | Activates the Quick Flow Solo Dev agent |
| `/bmad-agent-core-bmad-master` | Activates the BMAD Master (meta-agent) |
| `/bmad-agent-bmb-workflow-builder` | BMAD Builder: creates workflows |
| `/bmad-agent-bmb-module-builder` | BMAD Builder: creates modules |
| `/bmad-agent-bmb-agent-builder` | BMAD Builder: creates agents |

#### Workflow Commands (execute a structured process)

Workflow commands load the workflow engine and execute a specific workflow configuration with defined steps.

| Command | Description |
|---------|-------------|
| `/bmad-workflow-bmm-dev-story` | Implement a user story (Phase 4) |
| `/bmad-workflow-bmm-create-story` | Create a user story (Phase 4) |
| `/bmad-workflow-bmm-code-review` | Structured code review (Phase 4) |
| `/bmad-workflow-bmm-sprint-planning` | Sprint planning session (Phase 4) |
| `/bmad-workflow-bmm-sprint-status` | Check sprint status (Phase 4) |
| `/bmad-workflow-bmm-retrospective` | Sprint retrospective (Phase 4) |
| `/bmad-workflow-bmm-quick-dev` | Quick development flow |
| `/bmad-workflow-bmm-quick-spec` | Quick specification creation |
| `/bmad-workflow-bmm-research` | Research workflow (Phase 1) |
| `/bmad-workflow-bmm-create-product-brief` | Create product brief (Phase 1) |
| `/bmad-workflow-bmm-prd` | Create PRD (Phase 2) |
| `/bmad-workflow-bmm-create-ux-design` | Create UX design spec (Phase 2) |
| `/bmad-workflow-bmm-create-architecture` | Create architecture doc (Phase 3) |
| `/bmad-workflow-bmm-create-epics-and-stories` | Break PRD into epics/stories (Phase 3) |
| `/bmad-workflow-bmm-check-implementation-readiness` | Gate check before implementation |
| `/bmad-workflow-bmm-workflow-status` | Check overall workflow progress |
| `/bmad-workflow-bmm-workflow-init` | Initialize the workflow tracker |
| `/bmad-workflow-bmm-correct-course` | Course correction workflow |
| `/bmad-workflow-bmm-generate-project-context` | Generate project context document |
| `/bmad-workflow-bmm-document-project` | Document the project |

#### Test Architecture Commands

| Command | Description |
|---------|-------------|
| `/bmad-workflow-bmm-testarch-framework` | Test framework setup |
| `/bmad-workflow-bmm-testarch-trace` | Traceability analysis |
| `/bmad-workflow-bmm-testarch-ci` | CI test integration |
| `/bmad-workflow-bmm-testarch-atdd` | Acceptance test-driven development |
| `/bmad-workflow-bmm-testarch-nfr` | Non-functional requirements testing |
| `/bmad-workflow-bmm-testarch-test-design` | Test design workflow |
| `/bmad-workflow-bmm-testarch-test-review` | Test review workflow |
| `/bmad-workflow-bmm-testarch-automate` | Test automation workflow |

#### Creative & Innovation Commands

| Command | Description |
|---------|-------------|
| `/bmad-workflow-core-brainstorming` | Brainstorming session |
| `/bmad-workflow-core-party-mode` | Multi-agent discussion |
| `/bmad-workflow-cis-design-thinking` | Design thinking workshop |
| `/bmad-workflow-cis-problem-solving` | Problem solving session |
| `/bmad-workflow-cis-storytelling` | Storytelling workshop |
| `/bmad-workflow-cis-innovation-strategy` | Innovation strategy session |

#### Task Commands

| Command | Description |
|---------|-------------|
| `/bmad-task-core-workflow` | Core workflow task execution |
| `/bmad-task-core-review-adversarial-general` | Adversarial review |
| `/bmad-task-core-shard-doc` | Document sharding |
| `/bmad-task-core-index-docs` | Index documentation |

#### Diagram Commands

| Command | Description |
|---------|-------------|
| `/bmad-workflow-bmm-create-excalidraw-diagram` | Create Excalidraw diagram |
| `/bmad-workflow-bmm-create-excalidraw-flowchart` | Create Excalidraw flowchart |
| `/bmad-workflow-bmm-create-excalidraw-dataflow` | Create data flow diagram |
| `/bmad-workflow-bmm-create-excalidraw-wireframe` | Create wireframe diagram |

### Checking Project Status

To see where the project stands in the BMAD methodology:

```
/bmad-workflow-bmm-workflow-status
```

The workflow status is tracked in `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`. The project follows a phased approach:

1. **Phase 1 -- Analysis**: Research, product brief (completed)
2. **Phase 2 -- Planning**: PRD, UX design (completed)
3. **Phase 3 -- Solutioning**: Architecture, epics/stories, readiness check
4. **Phase 4 -- Implementation**: Sprint planning, story development, code review

---

## Key Commands

### Daily Development Workflow

```
# Start a development session
/bmad-agent-bmm-dev

# Pick up a story to implement
/bmad-workflow-bmm-dev-story

# Quick development without full ceremony
/bmad-workflow-bmm-quick-dev

# Review code before committing
/bmad-workflow-bmm-code-review
```

### Planning & Architecture

```
# Check where the project is in the BMAD process
/bmad-workflow-bmm-workflow-status

# Create or refine architecture
/bmad-workflow-bmm-create-architecture

# Break down work into implementable stories
/bmad-workflow-bmm-create-epics-and-stories

# Plan a sprint
/bmad-workflow-bmm-sprint-planning
```

### Using Agent Personas

When you need specialized expertise, activate the relevant agent:

```
# For architecture decisions
/bmad-agent-bmm-architect

# For product requirements questions
/bmad-agent-bmm-pm

# For sprint management
/bmad-agent-bmm-sm

# For test strategy
/bmad-agent-bmm-tea
```

---

## Model Selection

The project defaults to `gemini-2.5-flash` in `.gemini/settings.json`. You can override the model per session or change the settings file.

### gemini-2.5-flash (Default)

Best for:

- Quick code completions and edits
- Running BMAD workflow commands
- File navigation and search
- Routine code reviews
- Simple bug fixes
- Running builds and type checks
- Day-to-day development tasks

Advantages: Fast response times, cost-efficient, good enough for most development tasks.

### gemini-2.5-pro

Best for:

- Complex architectural decisions
- Multi-file refactoring across the monorepo
- Analyzing and reasoning about system design trade-offs
- Creating comprehensive planning artifacts (PRDs, architecture docs)
- Debugging complex type errors across package boundaries
- Writing sophisticated Zod schemas or type utilities
- BMAD workflows that produce large documents (architecture, PRD, UX design)

To use gemini-2.5-pro, update `.gemini/settings.json`:

```json
{
  "model": "gemini-2.5-pro"
}
```

Or switch temporarily during a session if the CLI supports model flags.

### Recommendation

Start with `gemini-2.5-flash` for everyday work. Switch to `gemini-2.5-pro` when you encounter tasks requiring deeper reasoning, such as:

- Running `/bmad-workflow-bmm-create-architecture` or `/bmad-workflow-bmm-prd`
- Debugging cross-package type issues between `packages/shared` and consuming apps
- Designing new database schemas or API contracts
- Any task where initial flash results feel shallow or incomplete

---

## Best Practices

### 1. Leverage GEMINI.md Context

The `.gemini/GEMINI.md` file is loaded automatically. You do not need to repeat project context in every prompt. Gemini already knows:

- The monorepo layout and package relationships
- Code conventions (TypeScript strict, ESM, Zod, Tailwind v4)
- Key file paths and their purposes
- The BMAD framework location

### 2. Use Commands for BMAD Workflows

Always use the provided slash commands rather than manually instructing Gemini to load BMAD files. The commands contain precise instructions for loading workflow configs and following the workflow engine:

```
# Good -- uses the pre-configured command
/bmad-workflow-bmm-dev-story

# Avoid -- manual and error-prone
"Load the workflow at _bmad/bmm/workflows/4-implementation/dev-story/..."
```

### 3. Code Generation Patterns

When generating code, be explicit about which workspace you are targeting:

```
Create a new API route in apps/api for fetching module progress.
Use Fastify 5 patterns with Zod request/response schemas.
```

```
Add a new component in apps/web/src/components for displaying quiz results.
Use shadcn/ui Card component with the project's Tailwind v4 setup.
```

### 4. Reference Existing Patterns

Point Gemini to existing code as examples:

```
Look at apps/api/src/config.ts for the Zod environment validation pattern.
Create a similar validation schema for the new worker config.
```

### 5. Keep the System Instruction Updated

If the project structure evolves (new packages, changed conventions), update both:

- `.gemini/settings.json` `systemInstruction` field
- `.gemini/GEMINI.md` content

### 6. Use File References

Gemini CLI supports `@` file references in commands. Use them to point Gemini at specific files:

```
Review @apps/api/src/config.ts and ensure all new env vars are validated.
```

---

## Continuing Work

### Resuming a Session

When starting a new Gemini CLI session on this project:

1. **Check workflow status** -- Run `/bmad-workflow-bmm-workflow-status` to see where the project stands in the BMAD process.

2. **Check git state** -- Ask Gemini to run `git status` and `git log --oneline -10` to understand recent changes.

3. **Review sprint status** -- If in implementation phase, check `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` for current phase and pending work items.

4. **Load the appropriate agent** -- If continuing a specific type of work, activate the relevant agent persona first:
   - Implementing a story: `/bmad-agent-bmm-dev` then `/bmad-workflow-bmm-dev-story`
   - Planning work: `/bmad-agent-bmm-pm`
   - Architecture changes: `/bmad-agent-bmm-architect`

### Project State Files

Key files to check when resuming:

| File | What It Tells You |
|------|-------------------|
| `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` | Overall BMAD phase progress |
| `_bmad-output/project-context.md` | Current project context summary |
| `_bmad-output/planning-artifacts/architecture.md` | Architecture decisions |
| `_bmad-output/planning-artifacts/prd.md` | Product requirements |

---

## Limitations

### Compared to Claude Code

Be aware of these differences when switching between Gemini CLI and Claude Code:

1. **MCP (Model Context Protocol) support** -- Gemini CLI has different or limited MCP server support compared to Claude Code. The project uses Playwright MCP for browser automation and sequential-thinking MCP in CI; these may not be available in Gemini CLI sessions.

2. **Tool ecosystem** -- Claude Code has built-in file editing, search, and bash execution tools. Gemini CLI's tool capabilities depend on its version and the `codeExecution` and `sandbox` settings.

3. **BMAD command format** -- Gemini uses `.toml` files in `.gemini/commands/` while Claude Code uses slash commands defined differently. The BMAD framework works with both, but the invocation syntax differs.

4. **Context window** -- Model context limits differ between Gemini and Claude models. Very large files or multi-file operations may behave differently.

5. **Code generation style** -- Gemini models may produce slightly different code patterns. Always verify generated code follows the project conventions in `GEMINI.md`:
   - Check for `any` types (must be `unknown`)
   - Verify ESM imports (no `require()`)
   - Ensure Zod validation at boundaries
   - Confirm Tailwind v4 patterns (not v3 config style)

6. **File system access** -- The `sandbox: false` setting enables file system access, but Gemini CLI's file manipulation capabilities may differ from Claude Code's dedicated Edit and Write tools.

7. **Session persistence** -- Gemini CLI sessions do not persist conversation history between invocations. Each new `gemini` command starts fresh, which is why checking project state files on session start is important.

### Model-Specific Considerations

- **gemini-2.5-flash** may occasionally miss nuanced TypeScript strict mode requirements. Double-check generated types for proper narrowing and `undefined` handling.
- **gemini-2.5-pro** provides better reasoning but at higher latency and cost. Reserve it for tasks that genuinely benefit from deeper analysis.
- Neither Gemini model has the same training data as Claude models. References to AI SDK v5 patterns or specific Supabase client patterns may need more explicit guidance.
