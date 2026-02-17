---
stepsCompleted: [1, 2]
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
