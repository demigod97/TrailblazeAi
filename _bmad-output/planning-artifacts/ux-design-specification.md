---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
lastStep: 14
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

## 2. Core User Experience

### 2.1 Defining Experience

**"Paste a URL. Watch it learn. Review the answers."**

TrailBlazeAI's defining experience is a three-act arc that plays out every time a user processes a trail:

**Act 1 — The Launch.** A single input field. Paste a Trailhead trail URL. Press Enter. That's it. One action triggers the processing of dozens of modules, hundreds of knowledge entries, and every quiz in the trail. The power is in the contrast: one keystroke starts hours of automated work.

**Act 2 — The Pipeline.** The dashboard transforms into a live operations view. Module cards flow through pipeline states — `scraping → processing → embedding → quiz-ready → completed`. Progress is visible, glanceable, and updating in real-time via Supabase Realtime. The user doesn't need to watch, but watching feels *good*. It's the deployment log of knowledge.

**Act 3 — The Knowledge.** The AI didn't just answer quizzes — it *understood* the material. The knowledge base is searchable, connected, and navigable. Concepts link to concepts. Salesforce domains emerge as clusters in the concept graph. The user discovers that the AI organized their learning better than they would have themselves.

The three acts are inseparable. The launch is the promise. The pipeline is the proof. The knowledge is the payoff.

### 2.2 User Mental Model

**Primary mental model: "Automation with a review gate."**

The user thinks of TrailBlazeAI as a capable assistant that does the tedious work (reading content, extracting knowledge, drafting quiz answers) but respects the user's authority on the final step (submitting answers).

**How they think about it:**
- "I paste the URL and it handles everything up to the quiz."
- "I review the answers it generated and approve or adjust before submission."
- "I can check in whenever I want — it keeps working whether I'm watching or not."
- "The knowledge base is a bonus — I can actually learn from what it processed."

**Current solution (manual Trailhead):**
- Reading every module page (tedious, slow)
- Manually answering quizzes (time-consuming, error-prone under fatigue)
- No knowledge retention system (read once, forget immediately)
- No way to track overall progress across trails

**What they love about manual approach:** Actually understanding concepts when they pay attention.
**What they hate:** The sheer volume. 100+ hours of content that's often repetitive or obvious for experienced developers.

**Key insight:** The review gate is what separates TrailBlazeAI from a "cheat tool." The user stays in the loop on quiz submission, which means they maintain awareness of the material and can catch AI mistakes. This is the trust architecture.

### 2.3 Success Criteria

**The core experience succeeds when the user feels:**
- "This just works" — Paste a URL, walk away, come back to progress.
- "I'm still in control" — Quiz answers wait for my review before submission.
- "It's smarter than I expected" — Knowledge connections I didn't anticipate.

**Success Indicators:**

| Indicator | Measurement |
|-----------|------------|
| **Time-to-first-progress** | < 5 seconds from URL paste to first module appearing in pipeline |
| **Zero-config launch** | No settings, options, or dialogs between paste and processing start |
| **Review confidence** | User can assess a quiz answer's correctness in < 10 seconds per question |
| **Pipeline transparency** | User always knows: what's running, what's queued, what's done, what failed |
| **Knowledge surprise** | User discovers a concept connection they didn't know about at least once per trail |
| **Recovery without anxiety** | If something fails, the user knows exactly what failed and can retry with one click |

### 2.4 Novel vs. Established UX Patterns

**Pattern classification: Established patterns, novel combination.**

TrailBlazeAI doesn't require users to learn new interaction paradigms. Every individual pattern is familiar:
- Pasting a URL (established — every web tool does this)
- Pipeline visualization (established — CI/CD dashboards, Vercel deployments)
- Search and browse (established — any knowledge base or documentation site)
- Review and approve (established — PR review, content moderation)

**The novelty is in the combination and context:** No existing tool combines Trailhead content extraction + AI knowledge synthesis + quiz answer generation + human review gate in a single dashboard. The patterns are familiar but the workflow is new.

**Familiar metaphors we leverage:**
- **CI/CD pipeline** → Module processing pipeline (developers already understand stages, states, and logs)
- **PR review** → Quiz answer review (developers already understand "review before merge/submit")
- **Documentation search** → Knowledge base search (developers already understand full-text search with previews)
- **Deployment dashboard** → Progress dashboard (developers already understand hero stats + activity feeds)

**No user education required.** A developer who has used Vercel, GitHub Actions, and VS Code will immediately understand every surface in TrailBlazeAI. The onboarding is: paste a URL.

### 2.5 Experience Mechanics

**Core Flow: "Paste → Process → Review → Complete"**

**1. Initiation:**
- User navigates to dashboard (the default and only entry point)
- A prominent, centered input field with placeholder: `Paste a Trailhead trail or module URL...`
- User pastes URL, presses Enter (or clicks a single "Start" button)
- No configuration dialogs, no options, no "are you sure?" — it just starts
- The input field can also accept multiple URLs (one per line) for batch processing
- Cmd+K omnibar also accepts URLs as a secondary entry point

**2. Interaction (Pipeline Phase):**
- Dashboard immediately shows the trail with its modules as cards in `queued` state
- Modules begin processing sequentially (or in configured parallel batches)
- Each card transitions through pipeline states with visual indicators: `queued → scraping → processing → embedding → quiz-ready`
- Cards that reach `quiz-ready` state are visually distinct — highlighted border, review badge
- Pipeline activity log shows timestamped entries for each state transition (collapsed by default, expandable)
- User can continue to paste new URLs while processing is active — new trails queue up
- Real-time updates via Supabase Realtime — no polling, no refresh needed

**3. Feedback (Review Phase):**
- When a module reaches `quiz-ready`, it surfaces in a "Ready for Review" section
- Clicking a quiz-ready module opens the quiz review panel:
  - Question text displayed clearly
  - AI-generated answer highlighted with confidence indicator
  - Supporting knowledge context shown (which extracted content informed the answer)
  - One-click approve (submit as-is) or inline edit (adjust before submit)
- Batch approve option: "Approve all high-confidence answers" for experienced users who trust the AI
- After approval, module automatically transitions to `submitting → completed`
- If the AI got an answer wrong and the user corrects it, the correction feeds back into the knowledge base

**4. Completion:**
- Completed modules show a green checkmark and earned badge (if applicable)
- Hero stat cards update in real-time: modules completed, badges earned, accuracy rate, estimated time saved
- Trail-level progress bar fills as modules complete
- When an entire trail completes, a subtle completion state appears (no confetti, no celebration modal — just clean, confident "done")
- Knowledge base is immediately searchable for all processed content
- User can proceed to paste the next trail URL — the cycle continues

## Visual Design Foundation

### Color System

**Primary Palette: Indigo**

A deep indigo primary conveys sophistication, depth, and power — the feeling of a precision instrument, not a toy. The purple undertone adds warmth that prevents the interface from feeling sterile.

