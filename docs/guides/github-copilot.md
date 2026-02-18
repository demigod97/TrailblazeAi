# GitHub Copilot Developer Guide

Guide for working with GitHub Copilot on the TrailblazeAi project.

## Table of Contents

- [Setup](#setup)
- [Configuration](#configuration)
- [Copilot Agent Mode](#copilot-agent-mode)
- [Code Completion](#code-completion)
- [Copilot Chat](#copilot-chat)
- [Working with the Project](#working-with-the-project)
- [GitHub Copilot in PR Reviews](#github-copilot-in-pr-reviews)
- [BMAD Integration](#bmad-integration)
- [Best Practices](#best-practices)
- [Continuing Work](#continuing-work)
- [Limitations](#limitations)

---

## Setup

### VS Code

1. Install the [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) extension.
2. Install the [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) extension.
3. Sign in with your GitHub account that has an active Copilot subscription (Individual, Business, or Enterprise).
4. Open the TrailblazeAi project folder as your workspace root.

### JetBrains IDEs (WebStorm, IntelliJ)

1. Go to **Settings > Plugins > Marketplace** and install "GitHub Copilot".
2. Restart the IDE and authenticate with your GitHub account.
3. Open the TrailblazeAi project as your project root.

### Copilot CLI

GitHub Copilot also offers a CLI experience for terminal-based assistance:

```bash
# Install the GitHub CLI if you do not already have it
brew install gh        # macOS
sudo apt install gh    # Ubuntu/Debian

# Install the Copilot CLI extension
gh extension install github/gh-copilot

# Use Copilot in the terminal
gh copilot suggest "how to run type-check for only the web app"
gh copilot explain "pnpm --filter @trailblaze/api dev"
```

---

## Configuration

### Project Instructions File

The project includes a `.github/copilot/instructions.md` file that GitHub Copilot reads automatically when working in this repository. This file provides Copilot with project-specific context including:

- **Architecture overview** -- Next.js 15, Fastify 5, Supabase, Claude API, Playwright MCP, pg-boss
- **Monorepo structure** -- `apps/web`, `apps/api`, `packages/db`, `packages/shared`, `docker/`
- **TypeScript patterns** -- Strict mode, no `any`, `noUncheckedIndexedAccess`, ESM-only, explicit return types
- **Zod validation patterns** -- Environment variables, API inputs, external responses, `z.infer<typeof schema>`
- **Component conventions** -- shadcn/ui (new-york style), radix-ui primitives, `@/*` import alias
- **Tailwind CSS v4** -- CSS-first configuration, `@import "tailwindcss"`, CSS custom properties theming
- **Fastify 5 patterns** -- Plugin registration, Zod route schemas, pg-boss job queues
- **Supabase client usage** -- Separate browser/server clients, client factory, generated types, RLS
- **Key commands** -- `pnpm dev`, `pnpm build`, `pnpm type-check`, workspace-filtered commands

Copilot uses this file to tailor its suggestions to the project's conventions. You do not need to repeat this context in chat prompts.

### Keeping Instructions Current

If the project conventions change, update `.github/copilot/instructions.md` to keep Copilot's suggestions aligned. This file should stay in sync with `CLAUDE.md` (used by Claude Code) and `.gemini/GEMINI.md` (used by Gemini CLI).

---

## Copilot Agent Mode

### Using @workspace

Copilot Chat's `@workspace` agent provides project-wide context. It indexes your workspace and can answer questions about the entire codebase:

```
@workspace What is the monorepo structure of this project?
@workspace How is the Supabase client configured?
@workspace Show me all Zod schemas in the API package
@workspace What components are available in the shadcn/ui directory?
```

### How Copilot Reads instructions.md

When you open the repository in VS Code, Copilot automatically detects `.github/copilot/instructions.md` and incorporates its content as context for all suggestions and chat interactions. This means:

- **Code completions** are informed by the project's TypeScript patterns, ESM requirements, and Zod conventions.
- **Chat responses** reference the project's architecture when you ask questions.
- **Agent mode suggestions** align with the monorepo structure and package relationships.

You can verify that instructions are loaded by asking Copilot Chat:

```
@workspace What are the TypeScript conventions for this project?
```

It should reference strict mode, no `any`, `noUncheckedIndexedAccess`, and ESM.

### Copilot Edits (Multi-File)

Copilot Edits allows you to make changes across multiple files in a single operation. This is useful for cross-cutting changes in the monorepo:

```
# In Copilot Edits panel, describe what you want:
Add a new "progress" field to the Trailhead module type in packages/shared,
update the Supabase types in packages/db, and create an API endpoint
in apps/api that returns module progress.
```

Copilot Edits will propose changes across the relevant files and let you review before accepting.

---

## Code Completion

### TypeScript Patterns

Copilot's inline completions are guided by the project's `instructions.md`. Here are patterns specific to this project:

#### Strict Mode Compliance

Copilot should avoid `any` types. If you see `any` in a suggestion, reject it and type a more specific type or `unknown`:

```typescript
// Copilot should suggest proper typing, not any
function processModule(data: unknown): ModuleResult {
  const parsed = moduleSchema.parse(data); // Zod validation
  return { id: parsed.id, name: parsed.name };
}
```

#### Zod Schema Patterns

When creating validation schemas, Copilot should follow the project's Zod patterns:

```typescript
import { z } from 'zod';

// Environment validation (reference: apps/api/src/config.ts)
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_BEARER_TOKEN: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

// Derive TypeScript type from schema
type Env = z.infer<typeof envSchema>;
```

#### ESM Imports

All imports must use ESM syntax. Copilot should never suggest `require()`:

```typescript
// Correct -- ESM
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@trailblaze/db';

// Wrong -- CommonJS (reject these completions)
const { createClient } = require('@supabase/supabase-js');
```

#### shadcn/ui Components

When working in `apps/web`, Copilot should suggest shadcn/ui components from the project's component library:

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
```

Note the `@/*` alias that maps to `apps/web/src/`.

#### Tailwind CSS v4

Copilot should suggest Tailwind utility classes in JSX. The project uses Tailwind v4 with CSS-first configuration:

```tsx
// CSS-first config -- styles are in CSS files, not tailwind.config.ts
// @import "tailwindcss" in the global CSS file

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
```

#### noUncheckedIndexedAccess

Always handle potential `undefined` from index access:

```typescript
const items: string[] = ['a', 'b', 'c'];

// Copilot should suggest the undefined check
const first = items[0];
if (first !== undefined) {
  console.log(first.toUpperCase()); // Safe
}

// Or use optional chaining
console.log(items[0]?.toUpperCase());
```

---

## Copilot Chat

### Asking About Architecture

Use Copilot Chat to understand the project's design decisions:

```
@workspace Explain the relationship between apps/api and packages/shared
@workspace How does the job queue work with pg-boss in the API?
@workspace What is the data flow for processing a Trailhead module?
@workspace How are Supabase clients different between browser and server?
```

### Generating Components

Ask Copilot Chat to generate components following project conventions:

```
@workspace Create a new shadcn/ui data table component for displaying
quiz results. Use the Card component for layout, follow the project's
TypeScript patterns, and add proper types.
```

```
@workspace Generate a Fastify route for POST /api/modules/:id/process
that validates the request body with Zod and queues a pg-boss job.
```

### Explaining Code

Use the `/explain` command on selected code:

```
# Select a block of code, then:
/explain

# Or ask about specific files:
@workspace Explain what apps/api/src/config.ts does and why it uses Zod
```

### Generating Tests

```
@workspace Generate tests for the module processing endpoint.
Follow the project's testing patterns if any exist.
```

---

## Working with the Project

### Workspace Focus

The monorepo has distinct areas. When working with Copilot, focus on the appropriate workspace:

| Area | Path | Key Technologies |
|------|------|-----------------|
| Web dashboard | `apps/web/` | Next.js 15, Tailwind v4, shadcn/ui, Supabase client |
| API server | `apps/api/` | Fastify 5, pg-boss, AI SDK v5, Zod |
| Database types | `packages/db/` | Supabase, generated TypeScript types |
| Shared types | `packages/shared/` | Domain types, constants, Zod schemas |
| Docker config | `docker/` | Docker Compose, Dockerfiles |
| BMAD framework | `_bmad/` | Agents, workflows, templates |

### Opening the Right Files

Copilot provides better completions when relevant files are open. When working on a feature:

1. **Open the type definitions** -- `packages/shared/src/types/trailhead.ts`
2. **Open the config** -- `apps/api/src/config.ts` (for env var patterns)
3. **Open related components** -- Any existing components similar to what you are building
4. **Open the route file** -- If working on an API endpoint

### Multi-Root Workspace

For the best experience, open the monorepo root (`/home/user/TrailblazeAi`) as your VS Code workspace. This ensures:

- Copilot indexes all packages and apps together
- Cross-package type references resolve correctly
- The `instructions.md` file is discovered automatically
- The `@workspace` agent has full project context

---

## GitHub Copilot in PR Reviews

### Automated Review with Claude Code Action

This project has a Claude Code GitHub Action configured in `.github/workflows/claude-code.yml` that automatically reviews pull requests. It runs on:

- Pull request opened or synchronized
- Issue comments containing `@claude`
- New issues

The action enforces project conventions:

- TypeScript strict mode compliance
- Zod validation at external boundaries
- ESM module imports
- `@/*` import alias usage in `apps/web`
- Tailwind CSS v4 conventions
- shadcn/ui component patterns

### Using Copilot for PR Reviews

In addition to the Claude Code Action, you can use Copilot for PR reviews:

1. **In the PR diff view** -- Copilot can suggest improvements inline.
2. **Copilot review summary** -- Request an AI review summary from the PR page.
3. **Ask questions about changes** -- Use Copilot Chat to understand PR diffs:

   ```
   @workspace Explain the changes in this PR and identify any issues
   with TypeScript strict mode or missing Zod validation.
   ```

### CI Pipeline

The project's CI pipeline (`.github/workflows/ci.yml`) runs on all PRs:

```yaml
- pnpm install --frozen-lockfile
- pnpm type-check    # TypeScript strict mode validation
- pnpm build         # Full build verification
```

Use Copilot to fix any CI failures:

```
@workspace The type-check step failed with error TS2322 in
apps/web/src/components/ModuleCard.tsx. Help me fix it.
```

---

## BMAD Integration

### Copilot Agents Directory

The `.github/agents/` directory contains BMAD agent personas as `.agent.md` files for GitHub Copilot Agents. These files allow Copilot to take on specialized roles.

#### Available Agents

| Agent File | Role |
|-----------|------|
| `bmd-custom-bmm-dev.agent.md` | Developer -- implements stories and features |
| `bmd-custom-bmm-architect.agent.md` | Architect -- system design and architecture decisions |
| `bmd-custom-bmm-pm.agent.md` | Product Manager -- requirements and product direction |
| `bmd-custom-bmm-sm.agent.md` | Scrum Master -- sprint management and process |
| `bmd-custom-bmm-tea.agent.md` | Test Engineering Agent -- testing strategy and quality |
| `bmd-custom-bmm-analyst.agent.md` | Analyst -- research and analysis |
| `bmd-custom-bmm-ux-designer.agent.md` | UX Designer -- user experience and interface design |
| `bmd-custom-bmm-tech-writer.agent.md` | Tech Writer -- documentation and communication |
| `bmd-custom-bmm-quick-flow-solo-dev.agent.md` | Quick Flow Solo Dev -- rapid development |
| `bmd-custom-core-bmad-master.agent.md` | BMAD Master -- meta-agent for the framework |
| `bmd-custom-bmb-workflow-builder.agent.md` | Workflow Builder -- creates BMAD workflows |
| `bmd-custom-bmb-module-builder.agent.md` | Module Builder -- creates BMAD modules |
| `bmd-custom-bmb-agent-builder.agent.md` | Agent Builder -- creates BMAD agents |
| `bmd-custom-cis-creative-problem-solver.agent.md` | Creative Problem Solver |
| `bmd-custom-cis-brainstorming-coach.agent.md` | Brainstorming Coach |
| `bmd-custom-cis-innovation-strategist.agent.md` | Innovation Strategist |
| `bmd-custom-cis-storyteller.agent.md` | Storyteller |
| `bmd-custom-cis-presentation-master.agent.md` | Presentation Master |
| `bmd-custom-cis-design-thinking-coach.agent.md` | Design Thinking Coach |

#### How Agent Files Work

Each `.agent.md` file contains:

1. **Frontmatter** with a description and a list of enabled tools (e.g., `changes`, `edit`, `fetch`, `runCommands`, `search`, `runSubagent`).
2. **Activation instructions** that tell Copilot to load the full agent persona from the `_bmad/` directory.

Example structure:

```markdown
---
description: "Activates the Dev agent persona."
tools: ["changes","edit","fetch","githubRepo","problems","runCommands","runTasks","runTests","search","runSubagent","testFailure","todos","usages"]
---

# Dev Agent

<agent-activation CRITICAL="TRUE">
1. LOAD the FULL agent file from @_bmad/bmm/agents/dev.md
2. READ its entire contents
3. Execute ALL activation steps exactly as written
4. Follow the agent's persona and menu system precisely
5. Stay in character throughout the session
</agent-activation>
```

#### Using Agents in Copilot

When Copilot Agents are available in your IDE, you can invoke them to get role-specific assistance:

- The **Dev agent** for implementing features following the project's TypeScript and architecture patterns
- The **Architect agent** for discussing system design, database schema, or API contract decisions
- The **PM agent** for clarifying requirements from the PRD
- The **SM agent** for sprint planning and status tracking

### BMAD Planning Artifacts

Copilot can reference the project's planning artifacts for context:

```
@workspace Read the architecture document at _bmad-output/planning-artifacts/architecture.md
and explain the database schema design decisions.
```

```
@workspace Based on the PRD at _bmad-output/planning-artifacts/prd.md,
what are the functional requirements for the quiz answering feature?
```

---

## Best Practices

### 1. Write Good Comments for Completion

Copilot excels when you write descriptive comments before the code:

```typescript
// Validate the incoming quiz submission against the Zod schema,
// check that the module exists in Supabase, and return the
// graded result with correct/incorrect answers
async function submitQuiz(
```

Copilot will complete the function based on the comment, the `instructions.md` context, and open files.

### 2. Use Chat for Complex Tasks

For multi-step or cross-package work, use Copilot Chat rather than relying on inline completions:

```
@workspace I need to add a new "knowledge entry" feature:
1. Add the type to packages/shared/src/types/trailhead.ts
2. Create a Fastify route in apps/api for CRUD operations
3. Add a display component in apps/web using shadcn/ui Card

Show me the implementation for each file.
```

### 3. Leverage instructions.md Automatically

You do not need to repeat project conventions in every prompt. The `instructions.md` file handles this. Instead, focus your prompts on the specific task:

```
# Good -- specific and concise
Create a Zod schema for the quiz answer submission payload.

# Unnecessary -- Copilot already knows this from instructions.md
Create a Zod schema for the quiz answer submission payload.
Remember to use strict TypeScript, ESM imports, and z.infer for the type.
```

### 4. Open Relevant Files

Copilot uses open editor tabs as context. Before working on a feature:

- Open the relevant type definitions in `packages/shared`
- Open any related existing components or routes
- Open the config file if working with environment variables

### 5. Accept and Refine

Copilot suggestions are starting points. Always:

- **Verify strict mode compliance** -- Check for `any` types, unchecked index access
- **Confirm ESM imports** -- No `require()` statements
- **Validate Zod usage** -- External data boundaries should have validation
- **Check component patterns** -- shadcn/ui components should use the project's style

### 6. Use Inline Chat for Quick Fixes

Select code and use `Ctrl+I` (or `Cmd+I` on macOS) for inline Copilot Chat:

```
# Select a function, then:
Make this function handle the undefined case from noUncheckedIndexedAccess
```

```
# Select a component, then:
Convert this to use shadcn/ui Card with proper Tailwind v4 classes
```

---

## Continuing Work

### Workspace Indexing

Copilot indexes your workspace for the `@workspace` agent. The index updates as you modify files. After pulling new changes:

1. Let VS Code finish reloading the workspace.
2. The Copilot index updates automatically in the background.
3. New files and changes will be available in `@workspace` queries shortly.

### Learning from Codebase Patterns

Copilot learns from the patterns in your codebase. As more code is added following the project conventions, completions become increasingly aligned. This means:

- **Consistent naming** in existing code leads to consistent suggestions
- **Repeated Zod patterns** teach Copilot the project's validation style
- **Existing shadcn/ui usage** informs new component suggestions
- **Fastify route patterns** help Copilot generate matching new routes

### Checking Project State

When resuming work, use Copilot Chat to quickly orient yourself:

```
@workspace What is the current state of the project? Show me recent
changes and any TODO comments.
```

```
@workspace Summarize the BMAD workflow status from
_bmad-output/planning-artifacts/bmm-workflow-status.yaml
```

```
@workspace What stories or tasks are marked as required but not yet
completed in the workflow status?
```

---

## Limitations

### No Direct BMAD Workflow Execution

Unlike Gemini CLI (which has `.gemini/commands/` slash commands) or Claude Code (which has BMAD slash commands), Copilot cannot directly execute BMAD workflows. The `.github/agents/` files provide agent personas, but they do not support the full workflow engine that processes `.yaml` workflow configs through the `workflow.xml` orchestrator.

What this means in practice:

- **Copilot CAN**: Activate agent personas, read BMAD artifacts, provide role-specific advice
- **Copilot CANNOT**: Run multi-step BMAD workflows (like `dev-story`, `create-architecture`, `sprint-planning`) that require the workflow engine

For full BMAD workflow execution, use Claude Code or Gemini CLI.

### Limited to Code Assistance

Copilot is primarily a code assistant. It excels at:

- Code completion and generation
- Code explanation and review
- Chat-based Q&A about the codebase
- PR review assistance

It does not handle:

- Browser automation (use Playwright MCP via Claude Code)
- Direct database operations
- Docker container management
- Deployment operations

### Context Window Constraints

Copilot has limits on how much context it can process at once. For this monorepo:

- Very large files may not be fully analyzed
- Cross-package type resolution depends on open files
- The `@workspace` index covers the repository but may summarize large files

### Model Selection

Unlike Gemini CLI or Claude Code where you can choose specific models, Copilot's underlying model is managed by GitHub. You cannot switch between models for different task complexities. The `instructions.md` file is the primary lever for controlling output quality.

### PR Review Overlap

This project has both Copilot and Claude Code Action configured for PR reviews. The Claude Code Action (`.github/workflows/claude-code.yml`) provides thorough convention enforcement. Copilot's review capabilities are complementary but may occasionally duplicate feedback. The Claude Code Action specifically enforces:

- TypeScript strict mode (no `any`, `noUncheckedIndexedAccess`)
- Zod validation at all external boundaries
- ESM import requirements
- `@/*` alias usage in `apps/web`
- Tailwind CSS v4 patterns
- shadcn/ui component conventions

### No Terminal Command Execution

Copilot Chat and completions operate within the editor. For running project commands (`pnpm build`, `pnpm type-check`), use:

- The integrated terminal in your IDE
- Copilot CLI (`gh copilot suggest`) for command suggestions
- Claude Code or Gemini CLI for AI-driven command execution
