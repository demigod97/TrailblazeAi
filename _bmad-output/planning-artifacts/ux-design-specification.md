---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-TrailblazeAi-2026-02-17.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/research/TrailBlazeAI-BMAD-V6-Action-Plan.md
  - _bmad-output/planning-artifacts/research/AI-powered-Trailhead-completion-assistant-full-architecture-blueprint.md
  - _bmad-output/project-context.md
---

# UX Design Specification TrailBlazeAI

**Author:** Demi
**Date:** 2026-02-17

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

TrailBlazeAI is an AI-powered learning accelerator that compresses 100+ hours of Salesforce Trailhead content into 2-3 days through automated content extraction, knowledge building, and quiz completion. The frontend is a hybrid monitoring + knowledge exploration tool — a control plane during automation runs that transforms into a persistent Salesforce knowledge reference post-completion. Built as a single-user personal tool for desktop, it prioritizes operational visibility during runs and knowledge utility afterward.

### Target Users

**Primary User: Demi**
- Developer with AI/automation experience, transitioning into the Salesforce ecosystem
- Time-pressured but values genuine learning — the "learning accelerator" framing matters
- Usage pattern: actively monitors the first runs, then shifts to periodic status checks once trust is established
- Post-completion, the knowledge explorer becomes the primary surface for daily Salesforce reference
- Desktop-first, technically sophisticated, appreciates clean modern UIs with progressive disclosure

**Secondary Consumer: AI Coding Agents**
- The knowledge base serves as context for Claude Code and other AI tools
- Export features (CLAUDE.md, structured JSON) are a key knowledge explorer capability

### Key Design Challenges

1. **Dual-mode dashboard** — Must serve both active real-time monitoring (watching automation run) and periodic quick status checks. The balance between live activity feed and summary statistics shifts depending on the user's engagement mode.

2. **Knowledge explorer as the enduring surface** — Receives the highest UX investment since it transitions from post-run review tool to daily reference. Needs semantic search, concept graph visualization, module browsing, and export workflows that feel powerful without being overwhelming.

3. **Pipeline state complexity** — Each module flows through multiple states (pending → scraping → scraped → processing → ready → completed/failed). Presenting pipeline progress clearly without creating visual noise requires thoughtful status design.

4. **Non-alarming error surfaces** — Session expiry, low-confidence quizzes, and failed scrapes need clear visibility without creating anxiety, since the system mostly self-recovers via retries.

### Design Opportunities

1. **Satisfying automation visualization** — Like Vercel deployments or GitHub Actions, the active monitoring phase should feel rewarding: badges earned, accuracy climbing, knowledge base growing. This creates emotional engagement with the tool.

2. **Interactive Salesforce knowledge graph** — A concept relationship map (Objects → Security → Sharing Rules, Apex → Triggers → Batch) is both visually compelling and genuinely useful for understanding cross-module dependencies. No other Trailhead tool offers this.

3. **Keyboard-first knowledge navigation** — Inspired by Linear, fast keyboard shortcuts for search, browse, and export in the knowledge explorer make daily use effortless.

4. **Progressive density** — Key stats at a glance (Vercel-inspired summary cards), expandable detail on demand (GitHub Actions-style logs and pipeline views), with Linear's clean aesthetic throughout.

### Design Inspirations

| Inspiration | What to Borrow |
|-------------|---------------|
| **Vercel Dashboard** | Clean status cards, modern aesthetic, deployment flow visualization |
| **GitHub Actions** | Pipeline/log-oriented views, run monitoring, step-by-step progress |
| **Linear** | Keyboard-first navigation, minimal design, progressive disclosure, speed |

## Core User Experience

### Defining Experience

**The Core Interaction: Knowledge Search**

TrailBlazeAI's defining interaction is a Cmd+K global search across the entire Salesforce knowledge base. This is the daily driver — the thing Demi reaches for when writing Apex, configuring security, or debugging a flow. It must feel like Spotlight/Alfred: instant, contextual, and always one keystroke away.