**Indigo Scale (HSL):**

| Token | HSL | Usage |
|-------|-----|-------|
| `indigo-50` | `226 100% 97%` | Subtle backgrounds, hover states (light mode) |
| `indigo-100` | `226 100% 94%` | Active backgrounds, selection states (light mode) |
| `indigo-200` | `228 96% 89%` | Borders, dividers on primary surfaces |
| `indigo-300` | `230 94% 82%` | Disabled primary elements |
| `indigo-400` | `234 89% 74%` | Secondary interactive elements |
| `indigo-500` | `239 84% 67%` | Primary in dark mode, hover in light mode |
| `indigo-600` | `243 75% 59%` | **Primary in light mode** — buttons, links, focus rings |
| `indigo-700` | `245 58% 51%` | Primary pressed/active state |
| `indigo-800` | `244 55% 41%` | Dark accents, emphasis text |
| `indigo-900` | `242 47% 34%` | High-emphasis text on light backgrounds |
| `indigo-950` | `244 47% 20%` | Deepest indigo, used sparingly |

**Semantic Color Tokens (shadcn/ui HSL convention):**

**Light Theme (`:root`):**

| Token | HSL Value | Purpose |
|-------|-----------|---------|
| `--background` | `0 0% 100%` | Page background |
| `--foreground` | `240 10% 3.9%` | Primary text |
| `--card` | `0 0% 100%` | Card surfaces |
| `--card-foreground` | `240 10% 3.9%` | Card text |
| `--popover` | `0 0% 100%` | Popover/dropdown surfaces |
| `--popover-foreground` | `240 10% 3.9%` | Popover text |
| `--primary` | `243 75% 59%` | Primary actions (indigo-600) |
| `--primary-foreground` | `0 0% 98%` | Text on primary |
| `--secondary` | `240 4.8% 95.9%` | Secondary surfaces |
| `--secondary-foreground` | `240 5.9% 10%` | Secondary text |
| `--muted` | `240 4.8% 95.9%` | Muted backgrounds |
| `--muted-foreground` | `240 3.8% 46.1%` | Muted/placeholder text |
| `--accent` | `240 4.8% 95.9%` | Accent surfaces (hover, focus) |
| `--accent-foreground` | `240 5.9% 10%` | Accent text |
| `--destructive` | `0 84.2% 60.2%` | Error/destructive actions |
| `--destructive-foreground` | `0 0% 98%` | Text on destructive |
| `--border` | `240 5.9% 90%` | Default borders |
| `--input` | `240 5.9% 90%` | Input borders |
| `--ring` | `243 75% 59%` | Focus rings (matches primary) |

**Dark Theme (`[data-theme="dark"]`):**

| Token | HSL Value | Purpose |
|-------|-----------|---------|
| `--background` | `240 10% 3.9%` | Page background (deep dark with indigo tint) |
| `--foreground` | `0 0% 98%` | Primary text |
| `--card` | `240 10% 6%` | Card surfaces (slightly elevated) |
| `--card-foreground` | `0 0% 98%` | Card text |
| `--popover` | `240 10% 6%` | Popover surfaces |
| `--popover-foreground` | `0 0% 98%` | Popover text |
| `--primary` | `239 84% 67%` | Primary actions (indigo-500, lighter for dark bg) |
| `--primary-foreground` | `0 0% 98%` | Text on primary |
| `--secondary` | `240 3.7% 15.9%` | Secondary surfaces |
| `--secondary-foreground` | `0 0% 98%` | Secondary text |
| `--muted` | `240 3.7% 15.9%` | Muted backgrounds |
| `--muted-foreground` | `240 5% 64.9%` | Muted/placeholder text |
| `--accent` | `240 3.7% 15.9%` | Accent surfaces |
| `--accent-foreground` | `0 0% 98%` | Accent text |
| `--destructive` | `0 62.8% 30.6%` | Error/destructive (muted red for dark mode) |
| `--destructive-foreground` | `0 0% 98%` | Text on destructive |
| `--border` | `240 3.7% 15.9%` | Default borders |
| `--input` | `240 3.7% 15.9%` | Input borders |
| `--ring` | `239 84% 67%` | Focus rings (matches primary) |

**Pipeline Status Colors (custom tokens):**

| Status | Light Mode HSL | Dark Mode HSL | Usage |
|--------|---------------|---------------|-------|
| `--status-queued` | `240 5% 65%` | `240 5% 50%` | Neutral gray — waiting |
| `--status-scraping` | `199 89% 48%` | `199 89% 55%` | Cyan/blue — actively fetching |
| `--status-processing` | `262 83% 58%` | `262 83% 65%` | Purple — AI working |
| `--status-embedding` | `234 89% 74%` | `234 89% 68%` | Indigo — knowledge building |
| `--status-quiz-ready` | `38 92% 50%` | `38 92% 55%` | Amber — needs attention |
| `--status-completed` | `142 76% 36%` | `142 76% 45%` | Green — done |
| `--status-error` | `0 84% 60%` | `0 72% 51%` | Red — failed |

### Typography System

**Primary Typeface: IBM Plex Sans**
- Loaded via `next/font/google` for zero layout shift and self-hosting
- Sharp, screen-optimized, designed for data-dense interfaces
- Weight range: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Monospace Typeface: Geist Mono**
- Loaded via `next/font/local` (bundled with Next.js)
- Used for: code snippets, pipeline status labels, knowledge entry metadata, quiz answer content, confidence percentages, timestamps
- Weight range: 400 (regular), 500 (medium)

**Type Scale:**

| Token | Size | Line Height | Weight | Usage |
|-------|------|------------|--------|-------|
| `text-xs` | 12px | 16px | 400/500 | Timestamps, metadata, captions |
| `text-sm` | 14px | 20px | 400/500 | Body text, table cells, form labels |
| `text-base` | 16px | 24px | 400/500 | Default body, card content |
| `text-lg` | 18px | 28px | 500/600 | Subheadings, card titles |
| `text-xl` | 20px | 28px | 600 | Section headings |
| `text-2xl` | 24px | 32px | 600 | Page section headings |
| `text-3xl` | 30px | 36px | 700 | Hero stat numbers |
| `text-4xl` | 36px | 40px | 700 | Page titles (used sparingly) |

**Typography Rules:**
- Body text always `text-sm` (14px) — matches developer tool convention (VS Code, Linear, GitHub)
- Headings use semibold (600), never bold (700) except hero stats
- Monospace for anything that represents data, code, or system state
- No italic for emphasis — use medium weight (500) or color instead
- Maximum line length: 72ch for prose, unconstrained for data tables

### Spacing & Layout Foundation

**Base Unit: 4px**
All spacing derives from a 4px base, creating consistent visual rhythm.

**Spacing Scale:**

