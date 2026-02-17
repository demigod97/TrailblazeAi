# TrailBlazeAI — Project Context

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | Next.js | ^15.2 | App Router, RSC, Vercel deployment |
| UI Framework | Tailwind CSS | ^4 | CSS-first config, no tailwind.config.ts |
| UI Components | shadcn/ui | latest | new-york style, radix-ui primitives |
| Backend | Fastify | ^5.2 | ESM-first, Docker deployment |
| Database | Supabase | ^2.49 | PostgreSQL, Row-Level Security |
| AI SDK | Vercel AI SDK | ^5 | Anthropic provider ^2, MCP support |
| Job Queue | pg-boss | ^10 | Uses Supabase PostgreSQL connection |
| Browser Automation | Playwright MCP | latest | Content extraction + quiz interaction |
| Build System | Turborepo | ^2.4 | pnpm workspaces |
| Language | TypeScript | ^5.7 | Strict mode, ESM everywhere |
| Runtime | Node.js | >=22 | LTS (production), >=18 (development) |
| Package Manager | pnpm | 9.15.4 | Strict dependency resolution |

## Critical Implementation Rules

1. **No `any` types** — Use `unknown` + type narrowing or Zod parsing instead
2. **Zod for all boundaries** — Environment variables, API request bodies, external data
3. **ESM everywhere** — All packages use `"type": "module"` and `.js` extensions in relative imports
4. **Strict TypeScript** — `strict: true`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
5. **Path aliases** — `@/*` resolves to `./src/*` in apps/web; use bare workspace imports elsewhere
6. **CSS-first Tailwind** — No `tailwind.config.ts`; customization via `@theme` directives in `globals.css`
7. **Server-first React** — Default to Server Components; add `"use client"` only when needed

## Code Patterns

### API Route Handler (Fastify)
```typescript
import { z } from "zod";
const bodySchema = z.object({ url: z.string().url() });
app.post("/api/trailmix/import", async (request, reply) => {
  const body = bodySchema.parse(request.body);
  // ...
});
```

### Supabase Client (Server Component)
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data, error } = await supabase.from("modules").select("*");
```

### shadcn/ui Component Usage
```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

## Workspace Packages

| Package | Scope | Exports |
|---------|-------|---------|
| `@trailblaze/web` | apps/web | Next.js app (not imported) |
| `@trailblaze/api` | apps/api | Fastify server (not imported) |
| `@trailblaze/db` | packages/db | `createClient()`, `Database` type |
| `@trailblaze/shared` | packages/shared | Domain types, constants, job types |

## Environment Variables

All env vars validated by Zod at startup. See `.env.example` for complete list.
Critical: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `API_BEARER_TOKEN`