The product has two lifecycle phases with distinct core loops:

1. **Run Phase** (2-3 days): Paste URL → Launch → Monitor passively with periodic active check-ins → Celebrate completion
2. **Knowledge Phase** (ongoing): Search → Read → Export → Apply in real work

The knowledge phase IS the product. The run phase is onboarding. All UX decisions favor the knowledge phase when trade-offs arise.

### Platform Strategy

| Dimension | Decision |
|-----------|----------|
| **Platform** | Desktop web (Next.js on Vercel) |
| **Input** | Keyboard-first, mouse as fallback |
| **Browser** | Modern Chromium (Chrome/Edge/Arc) — no legacy support needed |
| **Offline** | Not required — Supabase always available |
| **Responsive** | Desktop-optimized (1280px+), functional at 1024px, no mobile |
| **Real-time** | Supabase Realtime via WebSocket for live run updates |
| **Performance** | Sub-100ms search results, instant page transitions |

### Effortless Interactions

All four primary interactions are designed for zero friction:

1. **Starting a run** — Paste a Trailmix URL, hit Enter. No config dialogs, no multi-step wizards. Smart defaults handle everything. Advanced options exist but are never required.

2. **Searching knowledge** — Cmd+K from anywhere. Type a concept, get instant results with context snippets, related concepts, and source module attribution. Results are navigable entirely via keyboard (arrow keys, Enter to open, Esc to dismiss).

3. **Exporting for AI tools** — One-click export to CLAUDE.md, structured JSON, or concept summaries. Export scope is contextual: export a single concept, a module's knowledge, or the entire base. No menu diving.

4. **Understanding run status** — Glanceable hero stats (modules completed, badges earned, accuracy rate, estimated time remaining). The dashboard answers "how's it going?" in under 2 seconds without any interaction.

### Critical Success Moments

| Moment | Experience | Design Implication |
|--------|------------|-------------------|
| **First badge earned** | "It works!" — proof of concept validated | Celebrate visually, animate the first badge prominently |
| **Halfway milestone** | "This is actually going to work" — commitment confirmed | Show trajectory, estimated completion, knowledge stats growing |
| **Full completion** | "This was worth building" — THE payoff moment | Rich completion state: total stats, knowledge graph overview, ready-to-use indicators |
| **First real knowledge search** | "This is useful beyond badges" — value unlock for daily work | Ensure first search returns something clearly useful with great formatting |

The **full completion** moment is the most critical — it must feel like a genuine achievement. The progress dashboard should build anticipation toward this moment throughout the run, not just display a checkbox.

### Experience Principles

1. **Search is sovereign** — Cmd+K is the front door to everything. If a user can't find it via search, it might as well not exist. Every piece of content, every concept, every module is searchable.

2. **Keyboard-first, always** — Every interaction has a keyboard path. Navigation between sections, search, drill-down, export, and dismiss all work via keyboard. Mouse augments but never gates.

3. **Glanceable by default, deep on demand** — Summary stats and status are visible without interaction. Details expand on demand. The dashboard answers "how's it going?" before you ask, but lets you drill into pipeline logs when you want them.

4. **Celebrate progress, don't alarm on errors** — Badges earned, accuracy stats, and knowledge growth are prominent and rewarding. Errors and retries are visible but non-urgent — the system handles recovery. Reserve visual urgency for things that actually need human attention (session expiry, manual review items).

5. **The knowledge outlives the run** — Every design decision for the knowledge explorer assumes it will be used daily for months. It should get better with use, not just survive it.

## Desired Emotional Response

### Primary Emotional Goals

