---
name: code-quality
description: Enforce TrailblazeAi code quality standards including TypeScript strict mode, Zod validation, ESM modules, and project conventions. Use this skill when reviewing or writing code. Integrates with BMAD code review workflow for adversarial review.
---

# Code Quality Skill

## BMAD Code Review Protocol

When performing code reviews (via `/bmad:bmm:workflows:code-review`):

1. **Adversarial review** — Find 3-10 specific problems in every story. NEVER accept "looks good"
2. **Story compliance** — Verify implementation matches story acceptance criteria exactly
3. **project-context.md** — Check code against `_bmad-output/planning-artifacts/project-context.md` rules
4. **Architecture compliance** — Verify patterns match `_bmad-output/planning-artifacts/architecture.md`
5. **Test verification** — Tests must actually exist and pass 100%. NEVER lie about tests
6. **Auto-fix with approval** — Can propose fixes but require user approval before applying

## TypeScript Standards

- Strict mode enabled (`"strict": true`)
- No `any` types allowed — use `unknown` and narrow with type guards or Zod
- `noUncheckedIndexedAccess` enabled — always handle potential `undefined`
- ESM everywhere (`"type": "module"`)
- Explicit return types on exported functions

## Validation Patterns

- All external data validated with Zod schemas
- Environment variables validated at startup (see `apps/api/src/config.ts`)
- API request/response bodies validated with Zod
- Use `z.infer<typeof schema>` to derive types from schemas

## Import Conventions

- Use `@/*` alias in apps/web for src/ imports
- Use workspace protocol for internal packages (`@trailblaze/shared`, `@trailblaze/db`)

## Styling Conventions

- Tailwind CSS v4 (CSS-first config with `@import "tailwindcss"`)
- shadcn/ui components (new-york style, radix-ui primitives)
- Components in `apps/web/src/components/ui/`

## BMAD-Aligned Review Checklist

1. No `any` types
2. All external data has Zod validation
3. Proper error handling with typed errors
4. ESM import/export syntax
5. Consistent naming (camelCase functions, PascalCase components/types)
6. No unused imports or variables
7. Proper use of workspace package imports
8. Story acceptance criteria fully met
9. Tests exist and pass for all new functionality
10. Architecture patterns followed (check architecture.md)