| Token | Value | Usage |
|-------|-------|-------|
| `space-0.5` | 2px | Tight inline spacing (icon-to-label gap) |
| `space-1` | 4px | Minimum padding (badge padding, tight gaps) |
| `space-1.5` | 6px | Compact element spacing |
| `space-2` | 8px | Standard gap between related elements |
| `space-3` | 12px | Card internal padding, form field spacing |
| `space-4` | 16px | Section spacing within a card or panel |
| `space-5` | 20px | Between cards in a grid |
| `space-6` | 24px | Page padding, major section separation |
| `space-8` | 32px | Large section gaps |
| `space-10` | 40px | Page section dividers |
| `space-12` | 48px | Hero section padding |

**Layout Constants:**

| Property | Value | Rationale |
|----------|-------|-----------|
| Content max-width | 1200px | Comfortable reading width for dashboard |
| Sidebar expanded | 240px | Fits icon + label + chevron |
| Sidebar collapsed | 48px | Icon-only, single column |
| Card border-radius | 8px | Sharp but not brutalist (shadcn default reduced) |
| Button border-radius | 6px | Slightly sharper than cards |
| Input border-radius | 6px | Matches buttons |
| Badge border-radius | 4px | Compact, tag-like |

**Grid System:**
- Dashboard: CSS Grid, 12-column base, responsive breakpoints at 640/768/1024/1280px
- Module card grid: `auto-fill, minmax(320px, 1fr)` — cards fill available width, wrap naturally
- Knowledge base: Split panel — fixed sidebar (280px) + flexible content area
- No rigid grid enforcement — components size to content within responsive containers

**Density (Balanced):**
- Card padding: 16px (comfortable without feeling wasteful)
- Table row height: 40px (readable without dense compression)
- List item spacing: 8px gap between items
- Form field spacing: 12px between fields, 24px between field groups
- Section dividers use 32px vertical spacing

### Accessibility Considerations

**Color Contrast:**
- All text on backgrounds meets WCAG 2.1 AA minimum (4.5:1 for normal text, 3:1 for large text)
- Primary indigo on white: ~5.2:1 (AA pass)
- Primary indigo on dark background: ~7.1:1 (AAA pass)
- Muted foreground on background: verified ≥ 4.5:1 in both themes
- Pipeline status colors are never used as the sole indicator — always paired with text labels or icons

**Focus Management:**
- Focus ring: 2px solid using `--ring` token, 2px offset
- All interactive elements have visible focus states in both themes
- Tab order follows visual layout (left-to-right, top-to-bottom)
- Cmd+K omnibar traps focus when open, returns focus on close

**Motion & Reduced Motion:**
- Pipeline state transitions use subtle CSS transitions (150ms ease)
- `prefers-reduced-motion: reduce` disables all animations, transitions become instant
- No auto-playing animations — all motion is triggered by user action or state change
- Real-time card updates use opacity fade (200ms), not position animation

**Screen Reader Support:**
- Radix UI primitives provide ARIA attributes automatically
- Pipeline status changes announced via `aria-live="polite"` region
- Hero stat cards include descriptive `aria-label` (e.g., "47 of 89 modules completed")
- Quiz review panel uses `role="dialog"` with proper labeling

## Design Direction Decision

### Design Directions Explored

Eight visual directions were generated and evaluated against the core experience model (URL submission → passive pipeline → quiz review). Full interactive mockups available at `ux-design-directions.html`.

1. **Operations Command Center** — Kanban pipeline columns with full sidebar. Strong pipeline visibility, but quiz review requires navigating away.
2. **Minimal Focus** — Collapsed icon sidebar with hero URL input. Clean launch, but deprioritizes pipeline monitoring and review.
3. **Dense Data Table** — Table-first with sortable columns. Maximum information density, but lacks the spatial pipeline metaphor.
4. **Split Panel (Linear-style)** — Three-panel list + detail. Strong for deep-diving into individual modules, but review isn't persistent.
5. **Timeline Flow** — Chronological activity stream. Good for passive monitoring, but treats everything as flat events without hierarchy.
6. **Card Grid Dashboard** — Rich cards in responsive grid. Visual and scannable, but review is a separate view.
7. **Quiz Review Focus** — Pipeline center + persistent review panel on right. Purpose-built for the passive + review mental model.
8. **Light Theme Variant** — Direction 1 in light mode. Validates the dual-theme token system works correctly across both themes.

### Chosen Direction

**Direction 7: Quiz Review Focus** — a three-column layout with persistent review panel.

- **Left column (220px):** Navigation sidebar with icon + label. Pages: Dashboard, Knowledge Base, Settings.
- **Center column (flexible):** Pipeline view with stat cards at top, URL input bar, and module list showing all active/queued/completed items with status badges and progress indicators.
- **Right column (340px):** Persistent review panel showing the current review queue. Displays quiz questions one at a time with AI-generated answers, confidence scores, and approve/edit actions. Collapses when no modules are quiz-ready.

### Design Rationale

Direction 7 was chosen because it directly maps to the product's core mental model:

- **Act 1 (Submit):** URL input is prominently placed in the center column's toolbar area, always accessible without navigating to a different page.
- **Act 2 (Watch):** The center column is a real-time pipeline view — modules flow from queued → scraping → processing → quiz-ready with live status badges and progress bars. This is the "passive" phase where the user watches automation work.
- **Act 3 (Review):** The persistent right panel means quiz-ready modules surface immediately without context-switching. The user sees a question, sees the AI answer with confidence, and clicks approve or edit. This is the only moment requiring active participation.
- **No mode-switching:** Unlike directions that require navigating between pipeline and review views, Direction 7 keeps both visible simultaneously. The user never loses pipeline context while reviewing quizzes.
- **Review panel collapses gracefully:** When nothing needs review, the right panel collapses and the pipeline expands to fill the space, avoiding wasted screen real estate.

### Implementation Approach

**Layout structure (CSS Grid):**

| State | Grid Template Columns |
|-------|----------------------|
| Review open | `220px 1fr 340px` |
| Review collapsed | `220px 1fr 0px` |
| Sidebar collapsed (tablet) | `48px 1fr 340px` |
| Mobile | Single column, bottom tab bar |

**Component breakdown:**

| Component | Purpose |
|-----------|---------|
| `AppShell` | Root layout with CSS Grid columns, manages panel visibility |
| `Sidebar` | Navigation with active state, collapsible to 48px icons on tablet |
| `PipelineView` | Center content: stats bar, URL input, module list |
| `ReviewPanel` | Right panel: review queue header, question display, answer card, confidence bar, approve/edit actions |
| `ModuleRow` | Compact row with status badge, progress bar, trail label |
| `QuizQuestion` | Single question with AI answer, confidence score, action buttons |
| `StatCard` | Hero metric (completed, badges, accuracy, time saved) |

**State transitions:**
- Review panel slides in (200ms ease) when first module reaches quiz-ready status
- Panel width animates between 0px and 340px
- `prefers-reduced-motion` makes the transition instant

