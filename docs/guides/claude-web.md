# Working with Claude on the Web (claude.ai) for TrailblazeAi

This guide covers how to effectively use Claude on claude.ai for developing, planning, and maintaining the TrailblazeAi project -- an AI-powered Salesforce Trailhead completion assistant built with Next.js 15, Fastify 5, Supabase, and the Claude API.

---

## Table of Contents

1. [Project Setup in Claude.ai](#1-project-setup-in-claudeai)
2. [Project Knowledge Configuration](#2-project-knowledge-configuration)
3. [Using Skills](#3-using-skills)
4. [Working with Artifacts](#4-working-with-artifacts)
5. [BMAD Integration](#5-bmad-integration)
6. [GitHub Integration](#6-github-integration)
7. [Best Practices](#7-best-practices)
8. [Continuing Work Between Sessions](#8-continuing-work-between-sessions)
9. [Limitations](#9-limitations)

---

## 1. Project Setup in Claude.ai

### Creating a Project

1. Navigate to [claude.ai](https://claude.ai) and sign in.
2. In the left sidebar, click **Projects** then **Create Project**.
3. Name the project **TrailblazeAi** (or a descriptive variant like "TrailblazeAi Development").
4. Optionally add a description: "AI-powered Salesforce Trailhead completion assistant -- Next.js 15 + Fastify 5 + Supabase monorepo."

### Uploading CLAUDE.md as Project Knowledge

The single most important file to upload is `CLAUDE.md` from the repository root. This file contains the authoritative project context that all AI assistants should follow, including:

- Architecture overview (Next.js 15, Fastify 5, Supabase, Claude API, Playwright MCP, pg-boss)
- Monorepo structure (`apps/web`, `apps/api`, `packages/db`, `packages/shared`)
- Key commands (`pnpm dev`, `pnpm build`, `pnpm type-check`)
- Code conventions (strict TypeScript, ESM, Zod validation, Tailwind v4 CSS-first)
- BMAD framework reference paths
- Important file paths and environment variable requirements

To upload:

1. Open your TrailblazeAi project in Claude.ai.
2. Click **Project knowledge** in the project settings.
3. Click **Upload files** and select `CLAUDE.md` from the repository root.
4. Claude will automatically use this as persistent context for every conversation in the project.

### Setting Custom Instructions

In addition to uploading `CLAUDE.md`, set custom instructions in the project to reinforce critical conventions:

```
You are working on the TrailblazeAi project. Always follow the CLAUDE.md conventions:
- TypeScript strict mode, never use `any`
- ESM everywhere ("type": "module")
- Zod for all external data validation
- Tailwind CSS v4 with CSS-first config (no tailwind.config.ts)
- shadcn/ui components (new-york style)
- Use @/* path alias in apps/web for src/ imports
- Server Components by default; add "use client" only when needed
```

---

## 2. Project Knowledge Configuration

### Essential Files to Upload

Upload these files to give Claude the deepest understanding of the project:

| File | Purpose | Priority |
|------|---------|----------|
| `CLAUDE.md` | Master project context, conventions, commands | **Required** |
| `_bmad-output/project-context.md` | Technology stack, code patterns, workspace packages | **Required** |
| `packages/shared/src/types/trailhead.ts` | Domain type definitions (TrailMix, Module, Unit, Quiz, Question, KnowledgeEntry, ProgressSummary) | **Required** |
| `packages/shared/src/constants.ts` | Job types, module statuses, API route constants | **Required** |
| `_bmad-output/planning-artifacts/architecture.md` | Architecture decisions, component design, data model | Recommended |
| `_bmad-output/planning-artifacts/prd.md` | Product requirements (37 FRs, 25 NFRs) | Recommended |
| `_bmad-output/planning-artifacts/ux-design-specification.md` | UX design spec, component definitions, user flows | Recommended (for frontend work) |
| `docker/docker-compose.yml` | Docker service definitions (API + Worker) | Optional (for infra work) |

### What NOT to Upload

- `.env` or `.env.example` -- Contains or describes secrets
- `pnpm-lock.yaml` -- Too large, no analytical value
- `node_modules/` -- Never upload dependencies
- Generated build output (`dist/`, `.next/`, `.turbo/`)
- Binary files or images

### Organizing Knowledge by Task

For focused work sessions, consider creating separate projects or selectively uploading context:

- **Frontend Development**: Upload `CLAUDE.md`, `project-context.md`, `trailhead.ts`, `ux-design-specification.md`
- **Backend/API Development**: Upload `CLAUDE.md`, `project-context.md`, `trailhead.ts`, `constants.ts`, `architecture.md`
- **Planning/Architecture**: Upload `CLAUDE.md`, `project-context.md`, `prd.md`, `architecture.md`, `product-brief.md`
- **Infrastructure**: Upload `CLAUDE.md`, `docker-compose.yml`, `architecture.md`

---

## 3. Using Skills

### Installing Skills from the Plugin Marketplace

Claude.ai supports skills (also called plugins) from the Anthropic skills marketplace. These extend Claude's capabilities for document generation and other tasks.

To install skills:

1. In your Claude.ai project, look for the **Skills** or **Integrations** section.
2. Browse the marketplace or search for `anthropics/skills`.
3. Install the document generation skills that are useful for TrailblazeAi development:

| Skill | Use Case for TrailblazeAi |
|-------|--------------------------|
| **DOCX** | Generate Word documents for architecture reviews, sprint reports, or stakeholder updates |
| **PDF** | Create PDF reports for progress tracking, quiz accuracy summaries, or deployment runbooks |
| **PPTX** | Build presentation decks for demo days, architecture overviews, or project status updates |
| **XLSX** | Generate spreadsheets for Trailhead module tracking, quiz result analysis, or cost breakdowns |

### Using Document Generation Skills

Once installed, you can invoke these skills naturally in conversation:

**Example -- Generate a progress report:**
```
Create a PDF report showing the current sprint status for TrailblazeAi.
Include sections for: completed modules, quiz accuracy, and remaining work.
Use the data from the progress tracking tables.
```

**Example -- Create an architecture presentation:**
```
Generate a PPTX presentation summarizing the TrailblazeAi architecture.
Include slides for: system overview, monorepo structure, data flow,
deployment topology, and the content processing pipeline.
```

**Example -- Export module tracking spreadsheet:**
```
Create an XLSX spreadsheet with columns for module name, status,
estimated minutes, units completed, quiz pass rate, and notes.
Include sample data based on the TrailMix/Module/Unit type definitions.
```

---

## 4. Working with Artifacts

Claude artifacts are powerful for prototyping and visualizing TrailblazeAi components without needing a local development environment.

### Prototyping UI Components

Use artifacts to mock up shadcn/ui components before implementing them in `apps/web`:

**Example prompt:**
```
Create a React artifact that shows a progress dashboard for TrailblazeAi.
Use shadcn/ui components (Card, Progress, Badge, Table).
Show a grid of module cards with status badges, completion progress bars,
and a summary stats section at the top showing total modules, completion
percentage, and quiz accuracy. Use the ProgressSummary type from the project.
```

**Example prompt for the quiz review panel:**
```
Create a React artifact showing a quiz review interface. Display a question
with multiple choice options, a confidence score indicator, Claude's reasoning
in a collapsible section, and approve/reject buttons. Style with Tailwind CSS
using an indigo color palette. Reference the Quiz and Question types.
```

### Generating Diagrams

Artifacts can produce Mermaid diagrams or SVG visualizations:

**Architecture diagrams:**
```
Create a Mermaid diagram showing the TrailblazeAi system architecture:
- Next.js 15 frontend on Vercel
- Fastify 5 API + Worker in Docker on Hetzner VPS
- Supabase PostgreSQL database
- Claude API for AI processing
- Playwright MCP for browser automation
- pg-boss job queue
Show the data flow from Trailmix URL import through content scraping,
knowledge building, and quiz answering.
```

**Data model diagrams:**
```
Create a Mermaid ER diagram based on the TrailblazeAi domain types:
TrailMix, Module, Unit, Quiz, Question, KnowledgeEntry.
Show the relationships and key fields.
```

**Pipeline flow diagrams:**
```
Create a Mermaid sequence diagram showing the content processing pipeline:
1. User imports Trailmix URL
2. API creates scrape-module jobs
3. Worker scrapes units via Playwright
4. process-content job builds knowledge
5. answer-quiz job uses Claude for quiz answering
6. Frontend displays results
```

### Iterating on Artifacts

Artifacts support iterative refinement. Start broad and refine:

1. "Create a basic dashboard layout with module cards."
2. "Add a sidebar with filtering options for module status."
3. "Include a real-time progress indicator that updates as jobs complete."
4. "Add responsive breakpoints for mobile view."

Once you are satisfied, copy the artifact code into `apps/web/src/` and adapt it to use actual Supabase data fetching and server components.

---

## 5. BMAD Integration

### What is BMAD?

BMAD (Breakthrough Method of Agile Development) V6 is the planning and workflow management framework used by TrailblazeAi. It provides structured agents and workflows for project planning phases:

- **Analysis**: Research, brainstorming, product brief creation
- **Planning**: PRD creation, UX design
- **Solutioning**: Architecture design, epic/story creation, implementation readiness
- **Implementation**: Sprint planning, development, testing

### BMAD Agents in Claude Web

The BMAD framework defines several agents, each with a specific role. In Claude.ai, you simulate these agents through custom instructions or by prefacing your prompts with the agent's role:

| Agent | Role | When to Use |
|-------|------|-------------|
| **Analyst** | Research, product briefs | Early project discovery, feature scoping |
| **PM (Product Manager)** | PRDs, epics, stories | Requirements definition, backlog creation |
| **UX Designer** | UX specs, wireframes | UI/UX design decisions, component design |
| **Architect** | Architecture docs, tech decisions | System design, infrastructure planning |
| **Dev (Developer)** | Implementation, code generation | Active development tasks |
| **SM (Scrum Master)** | Sprint planning, status tracking | Sprint management, progress reviews |
| **TEA (Test Engineer/Analyst)** | Test design, quality review | Test planning, testability assessment |
| **Tech Writer** | Documentation | API docs, user guides |

### Using BMAD Workflows in Claude Web

To invoke a BMAD workflow in Claude.ai:

1. Upload the relevant agent file from `_bmad/bmm/agents/` as project knowledge (e.g., `architect.md` for architecture work).
2. Upload the current workflow status from `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`.
3. Reference the workflow in your prompt:

```
Acting as the BMAD Architect agent, review the current architecture document
at _bmad-output/planning-artifacts/architecture.md and suggest improvements
for the content processing pipeline. Consider the constraints from the PRD
(37 FRs, 25 NFRs) and the Hetzner CX33 resource limits (4 vCPU, 8GB RAM).
```

### Current Workflow Status

The project tracks workflow progress in `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`. As of the latest update:

- **Completed**: Research, Product Brief, PRD, UX Design, Architecture
- **Next**: Epic/Story creation, Implementation Readiness check, Sprint Planning

When starting a Claude.ai session for planning, upload the workflow status file so Claude knows which phases are complete and which need work.

---

## 6. GitHub Integration

### Connecting Claude.ai to GitHub

Claude.ai can connect to GitHub for reviewing pull requests and understanding code context:

1. In your Claude.ai project settings, look for **Integrations** or **Connected accounts**.
2. Connect your GitHub account and grant access to the TrailblazeAi repository.
3. Once connected, you can reference PRs, issues, and code directly in conversation.

### PR Review Workflows

**Reviewing a pull request:**
```
Review PR #42 in the TrailblazeAi repository. Check for:
- TypeScript strict mode compliance (no `any` types)
- Proper Zod validation on API boundaries
- ESM import conventions
- Correct use of @/* path aliases in apps/web
- Server Component vs Client Component decisions
- Adherence to the architecture decisions in architecture.md
```

**Understanding changes in context:**
```
Look at the changes in PR #15 and explain how they affect the content
processing pipeline. Are the pg-boss job definitions consistent with
the JOB_TYPES constant in packages/shared/src/constants.ts?
```

### Code Navigation

With GitHub integration, you can ask Claude to read specific files from the repository:

```
Read the file apps/api/src/config.ts from the TrailblazeAi repository
and verify that all environment variables are validated with Zod schemas.
```

---

## 7. Best Practices

### Structuring Prompts for the TrailblazeAi Architecture

Given the monorepo structure, always specify which app or package you are working in:

**Good:**
```
In apps/web, create a new server component at src/app/dashboard/page.tsx
that fetches module progress data from Supabase and displays it using
shadcn/ui Card components.
```

**Bad:**
```
Create a dashboard page that shows progress.
```

### Providing Relevant Context

When asking about a specific area, paste the relevant code or reference the uploaded files:

```
Given the Quiz and Question types from packages/shared/src/types/trailhead.ts
(already in project knowledge), design the Fastify route handler for
POST /api/quiz/answer that:
1. Validates the request body with Zod
2. Retrieves relevant knowledge entries for the question
3. Calls Claude API with chain-of-thought prompting
4. Returns the answer with a confidence score
```

### Using Projects for Persistent Memory

Claude.ai projects maintain context across conversations. Use this effectively:

- Keep `CLAUDE.md` and `project-context.md` permanently in project knowledge.
- Add new planning artifacts as they are created (epics, sprint plans).
- Remove outdated files when the project evolves significantly.
- Use the project description to track current sprint or focus area.

### Prompt Templates for Common Tasks

**New API endpoint:**
```
Create a Fastify route handler in apps/api for [ENDPOINT].
- Validate request with Zod
- Use Supabase service role client
- Follow the patterns in project-context.md
- Return proper error responses
- Include TypeScript types from @trailblaze/shared
```

**New UI component:**
```
Create a React component in apps/web/src/components/ for [COMPONENT].
- Use shadcn/ui primitives (Card, Button, Badge, etc.)
- Style with Tailwind CSS v4 classes
- Make it a Server Component unless interactivity is needed
- Use the @/* import alias
- Follow the indigo color palette from the UX spec
```

**Database query:**
```
Write a Supabase query for [PURPOSE].
- Use the createClient() from @trailblaze/db
- Include proper TypeScript typing with the Database type
- Handle errors explicitly
- Consider RLS policies
```

---

## 8. Continuing Work Between Sessions

### Maintaining Context

Claude.ai project knowledge persists across sessions, but conversation history does not carry over to new conversations. To maintain continuity:

1. **Start each session with a summary**: "I am continuing work on [feature/task]. Last session I completed [X] and the next step is [Y]."

2. **Re-upload changed files**: If you modified files locally since the last session, upload the updated versions to project knowledge.

3. **Reference the workflow status**: Start planning sessions with: "Check the BMAD workflow status (uploaded in project knowledge) and tell me what phase we are in and what needs to happen next."

### Files to Re-Upload When They Change

| File | Re-upload When... |
|------|-------------------|
| `bmm-workflow-status.yaml` | A planning phase is completed |
| `architecture.md` | Architecture decisions are updated |
| `prd.md` | Requirements change |
| `trailhead.ts` | Domain types are modified |
| `constants.ts` | New job types or API routes are added |
| `docker-compose.yml` | Infrastructure changes |

### Session Kickoff Checklist

Before starting a new conversation in your TrailblazeAi project:

1. Verify project knowledge files are current.
2. Check if any new planning artifacts have been created (in `_bmad-output/planning-artifacts/`).
3. Note the current sprint focus and any blockers.
4. Provide a one-paragraph summary of where you left off.

---

## 9. Limitations

### No Direct File System Access

Claude on the web cannot read, write, or execute files on your local machine. All file interaction happens through:

- Uploading files to project knowledge
- Pasting code snippets into conversations
- Generating artifacts (which you manually copy to your codebase)
- GitHub integration (read-only for code review)

### No MCP Servers

Claude.ai does not support Model Context Protocol (MCP) server connections. This means:

- No direct Playwright browser automation from Claude.ai
- No live Supabase database queries
- No real-time file system watching
- No terminal command execution

For tasks requiring MCP (like running `pnpm dev` or interacting with the Playwright browser), use Claude Code (CLI) or another tool with MCP support.

### Context Window Considerations

Claude has a finite context window. For the TrailblazeAi project:

- Keep project knowledge focused: upload 5-8 essential files rather than the entire codebase.
- For large files like `architecture.md` or `prd.md`, consider uploading only the sections relevant to your current task.
- If a conversation becomes very long, start a new one within the same project (project knowledge carries over automatically).
- Artifacts do not count against the conversation context window.

### No Build/Test Execution

Claude.ai cannot run:

- `pnpm build` or `pnpm dev`
- TypeScript type checking (`pnpm type-check`)
- Tests or linters
- Docker commands

Generated code should always be validated locally before committing. Run `pnpm type-check` after implementing any code Claude generates.

### No Real-Time Collaboration

Claude.ai conversations are single-user. For team collaboration:

- Share conversation links with teammates (if available on your plan).
- Export important conversations or artifacts.
- Commit Claude-generated artifacts to the repository for team visibility.
- Use the BMAD workflow status file as the shared source of truth for project progress.
