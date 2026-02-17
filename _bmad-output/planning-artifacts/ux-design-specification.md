---
stepsCompleted: [1, 2, 3]
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