**Responsive breakpoints:**

| Breakpoint | Behavior |
|-----------|----------|
| Desktop (≥1024px) | Three-column layout as designed |
| Tablet (768–1023px) | Sidebar collapses to icons, review panel becomes a slide-over |
| Mobile (<768px) | Single column, sidebar becomes bottom tab bar, review is a full-screen modal |

## User Journey Flows

### Journey 1: Trail Submission & Pipeline Run (Happy Path)

**Entry point:** User lands on Dashboard with empty pipeline state.

```mermaid
flowchart TD
    A[Dashboard loads — empty state] --> B[URL input focused with placeholder text]
    B --> C{User pastes trail/trailmix URL}
    C --> D[Client validates URL format]
    D -->|Invalid| E[Inline error: "Enter a valid Trailhead URL"]
    E --> B
    D -->|Valid| F[POST /api/trailmix/import]
    F --> G[URL input shows spinner + "Importing..."]
    G --> H{API response}
    H -->|Error| I[Toast: "Import failed — check URL"]
    I --> B
    H -->|Success| J[Modules populate pipeline list]
    J --> K[Stats cards animate from 0 to initial counts]
    K --> L[All modules show 'queued' badge]
    L --> M[First modules flip to 'scraping']
    M --> N[Real-time status updates via polling/SSE]
    N --> O{Module reaches quiz-ready?}
    O -->|No| N
    O -->|Yes — first one| P[Review panel slides in from right]
    P --> Q[Panel header: "Review Queue (1)"]
    Q --> R[First question displayed with AI answer + confidence]
    R --> S{User action}
    S -->|Approve| T[Next question loads]
    S -->|Edit| U[Answer becomes editable textarea]
    U --> V[User modifies → clicks Save]
    V --> T
    T --> W{More questions?}
    W -->|Yes| R
    W -->|No| X[Module status → 'completed']
    X --> Y[Stats update: completed count +1]
    Y --> Z{More quiz-ready modules?}
    Z -->|Yes| R
    Z -->|No — pipeline still running| AA[Review panel collapses]
    AA --> N
    Z -->|No — all done| AB[All modules completed state]
    AB --> AC[Stats show final numbers — clean "done" state]
```

**Key interaction details within Direction 7 layout:**
- **Center column** shows pipeline list with live status transitions (queued → scraping → processing → quiz-ready → completed)
- **Right panel** appears only when quiz-ready modules exist — no empty panel wasting space
- **Stat cards** at top always reflect current totals (real-time)
- **URL input** stays in center column toolbar — user can add another trail mid-run

### Journey 2: Error Recovery & Low Confidence

**Entry point:** User is watching an active pipeline run.

```mermaid
flowchart TD
    A[Pipeline running — modules processing] --> B{Error type?}
    B -->|Session expired| C[Module status → 'error']
    C --> D[Error badge shows on module row]
    D --> E[Toast: "Session expired — re-authenticate"]
    E --> F[Module row shows "Retry" action]
    F --> G{User clicks Retry?}
    G -->|Yes| H[Re-auth flow / session refresh]
    H --> I[Failed modules auto-retry via pg-boss]
    I --> J[Status returns to 'scraping']
    G -->|Ignores| K[Error modules stay visible, pipeline continues with others]

    B -->|Low confidence quiz| L[Module reaches quiz-ready with warning]
    L --> M[Review panel shows question]
    M --> N[Confidence bar amber/red instead of green]
    N --> O[Label: "Low confidence — review carefully"]
    O --> P{User reviews answer}
    P -->|Approve anyway| Q[Proceed to next question]
    P -->|Edit answer| R[User corrects answer in textarea]
    R --> Q
    P -->|Skip module| S[Module stays quiz-ready, moves down queue]

    B -->|Scraping timeout| T[Module status → 'error' with retry count]
    T --> U[Module row: "Failed (attempt 3/3)"]
    U --> V[User can adjust settings or manually retry]
```

**Key interaction details:**
- **Error states** are visible inline on module rows in center column — not hidden behind a separate page
- **Low confidence** shown via amber/red confidence bars in review panel — user decides to trust or edit
- **Retry actions** available directly on module rows — no navigation required
- **Pipeline continues** around errors — other modules keep processing

### Journey 3: Operations & Monitoring

**Entry point:** User returns to dashboard during multi-day run.

```mermaid
flowchart TD
    A[User opens Dashboard] --> B[Stats cards show current state]
    B --> C[Pipeline list shows all module statuses]
    C --> D{What does user check?}

    D -->|Overall progress| E[Stats: 47/89 completed, 94% accuracy, 62h saved]
    D -->|Failed modules| F[Filter chip: "Error" selected]
    F --> G[Only error modules shown in list]
    G --> H[Each shows error reason + retry count]
    H --> I{User action}
    I -->|Retry individual| J[Click retry on module row]
    I -->|Retry all failed| K[Bulk action button in toolbar]

    D -->|Review queue| L[Review panel shows pending count]
    L --> M[User works through quiz questions]

    D -->|Pipeline health| N[Settings page: system status]
    N --> O[Worker status, queue depth, rate limits]
    O --> P{Issue detected?}
    P -->|Rate limited| Q[Pause scraper toggle in settings]
    Q --> R[Wait for embeddings to catch up]
    R --> S[Resume at lower concurrency]
    P -->|All good| T[Return to dashboard]
```

**Key interaction details:**
- **Filter chips** in center column toolbar let user slice by status (All, Review, Active, Error, Done)
- **Settings page** accessible from sidebar — system health, concurrency controls
- **Bulk actions** available when filtering error modules
- **Review panel** persists across page loads — pending reviews don't get lost

### Journey 4: Knowledge Base Query (Post-Completion)

**Entry point:** User navigates to Knowledge Base from sidebar.

```mermaid
flowchart TD
    A[Click "Knowledge Base" in sidebar] --> B[Knowledge Base page loads]
    B --> C[Search input focused — Cmd+K also works globally]
    C --> D[User types query]
    D --> E[Hybrid search: vector + keyword]
    E --> F[Results list in left panel]
    F --> G[Each result shows: chunk title, source module, relevance score]
    G --> H{User clicks result}
    H --> I[Detail panel shows full chunk content]
    I --> J[Related concepts linked at bottom]
    J --> K{User clicks related concept?}
    K -->|Yes| L[Navigate to that knowledge entry]
    L --> J
    K -->|No| M[User copies content or continues searching]
```

**Key interaction details:**
- **Knowledge Base** uses a split-panel layout — search results left, detail right
- **Cmd+K** omnibar works from any page — searches both modules and knowledge
- **Concept relationships** surface cross-module connections (e.g., Apex triggers ↔ SObject events)

### Journey Patterns