| Phase | Primary Emotion | Description |
|-------|----------------|-------------|
| **Knowledge Phase** (daily use) | **Powerful & Precise** | Like a well-tuned CLI. Fast, clean, no wasted motion. You type, you get, you go. The satisfaction comes from the tool's precision, not its decoration. |
| **Run Phase** (2-3 days) | **Calm Confidence** | Like watching a Vercel deploy. You kicked it off, it's working, you trust it. The system earns trust by being transparent without being noisy. |
| **Error States** | **Reassuring & Gentle** | Warm but competent. "A quiz needed manual review. I've queued it — everything else is still rolling." Not dismissive, not alarming. The system communicates that it's handling things. |
| **Completion** | **Genuine Achievement** | Full completion should feel earned and significant. A rich summary of what was accomplished, not just a checkbox. The transition from "run tool" to "knowledge tool" should feel like leveling up. |

### Emotional Journey Mapping

| Stage | Emotion | Design Expression |
|-------|---------|-------------------|
| **First launch** | Curiosity + Anticipation | Clean, uncluttered start screen. Paste URL, hit Enter. No intimidating forms. |
| **First badge earned** | Surprise + Validation | Subtle but visible celebration. "It works." Confidence in the tool established. |
| **Active monitoring** | Calm engagement | Steady progress indicators, no flashing alerts. Numbers climb reliably. Activity log scrolls smoothly. |
| **Periodic check-in** | Quick satisfaction | Glanceable stats answer "how's it going?" in 2 seconds. No need to parse or hunt. |
| **Error encountered** | Brief concern → Reassurance | Error appears, but immediately shows resolution status. "Retrying in 30s" or "Queued for review." Concern resolves within the same glance. |
| **Full completion** | Pride + Readiness | Rich completion summary. Knowledge base statistics. "Your Salesforce knowledge base is ready." The tool transforms from runner to reference. |
| **Daily knowledge search** | Flow state | Cmd+K → type → result → done. Zero friction. The tool disappears; only the knowledge remains. |
| **Knowledge export** | Empowerment | One action, clean output. "Now my AI tools know Salesforce too." |

### Micro-Emotions

**Critical to cultivate:**
- **Confidence** — Every interaction confirms the system is reliable and accurate
- **Control** — Keyboard-first means the user drives the pace, never the system
- **Trust** — Transparency in what's happening without requiring investigation
- **Flow** — Search-to-answer speed preserves focus and momentum

**Critical to prevent:**
- **Overwhelm** — Never show too many stats, options, or settings at once. Progressive disclosure is mandatory.
- **Anxiety/Uncertainty** — Always show system state clearly. Never leave the user guessing if something is working, stuck, or broken.
- **Condescension** — No tutorials, no "are you sure?" confirmations, no dumbed-down language. This is a developer tool for a developer.
- **Impatience** — Sub-100ms search, instant navigation, no loading spinners in the critical path. If something takes time, show a skeleton or progress indicator immediately.

### Design Implications

| Emotional Goal | UX Design Approach |
|---------------|-------------------|
| **Powerful & Precise** | Monospace accents in data-heavy areas. Sharp, high-contrast status indicators. Keyboard shortcuts visible but not tutorial-like — discoverable through use. |
| **Calm Confidence** | Muted color palette with strategic color accents for progress and success. No red for self-recovering errors — reserve red for "needs human action." Smooth animations, not flashy ones. |
| **Reassuring Errors** | Errors show in amber/yellow with resolution status inline. Auto-retry timers visible. Errors that need attention use a gentle but distinct pattern — not a modal, but a persistent banner with a clear action. |
| **Anti-Overwhelm** | Maximum 4-5 hero stats visible. Module grid uses progressive disclosure. Activity log is collapsible. Settings are tucked away. Every screen has a clear visual hierarchy. |
| **Anti-Condescension** | No onboarding wizard. No tooltips on obvious actions. Technical language is fine (modules, units, embeddings, confidence scores). Status messages are terse and accurate. |
| **Anti-Impatience** | Optimistic UI for search. Skeleton loading for knowledge entries. Prefetch likely next pages. Never show a blank screen while loading. |

### Emotional Design Principles

1. **Precision over personality** — The tool's emotional signature is competence, not charm. It should feel like a sharp instrument, not a friendly assistant. Clean typography, tight spacing, purposeful whitespace.

