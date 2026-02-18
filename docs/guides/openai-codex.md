# Working with OpenAI Codex for TrailblazeAi

This guide covers how to effectively use OpenAI Codex (codex.openai.com) for developing the TrailblazeAi project -- an AI-powered Salesforce Trailhead completion assistant built with Next.js 15, Fastify 5, Supabase, and the Claude API.

---

## Table of Contents

1. [Setup and Access](#1-setup-and-access)
2. [Configuration](#2-configuration)
3. [Agent Skills](#3-agent-skills)
4. [Working with the Project](#4-working-with-the-project)
5. [Codex Environment](#5-codex-environment)
6. [BMAD Integration](#6-bmad-integration)
7. [Best Practices](#7-best-practices)
8. [Continuing Work Between Sessions](#8-continuing-work-between-sessions)
9. [Limitations](#9-limitations)

---

## 1. Setup and Access

### Accessing Codex

1. Navigate to [codex.openai.com](https://codex.openai.com).
2. Sign in with your OpenAI account.
3. Connect your GitHub account when prompted.

### Connecting the GitHub Repository

1. In the Codex interface, select **Connect Repository**.
2. Search for and select the **TrailblazeAi** repository.
3. Grant the necessary permissions for Codex to read from and write to the repository.
4. Codex will clone the repository into its sandboxed environment.

Once connected, Codex can:

- Read all files in the repository
- Create branches and make commits
- Open pull requests
- Run commands in a sandboxed Linux environment

---

## 2. Configuration

### The `.agent/instructions.md` File

The TrailblazeAi repository includes a `.agent/instructions.md` file at the repository root. This is the primary configuration file that Codex reads automatically when working with the project. It contains:

- Project description and architecture overview
- Monorepo structure (`apps/web`, `apps/api`, `packages/db`, `packages/shared`)
- Key commands (`pnpm dev`, `pnpm build`, `pnpm type-check`, `pnpm clean`)
- Code conventions (strict TypeScript, ESM, Zod validation, Tailwind v4, shadcn/ui)
- BMAD V6 framework reference and artifact locations
- Important file paths and environment variable requirements

**This file is automatically loaded by Codex at the start of every session.** You do not need to manually provide project context -- Codex reads `.agent/instructions.md` to understand the project.

### How `.agent/instructions.md` Relates to `CLAUDE.md`

The `.agent/instructions.md` file mirrors the content from `CLAUDE.md` (the project's master context file) but is formatted for OpenAI Codex's agent system. Both files define the same conventions and architecture to ensure consistency across AI tools. If `CLAUDE.md` is updated, `.agent/instructions.md` should be updated to match.

### BMAD Workflows in `.agent/workflows/bmad/`

The repository includes a comprehensive set of BMAD workflows pre-configured for Codex at `.agent/workflows/bmad/`. These are individual markdown files that Codex can invoke as workflow definitions:

```
.agent/workflows/bmad/
  bmad-bmm-workflows-create-product-brief.md
  bmad-bmm-workflows-prd.md
  bmad-bmm-workflows-create-architecture.md
  bmad-bmm-workflows-create-epics-and-stories.md
  bmad-bmm-workflows-sprint-planning.md
  bmad-bmm-workflows-sprint-status.md
  bmad-bmm-workflows-dev-story.md
  bmad-bmm-workflows-create-story.md
  bmad-bmm-workflows-code-review.md
  bmad-bmm-workflows-research.md
  bmad-bmm-workflows-workflow-status.md
  bmad-bmm-workflows-quick-dev.md
  bmad-bmm-workflows-quick-spec.md
  ... (60+ workflow files)
```

These workflows correspond to the BMAD V6 framework phases: Analysis, Planning, Solutioning, and Implementation.

---

## 3. Agent Skills

### System Skills (Auto-Installed)

Codex comes with system-level skills that are automatically available without installation. These include:

- File reading and writing
- Terminal command execution
- Git operations (commit, branch, push, PR creation)
- Code search and navigation

### Installing Curated Skills

Additional skills can be installed from the `openai/skills` repository using the `$skill-installer` command:

1. In a Codex conversation, type: `$skill-installer`
2. Browse the available curated skills from the openai/skills repository.
3. Select and install skills relevant to your workflow.

Useful skills for TrailblazeAi development include:

| Skill Category | Use Case |
|---------------|----------|
| **Code generation** | Scaffolding new Fastify routes, React components, Supabase queries |
| **Testing** | Generating test files, running test suites |
| **Documentation** | Creating API documentation, generating JSDoc comments |
| **Refactoring** | Large-scale code transformations across the monorepo |

### Skill Persistence

Installed skills persist within your Codex workspace for the connected repository. You do not need to reinstall them for each session.

---

## 4. Working with the Project

### Running Commands

Codex executes commands in a sandboxed Linux environment. The key commands for TrailblazeAi are:

**Build and check the entire monorepo:**

```
Run pnpm build to build all packages and apps.
```

```
Run pnpm type-check to verify TypeScript types across the monorepo.
```

**Work with individual apps:**

```
Run pnpm --filter @trailblaze/web dev to start the Next.js dev server.
```

```
Run pnpm --filter @trailblaze/api dev to start the Fastify dev server.
```

**Clean build artifacts:**

```
Run pnpm clean to remove all build output.
```

### Understanding the Monorepo Structure

When giving Codex tasks, always specify which part of the monorepo you are targeting:

| Target | Location | Package Name | Description |
|--------|----------|-------------|-------------|
| Frontend | `apps/web/` | `@trailblaze/web` | Next.js 15 App Router, Tailwind v4, shadcn/ui |
| Backend | `apps/api/` | `@trailblaze/api` | Fastify 5, pg-boss, AI SDK v5 |
| Database | `packages/db/` | `@trailblaze/db` | Supabase client factory, generated types |
| Shared | `packages/shared/` | `@trailblaze/shared` | Domain types (TrailMix, Module, Unit, Quiz), constants, job types |
| Docker | `docker/` | -- | docker-compose.yml, Dockerfiles for API and Worker |
| BMAD | `_bmad/` | -- | BMAD V6 framework (agents, workflows, templates) |
| Artifacts | `_bmad-output/` | -- | Planning artifacts, research, project context |

### Common Task Examples

**Creating a new API endpoint:**

```
In apps/api, create a new Fastify route handler for GET /api/modules/:id
that fetches a single module with its units from Supabase. Use Zod for
parameter validation and the Module type from @trailblaze/shared. Follow
the patterns described in .agent/instructions.md.
```

**Adding a UI component:**

```
In apps/web, create a new server component at src/app/modules/page.tsx
that displays a list of modules fetched from Supabase. Use shadcn/ui
Table and Badge components. Style with Tailwind CSS v4 classes. Use
the @/* import alias for all local imports.
```

**Modifying shared types:**

```
In packages/shared/src/types/trailhead.ts, add a new interface called
PipelineJob with fields: id (string), type (JobType), moduleId (string),
status (ModuleStatus), createdAt (string), completedAt (string | null).
Export it from the package index.
```

**Running type checks after changes:**

```
After making the changes, run pnpm type-check to verify everything
compiles correctly across the monorepo.
```

### Working with the Domain Types

The core domain types are defined in `packages/shared/src/types/trailhead.ts`:

- `TrailMix` -- A collection of Trailhead modules (has many Modules)
- `Module` -- A single Trailhead module (has many Units, has a status)
- `Unit` -- A unit within a module (reading, hands-on, or quiz type)
- `Quiz` -- Quiz data for a unit (has many Questions, tracks attempts)
- `Question` -- Individual quiz question (text, options, correct/selected answer)
- `KnowledgeEntry` -- Extracted knowledge chunk with optional embedding
- `ProgressSummary` -- Aggregated statistics for the dashboard

The constants are in `packages/shared/src/constants.ts`:

- `JOB_TYPES` -- Pipeline job type constants (scrape-module, scrape-unit, process-content, answer-quiz, build-knowledge)
- `MODULE_STATUS` -- Status values (pending, in_progress, completed, failed)
- `API_ROUTES` -- API endpoint path constants

Always reference these types and constants rather than redefining them.

---

## 5. Codex Environment

### Sandboxed Linux Environment

Codex runs in an isolated Linux container. Key characteristics:

- **OS**: Linux-based sandbox
- **Node.js**: Available (the project requires >=18, production uses >=22)
- **Package manager**: pnpm is available (the project uses pnpm 9.15.4)
- **Git**: Full git functionality for branching, committing, and PR creation
- **File system**: Full read/write access to the cloned repository

### Dependency Installation

When Codex clones the repository, you may need to install dependencies first:

```
Run pnpm install to install all workspace dependencies.
```

This installs dependencies for all packages in the monorepo (apps/web, apps/api, packages/db, packages/shared).

### Network Access Limitations

Codex operates in a sandboxed environment with restricted network access:

- **No outbound internet access** by default for arbitrary URLs
- **No access to external APIs** (Supabase, Anthropic, Salesforce) during development
- **GitHub access** is available for repository operations
- **npm registry** access is typically available for package installation

This means:

- You cannot run the full application stack (it requires Supabase and Anthropic API connections)
- You can run `pnpm build` and `pnpm type-check` (no network needed)
- You cannot test Playwright browser automation
- You cannot run integration tests that require database access

### Environment Variables

The `.env` file is not committed to the repository (it is in `.gitignore`). Since Codex cannot access external services:

- Type checking and building work without environment variables
- Runtime testing (starting dev servers) will fail without a valid `.env`
- Focus Codex work on code generation, refactoring, type checking, and building -- not runtime testing

---

## 6. BMAD Integration

### BMAD Workflows in Codex

The BMAD V6 framework workflows are available in the `.agent/workflows/bmad/` directory. These are pre-configured for use with Codex and cover the full project lifecycle.

### Key BMAD Workflows

**Planning workflows:**

| Workflow File | Purpose |
|--------------|---------|
| `bmad-bmm-workflows-create-product-brief.md` | Create or update the product brief |
| `bmad-bmm-workflows-prd.md` | Create or update the PRD |
| `bmad-bmm-workflows-create-ux-design.md` | Design UX specifications |
| `bmad-bmm-workflows-create-architecture.md` | Create architecture decisions |
| `bmad-bmm-workflows-create-epics-and-stories.md` | Break down PRD into epics and stories |
| `bmad-bmm-workflows-check-implementation-readiness.md` | Validate readiness for implementation |

**Implementation workflows:**

| Workflow File | Purpose |
|--------------|---------|
| `bmad-bmm-workflows-sprint-planning.md` | Plan sprint work |
| `bmad-bmm-workflows-sprint-status.md` | Check sprint progress |
| `bmad-bmm-workflows-dev-story.md` | Implement a development story |
| `bmad-bmm-workflows-create-story.md` | Create a new user story |
| `bmad-bmm-workflows-quick-dev.md` | Quick development workflow |
| `bmad-bmm-workflows-code-review.md` | Review code changes |

**Utility workflows:**

| Workflow File | Purpose |
|--------------|---------|
| `bmad-bmm-workflows-workflow-status.md` | Check current workflow phase |
| `bmad-bmm-workflows-research.md` | Conduct research on a topic |
| `bmad-bmm-workflows-generate-project-context.md` | Generate/update project context |
| `bmad-bmm-workflows-document-project.md` | Create project documentation |
| `bmad-bmm-workflows-correct-course.md` | Course-correct when off track |
| `bmad-bmm-workflows-retrospective.md` | Run a retrospective |

**Agent definitions are also available:**

| Agent File | Role |
|-----------|------|
| `bmad-bmm-agents-analyst.md` | Research and analysis |
| `bmad-bmm-agents-pm.md` | Product management |
| `bmad-bmm-agents-architect.md` | Architecture decisions |
| `bmad-bmm-agents-dev.md` | Development |
| `bmad-bmm-agents-sm.md` | Scrum master |
| `bmad-bmm-agents-tea.md` | Test engineering |
| `bmad-bmm-agents-ux-designer.md` | UX design |
| `bmad-bmm-agents-tech-writer.md` | Technical writing |
| `bmad-bmm-agents-quick-flow-solo-dev.md` | Solo developer quick workflow |

### Using BMAD Workflows

To invoke a BMAD workflow in Codex, reference the workflow file:

```
Read the workflow at .agent/workflows/bmad/bmad-bmm-workflows-sprint-planning.md
and follow its steps to create a sprint plan for the next development sprint.
Use the artifacts in _bmad-output/planning-artifacts/ as input.
```

### Current Project Phase

Check `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` to see which planning phases are complete:

- **Completed**: Research, Product Brief, PRD, UX Design, Architecture
- **Next steps**: Epic/Story creation, Implementation Readiness, Sprint Planning

---

## 7. Best Practices

### Writing Clear Task Descriptions

Codex works best with specific, scoped tasks. Always include:

1. **Which app/package** to modify (e.g., "In apps/web..." or "In apps/api...")
2. **What to create or modify** (file path, component name, route handler)
3. **Which patterns to follow** (reference .agent/instructions.md conventions)
4. **Validation step** (e.g., "then run pnpm type-check")

**Good task description:**
```
In apps/api/src/routes/, create a new file quiz.ts with a Fastify route
handler for POST /api/quiz/answer. The handler should:
1. Parse the request body with Zod (expect unitId: string, questionId: string)
2. Import types from @trailblaze/shared
3. Return a JSON response with { answer: string, confidence: number }
4. Follow the ESM and strict TypeScript conventions from .agent/instructions.md
After creating the file, run pnpm type-check to verify it compiles.
```

**Bad task description:**
```
Add a quiz answering endpoint.
```

### Specifying the Target App

Since TrailblazeAi is a monorepo, always clarify which workspace package you mean:

- "In **apps/web**" -- for Next.js frontend changes (components, pages, styles)
- "In **apps/api**" -- for Fastify backend changes (routes, workers, config)
- "In **packages/shared**" -- for shared types, constants, or utilities
- "In **packages/db**" -- for Supabase client or generated database types
- "In **docker/**" -- for Docker configuration changes

### Verifying Changes

Always ask Codex to verify its changes:

```
After making the changes:
1. Run pnpm type-check to ensure TypeScript compiles
2. Run pnpm build to ensure the build succeeds
3. Show me the git diff of all changes
```

### Branching Strategy

For non-trivial changes, ask Codex to create a feature branch:

```
Create a new branch called feature/quiz-review-panel from main.
Make the following changes on that branch, then open a PR.
```

### Multi-File Changes

When a task spans multiple packages (common in monorepos), list all files:

```
This feature requires changes in three places:
1. packages/shared/src/types/trailhead.ts -- Add PipelineStatus type
2. apps/api/src/routes/pipeline.ts -- Create status endpoint
3. apps/web/src/app/pipeline/page.tsx -- Create status dashboard page

Make all three changes, ensuring the types flow correctly from shared
through the API to the frontend. Run pnpm type-check after all changes.
```

---

## 8. Continuing Work Between Sessions

### How Codex Maintains State

Codex works with the Git repository as its state management layer:

- **Code changes** are persisted through git commits
- **Branch state** carries over between sessions
- **Uncommitted changes** may not persist -- always commit or stash work
- **`.agent/instructions.md`** is re-read at the start of each session

### Re-Providing Context Between Sessions

When starting a new Codex session:

1. **Reference the current branch**: "I am working on branch `feature/quiz-panel`. Continue from where we left off."

2. **Summarize completed work**: "In the last session, I created the Quiz model types and the API route. The next step is building the frontend component."

3. **Point to relevant artifacts**: "Read `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` for the current project phase."

4. **Specify the immediate task**: Start with one clear, actionable task rather than a broad request.

### Session Kickoff Template

```
I am continuing work on the TrailblazeAi project.

Current branch: [branch name]
Last completed: [what was done]
Next task: [specific task description]
Target app: [apps/web | apps/api | packages/shared | etc.]

Please read .agent/instructions.md for project conventions, then proceed
with the task.
```

### Ensuring Consistency Across Sessions

- Always run `pnpm type-check` at the start of a session to verify the codebase is clean.
- Check `git status` to see if there are uncommitted changes from a previous session.
- Review the BMAD workflow status if working on planning tasks.

---

## 9. Limitations

### Sandbox Restrictions

Codex runs in a sandboxed environment with several constraints:

- **No persistent processes**: Long-running dev servers (like `pnpm dev`) will not persist between sessions. They are useful for testing during a session but stop when the session ends.
- **No Docker**: You cannot run `docker compose up` inside the Codex sandbox. Docker configuration files can be created and modified, but not executed.
- **No browser**: Playwright browser automation cannot run in the sandbox. Playwright-related code can be written but not tested.
- **Resource limits**: The sandbox has CPU and memory limits. Very large builds or operations may time out.

### Network Access

- **No external API access**: Codex cannot reach Supabase, Anthropic API, Salesforce, or other external services.
- **No database connections**: You cannot test queries against the live Supabase database.
- **Package registry**: npm/pnpm package installation typically works.
- **GitHub**: Full access for repository operations (clone, push, PR).

### What This Means for TrailblazeAi Development

| Task | Works in Codex? | Notes |
|------|----------------|-------|
| Writing TypeScript code | Yes | Full IDE-like capabilities |
| Type checking (`pnpm type-check`) | Yes | No network needed |
| Building (`pnpm build`) | Yes | Compiles all packages |
| Creating components/routes | Yes | Code generation is a core strength |
| Running dev servers | Partial | Starts but cannot connect to external services |
| Running Playwright tests | No | No browser available |
| Testing API with live database | No | No Supabase access |
| Git operations (commit, branch, PR) | Yes | Full GitHub integration |
| BMAD planning workflows | Yes | Reads and generates markdown artifacts |
| Docker build/run | No | Docker not available in sandbox |
| Installing npm packages | Yes | Registry access available |

### Workarounds for Limitations

**For testing without external services:**
- Write unit tests that mock Supabase and API clients.
- Use `pnpm type-check` and `pnpm build` as primary validation.
- Create mock data files that simulate API responses.

**For Playwright automation code:**
- Write the Playwright scripts in Codex, but test them locally.
- Use TypeScript types to ensure correctness without runtime testing.

**For environment variables:**
- Do not ask Codex to create `.env` files with real credentials.
- Use `.env.example` as a reference for what variables are needed.
- Focus on Zod validation schemas that will catch missing env vars at startup.

**For Docker configuration:**
- Edit `docker/docker-compose.yml` and Dockerfiles in Codex.
- Validate syntax and configuration logic, but test Docker builds locally.