**Navigation patterns:**
- **Sidebar persistence:** Active page highlighted, badge counts on Knowledge Base and Review items when pending items exist
- **Cmd+K omnibar:** Global search across modules, knowledge entries, and quiz questions. Available from any page. Opens centered modal, returns focus on close.
- **Filter chips:** Consistent pattern across pipeline view and knowledge base for slicing data by category/status

**Decision patterns:**
- **Binary actions:** Approve / Edit for quiz answers — no ambiguity, no "maybe later"
- **Progressive disclosure:** Module row shows status + badge → click to expand → review panel shows full detail
- **Inline errors:** Error states shown on the module row itself, not in a separate error log page

**Feedback patterns:**
- **Real-time status badges:** Color-coded badges with monospace labels transition automatically as pipeline stages change
- **Progress bars:** Per-module thin progress bars show scraping/processing progress
- **Stat card animation:** Numbers animate on change (count up/down) to draw attention to updates
- **Toast notifications:** Ephemeral, non-blocking toasts for errors and completions — auto-dismiss after 5 seconds
- **Review panel entrance:** Slides in from right (200ms) on first quiz-ready module — draws attention without interrupting

### Flow Optimization Principles

**Minimize steps to value:**
- Trail submission is 1 action: paste URL → pipeline starts. No configuration required (sensible defaults).
- Quiz review is 1 click per question: Approve (or Edit → Save). No "confirm submission" step.
- Knowledge search is instant: type → results appear (debounced 300ms).

**Reduce cognitive load:**
- Only one quiz question visible at a time in the review panel — sequential, not all-at-once
- Pipeline list auto-sorts: quiz-ready at top, then active, then queued, then completed (faded)
- Confidence score is a single visual bar + percentage — no multi-factor scoring to interpret

**Error recovery is always in-context:**
- Failed modules show retry buttons inline — no separate error management page
- Session expiry shows a clear toast with action — not a cryptic error code
- Low-confidence answers are flagged visually but not blocked — user decides the threshold

**Moments of quiet accomplishment:**
- Completed modules fade slightly and sort to the bottom — work moves "out of the way"
- Stats update in real-time as modules complete — the numbers tell the story
- No confetti, no celebration modals — just the satisfaction of watching numbers climb

## Component Strategy

### Design System Components (shadcn/ui Coverage)

**Directly usable from shadcn/ui (no customization needed):**

| Component | Usage in TrailBlazeAI |
|-----------|----------------------|
| `Button` | Approve, Edit, Save, Retry, Start actions |
| `Input` | URL input field, search input, answer edit textarea |
| `Badge` | Pipeline status labels (queued, scraping, processing, etc.) |
| `Card` | Stat cards, module cards |
| `Dialog` | Cmd+K omnibar modal |
| `Toast` (via Sonner) | Error notifications, completion notices |
| `Tooltip` | Icon-only sidebar tooltips, truncated text reveals |
| `ScrollArea` | Pipeline list, review panel question list, knowledge results |
| `Separator` | Section dividers within panels |
| `Skeleton` | Loading states for pipeline list, stats, review panel |
| `Command` | Cmd+K omnibar search (cmdk-based) |
| `DropdownMenu` | Filter options, bulk actions, module row actions |
| `Popover` | Settings controls, inline detail popovers |
| `Tabs` | Knowledge base categories, settings sections |
| `Textarea` | Quiz answer editing |
| `Toggle` | Pause/resume scraper, settings switches |

**Customized shadcn/ui (restyled with our tokens):**

| Component | Customization |
|-----------|--------------|
| `Badge` | Extended with 7 pipeline status color variants using `--status-*` tokens |
| `Progress` | Thin 4px variant with gradient fills per pipeline stage |
| `Card` | Reduced border-radius to 8px, subtle hover border-color transition |
| `Button` | Indigo primary, ghost variant for secondary, 6px border-radius |

### Custom Components

#### `AppShell`

**Purpose:** Root layout managing the three-column CSS Grid (sidebar + pipeline + review panel)
**Anatomy:** CSS Grid container with `grid-template-columns` that transitions when review panel opens/closes
**States:**

| State | Grid Columns | Condition |
|-------|-------------|-----------|
| Review open | `220px 1fr 340px` | Quiz-ready modules exist |
| Review collapsed | `220px 1fr` | No modules need review |
| Sidebar collapsed | `48px 1fr 340px` | Tablet breakpoint |
| Mobile | Single column | <768px breakpoint |

**Behavior:** Review panel column transitions on 200ms ease. `prefers-reduced-motion` makes instant.
**Accessibility:** Landmark roles — `<nav>` for sidebar, `<main>` for pipeline, `<aside>` for review panel

#### `Sidebar`

**Purpose:** Primary navigation with page links and badge indicators
**Anatomy:** Logo + nav items (icon + label) + settings link at bottom
**States:**

| State | Width | Display |
|-------|-------|---------|
| Expanded | 220px | Icon + label + optional badge count |
| Collapsed | 48px | Icon only with tooltip on hover |
| Active item | — | Highlighted background, indigo right border |

**Variants:** Desktop expanded, tablet collapsed, mobile bottom tab bar
**Accessibility:** `role="navigation"`, `aria-current="page"` on active item, tooltips on collapsed icons

#### `StatCard`

**Purpose:** Hero metric display (completed count, badges, accuracy, time saved)
**Anatomy:** Label (text-xs, muted) + value (text-3xl, monospace, colored) + sub-label (text-xs, muted)
**States:**

| State | Behavior |
|-------|----------|
| Default | Static display |
| Updating | Value animates on change (count up/down, 300ms) |
| Loading | Skeleton placeholder |

**Accessibility:** `aria-label` combining all three text elements (e.g., "47 of 89 modules completed")

#### `ModuleRow`

**Purpose:** Single module in the pipeline list — shows status, trail, progress
**Anatomy:** Status badge + module name + trail label + progress bar (if active) + action button (if actionable)
**States:**

| State | Visual Treatment |
|-------|-----------------|
| Queued | Muted, no progress bar |
| Scraping | Cyan border accent, progress bar with cyan fill |
| Processing | Purple border accent, progress bar with purple fill |
| Quiz-ready | Amber border accent, "Review" button visible |
| Completed | Faded opacity (0.6), sorted to bottom |
| Error | Red border accent, error message + "Retry" button |

**Actions:** Click quiz-ready row → scrolls review panel to that module's questions
**Accessibility:** `role="listitem"`, status announced via `aria-label`, action buttons have descriptive labels

#### `ReviewPanel`

**Purpose:** Persistent right panel for quiz question review
**Anatomy:** Header (module name + question count) + question display + answer card + confidence bar + action buttons
**States:**

| State | Behavior |
|-------|----------|
| Hidden | Width 0, not rendered in DOM |
| Open | Slides in at 340px, shows current review queue |
| Reviewing | Displays one question at a time with AI answer |
| Empty queue | Auto-collapses after last question approved |

**Behavior:** Panel entrance 200ms ease from right. Question transitions use opacity fade.
**Accessibility:** `role="complementary"`, `aria-live="polite"` for question changes, focus trapped in panel when reviewing