2. **Earned trust through transparency** — Show just enough system state to build confidence without creating noise. Pipeline status, retry counts, and confidence scores are trust-building signals, not clutter.

3. **Celebrate milestones, not micro-actions** — Don't animate every badge or flash every status change. Save celebratory moments for genuinely meaningful milestones (first badge, halfway, completion). Daily use should feel quiet and powerful.

4. **Errors are conversations, not alarms** — Every error message should answer three questions: What happened? Is the system handling it? Do I need to do anything? If the answer to the third question is "no," the error should feel informational, not urgent.

5. **Speed is an emotion** — Sub-100ms search results don't just feel fast, they feel *powerful*. Instant page transitions don't just save time, they create a sense of control. Performance IS the emotional design.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

#### Vercel Dashboard
- **What it nails:** Deployment status as the hero element. Clean cards with clear state indicators (building, ready, error). The activity log shows what happened without overwhelming. The project grid is scannable.
- **UX lesson:** Status should be the first thing you see, not the first thing you have to find. Cards > tables for status-at-a-glance.
- **Borrow:** Hero stat cards for the progress dashboard. Deployment-style flow visualization for the scrape → process → quiz pipeline.

#### GitHub Actions
- **What it nails:** Pipeline-as-timeline visualization. Expandable step logs. Clear pass/fail per step. The run list shows enough metadata to decide if you need to drill in.
- **UX lesson:** Pipeline UX works when each step has a clear state and you can expand only what matters. Logs should be there but hidden by default.
- **Borrow:** Step-by-step pipeline view for module processing. Expandable log sections for active monitoring mode.

#### Linear
- **What it nails:** Cmd+K omnibar that searches issues, projects, and commands in one input. Left sidebar navigation is clean and scannable. Keyboard shortcuts for everything. Speed is a feature — every action feels instant.
- **UX lesson:** A unified search input eliminates the need for users to know where things live. Speed creates an emotional response of control.
- **Borrow:** Cmd+K omnibar as the global search pattern. Left sidebar navigation structure. Keyboard shortcut system. The "fast by default" performance standard.

#### VS Code / Cursor
- **What it nails:** Command palette (Cmd+Shift+P) separates search from commands. Search results show rich context (file path, line preview, icon). Sidebar sections are collapsible and rearrangeable.
- **UX lesson:** Search results need context — a bare title isn't enough. Show the module name, concept type, and a content preview in every result.
- **Borrow:** Rich search result formatting with context snippets. Collapsible sidebar sections for the knowledge explorer.

#### Notion (Database Views)
- **What it nails:** Multiple views on the same data — table, board, gallery, list. Filter chips for quick slicing. Inline editing. Real-time updates without page refresh.
- **UX lesson:** The module grid benefits from multiple view modes (card grid for overview, table for detail). Filter chips let you slice by status, trail, or completion without a complex filter UI.
- **Borrow:** Filter chips for the module grid (by status, by trail, by completion). Table view as an alternative to card grid for power-user detail needs.

#### Obsidian (Graph View)
- **What it nails:** Interactive node graph showing document relationships. Zoom and pan. Click a node to navigate. Color coding by folder/tag. The graph reveals structure you didn't know existed.
- **UX lesson:** A knowledge graph isn't just visualization — it's a discovery tool. Showing concept relationships helps users understand how Salesforce topics connect.
- **Borrow:** Interactive concept graph with zoom, pan, and click-to-navigate. Color coding by Salesforce domain (Admin, Developer, Security, etc.).

### Transferable UX Patterns

**Navigation Patterns:**
- **Left sidebar** (Linear/Notion) — Fixed sidebar with section icons + labels: Dashboard, Knowledge, Quiz Review, Settings. Collapsible for more content space.
- **Cmd+K omnibar** (Linear) — Global search for knowledge entries, modules, commands, and navigation. One input searches everything.
- **Breadcrumb context** (VS Code) — In knowledge explorer, show the path: Trail → Module → Unit → Concept. Always know where you are.

