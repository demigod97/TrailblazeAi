---
name: trailhead-automation
description: Automate Salesforce Trailhead module completion using Playwright for content extraction, Claude for quiz answering, and Supabase for progress tracking. Use this skill when working on the core automation pipeline.
---

# Trailhead Automation Skill

## Overview
This skill handles the end-to-end automation of Salesforce Trailhead module completion.

## Pipeline Steps

1. **Content Extraction** - Use Playwright MCP to navigate Trailhead pages and extract module content
2. **Knowledge Building** - Process extracted content through Claude API to build structured knowledge entries
3. **Quiz Answering** - Analyze quiz questions against knowledge base to determine correct answers
4. **Progress Tracking** - Record completion status in Supabase database

## Key Architecture

- Browser automation via `@playwright/mcp` MCP server
- Content stored in Supabase `modules`, `units`, `knowledge_entries` tables
- Quiz answers processed through AI SDK v5 with Claude
- Job queue managed by pg-boss in the API service

## Commands

```bash
# Start the API server (handles job processing)
pnpm --filter @trailblaze/api dev

# Start the web dashboard
pnpm --filter @trailblaze/web dev
```

## Important Files

- `apps/api/src/` - Backend processing pipeline
- `apps/web/src/` - Progress dashboard
- `packages/db/` - Supabase client and types
- `packages/shared/src/types/trailhead.ts` - Domain types