#### `QuizQuestion`

**Purpose:** Single quiz question with AI-generated answer and review actions
**Anatomy:** Question counter (Q1 of 5) + question text + answer card (indigo background) + confidence bar + Approve/Edit buttons
**States:**

| State | Behavior |
|-------|----------|
| Reviewing | Question + answer displayed, actions enabled |
| Editing | Answer text in editable textarea, Save/Cancel replace Approve/Edit |
| Approved | Brief success flash, auto-advances to next question |
| Low confidence | Confidence bar amber/red, "Low confidence" label shown |

**Actions:** Approve (advance), Edit (enter edit mode), Save (confirm edit), Cancel (revert edit)
**Accessibility:** Question and answer linked via `aria-describedby`, confidence percentage read aloud, keyboard: Enter to approve, E to edit

#### `ConfidenceBar`

**Purpose:** Visual representation of AI answer confidence
**Anatomy:** Thin bar (48px wide, 4px tall) with colored fill + percentage label
**States:**

| Range | Color | Extra |
|-------|-------|-------|
| ≥90% | Green fill | — |
| 70–89% | Amber fill | — |
| <70% | Red fill | "Low confidence" label |

**Accessibility:** `role="meter"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Confidence: 94%"`

#### `PipelineFilter`

**Purpose:** Filter chip bar for slicing pipeline by status
**Anatomy:** Row of filter chips with counts — All (89), Review (3), Active (3), Error (0), Done (47)
**States:**

| State | Behavior |
|-------|----------|
| Default | One chip active (All), others neutral |
| Filtered | Active chip highlighted with indigo accent, list filters |
| Zero-count | Chip still visible but muted (e.g., "Error (0)") |

**Behavior:** Single-select. Click chip → pipeline list filters. Counts update in real-time.
**Accessibility:** `role="radiogroup"` with `role="radio"` on each chip

#### `URLInput`

**Purpose:** Trail/trailmix URL submission input with inline validation
**Anatomy:** Icon prefix (→) + text input + submit button (or spinner when importing)
**States:**

| State | Visual Treatment |
|-------|-----------------|
| Empty | Placeholder text "Paste a Trailhead trail or module URL..." |
| Focused | Indigo ring, placeholder fades |
| Validating | Spinner replaces submit button |
| Error | Red border, inline error message below |
| Success | Input clears, pipeline populates |

**Accessibility:** `aria-label="Trail URL input"`, error linked via `aria-describedby`

### Component Implementation Strategy

**Build approach:**
- All custom components built with React Server Components where possible (stat cards, sidebar)
- Client components only where interactivity requires it (review panel, quiz question, URL input)
- Composed from shadcn/ui primitives — custom components wrap `Card`, `Badge`, `Button`, `Progress` etc.
- Styled with Tailwind v4 using the semantic tokens defined in the Visual Design Foundation
- All components accept `className` prop for composition

**File organization:**

```
apps/web/src/components/
  ui/                    → shadcn/ui components (generated)
  layout/
    app-shell.tsx        → AppShell grid layout
    sidebar.tsx          → Navigation sidebar
    review-panel.tsx     → Quiz review panel
  pipeline/
    stat-card.tsx        → Hero metric card
    module-row.tsx       → Pipeline module row
    pipeline-filter.tsx  → Status filter chips
    url-input.tsx        → URL submission input
  review/
    quiz-question.tsx    → Question + answer + actions
    confidence-bar.tsx   → Confidence meter
  knowledge/
    search-results.tsx   → Knowledge search results list
    knowledge-detail.tsx → Knowledge entry detail view
```

### Implementation Roadmap

**Phase 1 — Core Shell (needed for any page to render):**
- `AppShell` — three-column grid layout
- `Sidebar` — navigation between pages
- `URLInput` — trail submission (Act 1 entry point)

**Phase 2 — Pipeline View (Act 2 — the main experience):**
- `StatCard` — hero metrics at top
- `ModuleRow` — pipeline list items
- `PipelineFilter` — status filter chips
- Customized `Badge` with 7 status variants
- Customized `Progress` with thin gradient variant

**Phase 3 — Review Experience (Act 3 — the active moment):**
- `ReviewPanel` — sliding right panel
- `QuizQuestion` — question + answer display
- `ConfidenceBar` — confidence meter
- Answer editing textarea integration

**Phase 4 — Knowledge Base (post-completion value):**
- Knowledge search results list
- Knowledge entry detail view
- Concept relationship links
- Cmd+K omnibar integration (shadcn `Command`)

## UX Consistency Patterns

### Button Hierarchy

**Three tiers, strictly enforced:**

| Tier | Style | Usage | Examples |
|------|-------|-------|----------|
| **Primary** | Solid indigo (`bg-primary text-primary-foreground`) | One per visible context. The single action the user should take next. | "Approve", "Start", "Save" |
| **Secondary** | Ghost with border (`bg-transparent border text-foreground`) | Alternative to primary. Lower visual weight. | "Edit", "Cancel", "Retry" |
| **Tertiary** | Text-only (`text-muted-foreground hover:text-foreground`) | Least important. Never competes with primary. | "Skip", "Dismiss", "View all" |

**Rules:**
- Never place two primary buttons adjacent to each other — if both actions are equally important, both are secondary
- Primary button always on the left in action pairs (Approve | Edit), matching natural reading order
- Destructive actions (if any) use `destructive` variant — never primary
- Disabled buttons show `opacity-50 cursor-not-allowed` — never hidden (user should know the action exists)
- Button minimum touch target: 44x44px on mobile, 32x32px on desktop
- Icon-only buttons always have `aria-label` and `Tooltip`

### Feedback Patterns

**Toast notifications (via Sonner):**

| Type | Color | Icon | Duration | Example |
|------|-------|------|----------|---------|
| Success | Green left border | Checkmark | 3s auto-dismiss | "Module completed — 5/5 correct" |
| Error | Red left border | X circle | Persistent until dismissed | "Import failed — invalid Trailhead URL" |
| Warning | Amber left border | Alert triangle | 5s auto-dismiss | "Session expiring — re-authenticate soon" |
| Info | Indigo left border | Info circle | 3s auto-dismiss | "3 modules added to queue" |

**Rules:**
- Toasts appear bottom-right, stacked with 8px gap
- Maximum 3 visible toasts — oldest auto-dismissed when 4th arrives
- Error toasts are persistent (user must dismiss) — errors should not silently disappear
- Toasts never contain actions beyond "Dismiss" — if action needed, use inline UI instead
- `prefers-reduced-motion`: no slide-in animation, instant appear/disappear

**Inline feedback (on components):**