**Interaction Patterns:**
- **Filter chips** (Notion) — Quick status filters on the module grid. No complex filter dialogs. Click a chip, see filtered results.
- **Expandable sections** (GitHub Actions) — Pipeline logs, module details, and activity entries expand on demand. Collapsed by default.
- **Keyboard-driven list navigation** (Linear) — Arrow keys to move through search results, module lists, and knowledge entries. Enter to select, Esc to dismiss.

**Information Display Patterns:**
- **Hero stat cards** (Vercel) — 4-5 top-level metrics as large, prominent cards. Modules completed, badges earned, accuracy, time remaining.
- **Rich search results** (VS Code) — Each result shows: title, module attribution, content preview, concept type icon. Not just a list of titles.
- **Interactive graph** (Obsidian) — Concept relationship visualization with zoom, pan, click-to-navigate, and domain color coding.

**Status & Progress Patterns:**
- **Deployment flow** (Vercel) — Module pipeline shown as a flow: scraping → processing → embedding → quiz → done. Clear state per step.
- **Activity log** (GitHub Actions) — Scrollable, timestamped log of recent actions. Newest at top. Collapsible.
- **Real-time updates** (Notion) — Supabase Realtime pushes status changes without polling. Cards update in place, no page refresh.

### Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong for TrailBlazeAI | What to Do Instead |
|-------------|-------------------------------|-------------------|
| **Onboarding wizards** | Condescending for a developer tool. Paste URL + Enter is the onboarding. | Smart defaults, no wizard. Show a single-field start screen. |
| **Modal confirmations** | "Are you sure?" dialogs break flow and imply the user doesn't know what they're doing. | Undo-able actions instead of confirmations. Trust the user. |
| **Dashboard widget configurability** | Over-engineering for a single-user tool. Don't build a dashboard builder. | Fixed, well-designed layout. One great default beats infinite customization. |
| **Notification badges/bells** | Creates anxiety. This is a personal tool, not a collaboration platform. | Inline status updates. The dashboard IS the notification surface. |
| **Loading spinners in the critical path** | Kills the "powerful & precise" feeling. Every spinner is a broken promise. | Skeleton loading, optimistic UI, and prefetching. Show structure immediately. |
| **Tabs inside tabs** | Nested navigation creates confusion about where you are. | Flat hierarchy: sidebar → content area. One level of navigation. |
| **Pie charts for progress** | Hard to read, wastes space, adds no precision. | Progress bars or numeric displays. "47/89 modules" is clearer than any chart. |

### Design Inspiration Strategy

**Adopt directly:**
- Linear's Cmd+K omnibar as the global search — one input for knowledge, modules, commands, navigation
- Linear's left sidebar navigation — clean, icon + label, collapsible
- Vercel's hero stat cards — 4-5 top-level metrics, prominent and glanceable
- GitHub Actions' expandable pipeline logs — collapsed by default, expand on demand

**Adapt for TrailBlazeAI:**
- VS Code's rich search results → adapt for knowledge entries with module attribution, concept type, and content preview
- Obsidian's graph view → adapt as a Salesforce concept relationship graph with domain color coding
- Notion's filter chips → adapt for module grid filtering by status, trail, and completion state
- Notion's database views → adapt as card grid (default) + table view (detail) toggle for modules

**Avoid deliberately:**
- Vercel's project-switching complexity — single user, single project, no need for multi-project navigation
- GitHub Actions' log-heavy default view — logs should be opt-in, not the default surface
- Notion's block-editor paradigm — knowledge entries are read-only, not editable documents
- Any form of gamification beyond natural Trailhead badge display — this is a productivity tool, not a game

## Design System Foundation

### Design System Choice

**shadcn/ui** (new-york style) with Tailwind CSS v4 and Radix UI primitives.

This is a copy-paste component library, not a dependency. Components live in `apps/web/src/components/ui/` and are fully owned by the project. Radix UI provides headless, accessible primitives (dialogs, popovers, dropdowns, tooltips). Tailwind CSS v4 handles all styling through CSS-first configuration (`@import "tailwindcss"`). shadcn/ui connects the two with well-designed defaults.

