---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
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