| Feedback | Mechanism | Example |
|----------|-----------|---------|
| Status change | Badge color transition (150ms) | queued → scraping badge swap |
| Progress | Progress bar fill animation (300ms ease) | Scraping 60% → 65% |
| Approval | Brief green flash on answer card (200ms), then auto-advance | Quiz answer approved |
| Validation error | Red border + error text below input (instant) | Invalid URL format |
| Loading | Skeleton placeholder matching component shape | Stats loading, list loading |

**Real-time updates:**
- Pipeline status changes appear instantly (SSE/polling) — no manual refresh needed
- Stat card numbers animate when changing (count up/down, 300ms)
- New quiz-ready modules trigger review panel entrance if panel was collapsed
- All real-time updates announced via `aria-live="polite"` — never `"assertive"` (not urgent enough to interrupt)

### Loading & Empty States

**Loading states (Skeleton pattern):**

| Component | Skeleton Shape |
|-----------|---------------|
| StatCard | Rectangular block matching label + value + sub-label areas |
| ModuleRow | Horizontal bar matching badge + title + trail label widths |
| ReviewPanel | Question block + answer block + button row |
| Knowledge results | Repeated title + subtitle rows |

**Rules:**
- Skeleton uses `bg-muted animate-pulse` (standard shadcn pattern)
- Skeleton shapes match final component dimensions exactly — no layout shift on load
- Show skeleton for minimum 200ms even if data arrives faster — prevents flash
- `prefers-reduced-motion`: skeleton uses static `bg-muted` without pulse animation

**Empty states:**

| Context | Empty State Content |
|---------|-------------------|
| Dashboard (no trails) | Centered: "Paste a Trailhead URL to get started" with focused URL input. No illustration — just the input. |
| Pipeline (all complete) | Stats at top show final numbers. Module list shows completed items. Clean, quiet "done." |
| Review panel (nothing to review) | Panel collapsed. No empty state message — absence is the message. |
| Knowledge base (no content) | "Process some Trailhead modules to build your knowledge base." |
| Filter with no results | "No modules match this filter." with link to clear filter. |
| Error list (no errors) | Filter chip shows "Error (0)" — muted but visible. No separate empty state. |

**Rules:**
- Empty states are never cute or elaborate — one sentence max, actionable when possible
- No illustrations, mascots, or decorative elements in empty states
- If the empty state has an obvious next action, include it inline (e.g., URL input in empty dashboard)

### Navigation Patterns

**Sidebar navigation:**
- Active page: highlighted background (`bg-accent`) + indigo right border (2px)
- Hover: subtle background (`bg-accent/50`)
- Badge counts on nav items when pending items exist (e.g., "Review (3)")
- Badge counts use muted style — never red/urgent unless truly critical

**Cmd+K omnibar:**
- Opens centered dialog (shadcn `Command` component)
- Three result sections: Modules, Knowledge, Actions
- Keyboard: arrow keys navigate, Enter selects, Escape closes
- Focus trapped in dialog while open — returns to previous element on close
- Debounced search: 300ms delay before querying
- Recent searches shown when input is empty

**Filter chips (pipeline + knowledge base):**
- Single-select within a filter group
- Active chip: indigo background accent + indigo border
- Inactive chip: transparent + muted border
- Chips include count in parentheses: "Review (3)"
- Counts update in real-time as pipeline state changes
- "All" chip always first, always available

**Page transitions:**
- No page transition animations — instant swap (Next.js App Router default)
- Sidebar active state updates instantly on navigation
- Review panel state persists across page navigations (stored in React state / URL params)

### Form Patterns

**URL input (primary form element):**
- Always visible in pipeline toolbar — no "Add" button to reveal it
- Auto-focus on empty dashboard (first visit)
- Validates on blur and on submit
- Validation: must match Trailhead URL pattern (`trailhead.salesforce.com/*`)
- Error shown inline below input: red border + red text
- Success: input clears, pipeline populates, no success message (the populated list IS the success)

**Answer editing (quiz review):**
- Click "Edit" → answer card becomes editable `Textarea`
- Textarea auto-sizes to content (min 3 rows, max 8 rows)
- "Save" and "Cancel" buttons replace "Approve" and "Edit"
- Cancel reverts to original AI answer — no data loss
- No character limit on edited answers
- Edited answers visually marked: "Edited" label replaces confidence score

**Settings forms:**
- Standard vertical field layout: label above input, 12px gap between fields
- Field groups separated by 24px
- Save on explicit action (Save button), not auto-save — settings changes should be intentional
- Validation errors shown inline below each field

### Search & Filtering Patterns

**Knowledge base search:**
- Search input at top of knowledge page, always visible
- Results appear as user types (debounced 300ms)
- Results show: chunk title, source module name, relevance score (monospace, muted)
- Click result → detail panel shows full content
- No pagination — virtual scroll for large result sets
- Empty search shows recent/popular entries

**Pipeline filtering:**
- Filter chips in toolbar (defined above in Navigation Patterns)
- Filters are additive to search — Cmd+K search within filtered results
- Filter state reflected in URL params (bookmarkable, shareable)
- Clear all filters: click "All" chip

**Sort behavior:**
- Pipeline list default sort: quiz-ready first → active (by stage) → queued → completed (faded)
- Knowledge results sorted by relevance score (default) or recency (toggle)
- Sort preference persists in local storage

### Transition & Animation Patterns

**Standard transitions:**

| Element | Property | Duration | Easing | Trigger |
|---------|----------|----------|--------|---------|
| Review panel | width | 200ms | ease | Quiz-ready module arrives/clears |
| Badge color | background-color, color | 150ms | ease | Status change |
| Progress bar fill | width | 300ms | ease | Progress update |
| Stat card value | opacity (cross-fade) | 300ms | ease | Value change |
| Module row hover | border-color | 150ms | ease | Mouse enter/leave |
| Toast enter | translate-y + opacity | 200ms | ease-out | Notification arrives |
| Toast exit | opacity | 150ms | ease-in | Auto-dismiss or manual |
| Filter chip | background, border-color | 100ms | ease | Click |

**`prefers-reduced-motion: reduce` overrides:**
- All transitions set to `duration: 0ms` — instant state changes
- Skeleton pulse animation disabled — static muted background
- Toast enter/exit: instant appear/disappear
- Stat card values: instant swap, no cross-fade

## Responsive Design & Accessibility

### Responsive Strategy

**Desktop-first approach.** TrailBlazeAI is a power-user automation tool. The primary use case (watching pipeline + reviewing quizzes) benefits from screen real estate. Mobile is a monitoring convenience, not the core experience.

**Desktop (≥1024px) — Full experience:**
- Three-column layout: sidebar (220px) + pipeline (flexible) + review panel (340px)
- All features available: full pipeline view, quiz review, knowledge base, settings
- Stat cards in 4-column grid
- Filter chips fully visible
- Cmd+K omnibar available