### Rationale for Selection

- **Already scaffolded** — The project already has shadcn/ui installed with new-york style. Switching would be waste, not improvement.
- **Full ownership** — Components are copied into the project, not imported from `node_modules`. Every component can be modified without fighting upstream opinions.
- **Accessibility by default** — Radix primitives handle keyboard navigation, focus management, ARIA attributes, and screen reader announcements. The "powerful & precise" personality requires flawless keyboard interaction — Radix delivers this without custom work.
- **Tailwind v4 alignment** — CSS-first configuration means design tokens are CSS custom properties, not JavaScript objects. This aligns with the performance-first philosophy (no runtime CSS-in-JS).
- **Developer-tool aesthetic** — shadcn/ui's visual language (muted backgrounds, sharp borders, monospace accents) matches the command-line companion personality without additional customization.
- **Single-developer optimization** — No design system governance overhead. One developer, one set of opinions. shadcn/ui's copy-paste model means zero abstraction tax.

### Implementation Approach

**Component Strategy:**
- Use shadcn/ui components as the base for all standard UI patterns (buttons, inputs, dialogs, cards, tables, dropdowns, tooltips, popovers)
- Build custom composite components by composing shadcn primitives (e.g., `ModuleCard` composes `Card` + `Badge` + `Progress`)
- Reserve fully custom components for domain-specific visualizations only (concept graph, pipeline flow, progress ring)

**CSS Architecture:**
- Tailwind CSS v4 with CSS-first config (`@import "tailwindcss"`)
- Design tokens as CSS custom properties in `:root` and `[data-theme="dark"]`
- No runtime CSS-in-JS — all styles resolve at build time
- Utility-first with `@apply` only for repeated patterns in custom components

**Color Mode Implementation:**
- System-preference detection via `prefers-color-scheme` media query on initial load
- Manual toggle via `data-theme` attribute on `<html>` element, persisted to `localStorage`
- Both light and dark tokens defined from day one — no "add dark mode later" tech debt
- CSS custom properties switch values based on `data-theme`, components don't need conditional logic

**Typography:**
- **Primary:** IBM Plex Sans — sharp, screen-optimized, professional. Loaded via `next/font` for zero layout shift.
- **Monospace:** IBM Plex Mono (or Geist Mono) — for code snippets, knowledge entry metadata, pipeline logs, and status indicators
- **Scale:** 12px (caption/metadata) → 14px (body/default) → 16px (subheading) → 20px (heading) → 28px (hero stat) → 36px (page title)
- **Weight range:** 400 (body), 500 (emphasis/labels), 600 (headings), 700 (hero stats only)

### Customization Strategy

**Design Token Overrides:**
- Override shadcn/ui's default HSL color tokens with a custom palette that reflects the "intelligent automation" personality
- Primary color: a cool blue or teal (precision, intelligence) — not warm, not playful
- Accent color: a contrasting signal color for active states and CTAs
- Destructive/warning: standard red/amber — don't reinvent error colors
- Muted backgrounds: subtle gray tones for cards and surfaces, high contrast for text

**Component Customizations:**
- `Card` — Adjust border radius and shadow for the sharp, technical aesthetic. Less rounded, more defined edges.
- `Badge` — Custom variants for module status states: `queued`, `scraping`, `processing`, `ready`, `completed`, `error`
- `Progress` — Custom ring variant for circular progress display on hero stats
- `Table` — Dense variant for knowledge base table view with tight row spacing
- `Dialog` — Cmd+K omnibar as a custom `CommandDialog` (shadcn/ui already has a `Command` component based on cmdk)

**Spacing & Layout:**
- 4px base unit, 8px standard gap, 16px section spacing, 24px page padding
- Content max-width: 1200px for dashboard, full-width for knowledge explorer
- Sidebar width: 240px expanded, 48px collapsed (icon-only)
- Consistent 8px grid alignment for all component placement
