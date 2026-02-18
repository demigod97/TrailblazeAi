---
name: code-quality
description: Enforce TrailblazeAi code quality standards including TypeScript strict mode, Zod validation, ESM modules, and project conventions. Use this skill when reviewing or writing code.
---

# Code Quality Skill

## TypeScript Standards
- Strict mode enabled (`"strict": true`)
- No `any` types allowed
- `noUncheckedIndexedAccess` enabled
- ESM everywhere (`"type": "module"`)

## Validation Patterns
- All external data validated with Zod schemas
- Environment variables validated at startup (see `apps/api/src/config.ts`)
- API request/response bodies validated with Zod

## Import Conventions
- Use `@/*` alias in apps/web for src/ imports
- Use workspace protocol for internal packages (`@trailblaze/shared`, `@trailblaze/db`)

## Styling Conventions
- Tailwind CSS v4 (CSS-first config with `@import "tailwindcss"`)
- shadcn/ui components (new-york style, radix-ui primitives)
- Components in `apps/web/src/components/ui/`

## Code Review Checklist
1. No `any` types
2. All external data has Zod validation
3. Proper error handling with typed errors
4. ESM import/export syntax
5. Consistent naming (camelCase functions, PascalCase components/types)
6. No unused imports or variables
7. Proper use of workspace package imports