**Tablet (768–1023px) — Adapted experience:**
- Two-column layout: collapsed sidebar (48px icons) + pipeline (flexible)
- Review panel becomes a slide-over drawer (triggered by tapping quiz-ready module)
- Stat cards in 2-column grid (2x2)
- Filter chips scroll horizontally if needed
- Touch targets enlarged to 44px minimum
- Cmd+K available via toolbar search icon

**Mobile (<768px) — Monitoring experience:**
- Single column layout
- Sidebar replaced by bottom tab bar (4 tabs: Dashboard, Knowledge, Review, Settings)
- Review panel becomes full-screen modal (swipe down to dismiss)
- Stat cards stack vertically or display as 2-column compact grid
- URL input accessible from floating action button or top of dashboard
- Filter chips in horizontally scrollable row
- Simplified module rows (badge + title only, tap to expand)

### Breakpoint Strategy

**Breakpoints (Tailwind v4 defaults):**

| Token | Width | Layout Change |
|-------|-------|--------------|
| `sm` | 640px | Minor adjustments: stack stat cards, compact spacing |
| `md` | 768px | Tablet layout: sidebar collapses, 2-column stats |
| `lg` | 1024px | Desktop layout: three-column grid, review panel inline |
| `xl` | 1280px | Wide desktop: content max-width 1200px, centered |

**Container strategy:**
- Content max-width: 1200px on xl+ screens, centered with auto margins
- Below xl: full-width with 24px horizontal padding (desktop), 16px (tablet), 12px (mobile)
- No fixed breakpoint at 1536px (2xl) — not needed for this product

**Approach:** Desktop-first media queries using Tailwind's responsive prefixes. Base styles are desktop, with `max-md:` and `max-lg:` overrides for smaller screens. This matches the development priority: build the full desktop experience first, then adapt down.

### Accessibility Strategy

**Compliance target: WCAG 2.1 Level AA**

This is the industry standard for professional web applications. It covers all essential accessibility needs without the overhead of AAA compliance (which requires enhanced contrast ratios and reading level constraints that are unnecessary for a developer tool).

**Color & Contrast:**

| Requirement | Standard | Our Implementation |
|-------------|----------|-------------------|
| Normal text contrast | 4.5:1 minimum | Primary indigo on white: 5.2:1 (pass) |
| Large text contrast | 3:1 minimum | All heading colors verified ≥ 3.5:1 |
| Non-text contrast | 3:1 minimum | Pipeline status badge backgrounds meet threshold |
| Color not sole indicator | Must pair with text/icon | All status badges include text label, never color-only |

**Keyboard Navigation:**

| Context | Keys | Behavior |
|---------|------|----------|
| Global | `Cmd+K` | Open omnibar |
| Global | `Escape` | Close any modal/panel/omnibar |
| Pipeline list | `Tab` / `Shift+Tab` | Navigate between module rows |
| Pipeline list | `Enter` | Expand module / open in review panel |
| Review panel | `Enter` | Approve current answer |
| Review panel | `E` | Edit current answer |
| Review panel | `Tab` | Move between Approve/Edit buttons |
| Filter chips | `Arrow Left/Right` | Navigate between chips |
| Filter chips | `Enter` / `Space` | Activate chip |
| Sidebar | `Tab` | Navigate between nav items |
| Sidebar | `Enter` | Navigate to page |

**Focus management:**
- Focus ring: 2px solid `--ring` token, 2px offset, visible in both themes
- Skip link: "Skip to main content" as first focusable element (hidden until focused)
- Modal focus trap: Cmd+K omnibar and review modal (mobile) trap focus, return on close
- Review panel: focus moves to first question when panel opens, returns to triggering module row when panel closes

**Screen reader support:**

| Element | ARIA Implementation |
|---------|-------------------|
| AppShell | `<nav>`, `<main>`, `<aside>` landmark roles |
| Sidebar | `role="navigation"`, `aria-current="page"` on active |
| Stat cards | `aria-label` with full context (e.g., "47 of 89 modules completed") |
| Pipeline list | `role="list"`, `role="listitem"` on rows |
| Status badges | `aria-label` with status text |
| Pipeline updates | `aria-live="polite"` region for status changes |
| Review panel | `role="complementary"`, `aria-label="Quiz review"` |
| Quiz question | `aria-describedby` linking question to answer |
| Confidence bar | `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Filter chips | `role="radiogroup"` with `role="radio"` on each |
| Toasts | `role="status"` (polite announcement) |

**Motion & animation:**
- All animations respect `prefers-reduced-motion: reduce` — instant transitions
- No auto-playing animations — all motion triggered by user action or data change
- Skeleton loading pulse disabled under reduced motion — static muted background

### Testing Strategy

**Automated testing (CI pipeline):**
- `eslint-plugin-jsx-a11y` — catches common accessibility issues at build time
- `axe-core` via Playwright — automated accessibility audit on all pages
- Lighthouse CI — accessibility score ≥ 90 enforced on PR checks
- Color contrast checker in design token validation

**Manual testing checklist (per feature):**
- [ ] Keyboard-only navigation: can complete all tasks without mouse
- [ ] Screen reader walkthrough: VoiceOver (macOS) announces all content correctly
- [ ] Focus order matches visual layout (left-to-right, top-to-bottom)
- [ ] All interactive elements have visible focus indicators
- [ ] Color is never the sole indicator of state
- [ ] Touch targets ≥ 44px on mobile breakpoints
- [ ] Reduced motion preference respected

**Browser/device testing matrix:**

| Browser | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Chrome | Primary | Secondary | Secondary |
| Firefox | Primary | — | — |
| Safari | Primary | Primary (iPad) | Primary (iPhone) |
| Edge | Secondary | — | — |

### Implementation Guidelines

**Responsive development:**
- Use Tailwind responsive prefixes (`md:`, `lg:`, `xl:`) for layout changes
- Use `rem` for typography and spacing — scales with user font size preferences
- Use CSS Grid for page layout, Flexbox for component internals
- Test with browser zoom 100%, 150%, 200% — layout must not break
- Images and icons use SVG where possible — scales cleanly at any resolution

**Accessibility development:**
- Semantic HTML first: `<nav>`, `<main>`, `<aside>`, `<button>`, `<a>`, `<h1>`–`<h3>`
- Only use `div`/`span` for styling containers — never for interactive elements
- Radix UI primitives (via shadcn) provide ARIA attributes automatically — don't override
- Custom components must include `aria-label` or `aria-labelledby` where visible text is insufficient
- All `aria-live` regions use `"polite"` — never `"assertive"` for this product
- Focus management: use `useRef` + `focus()` for programmatic focus changes (panel open/close)
- Test with `tabindex` carefully — only `0` (natural order) or `-1` (programmatic only), never positive values

**CSS custom properties for theming:**
- All colors reference semantic tokens (`--primary`, `--muted-foreground`, etc.)
- Dark/light theme toggle via `data-theme` attribute on `<html>`
- Theme preference stored in `localStorage`, respects `prefers-color-scheme` as default
- No color hex values in component CSS — always token references
