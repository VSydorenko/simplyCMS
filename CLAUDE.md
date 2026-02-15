# CLAUDE.md — SimplyCMS

## Quick Reference

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build
pnpm typecheck        # TypeScript type check
pnpm lint             # ESLint
pnpm lint:fix         # ESLint (auto-fix)
pnpm test             # Run tests (vitest run)
pnpm test:watch       # Tests in watch mode
```

## What This Project Is

SimplyCMS is an open-source e-commerce CMS built with Next.js 16 App Router and Supabase. It provides a full storefront (SSR), admin panel (client-side SPA), user profiles, cart, checkout, and order management. The core CMS packages are distributed via Git Subtree from a separate repository.

## Mandatory Instructions

All detailed coding rules, architecture decisions, and domain-specific guidelines are maintained in `.github/instructions/`. **These are mandatory and must be followed.**

| File | Scope | Description |
|------|-------|-------------|
| [`architecture-core`](.github/instructions/architecture-core.instructions.md) | `**/*` | Core architecture, rendering strategies, themes, plugins, auth |
| [`coding-style`](.github/instructions/coding-style.instructions.md) | `**/*` | TypeScript strict mode, Ukrainian comments, file limits |
| [`data-access`](.github/instructions/data-access.instructions.md) | `app/**`, `packages/**` | Supabase clients, caching, data fetching, DB types |
| [`ui-architecture`](.github/instructions/ui-architecture.instructions.md) | `app/**`, `themes/**`, `ui/**` | UI components, theme structure, shadcn/ui |
| [`editor`](.github/instructions/editor.instructions.md) | `core/**` | Tiptap editor integration |
| [`storage`](.github/instructions/storage.instructions.md) | `core/**`, `app/**` | Supabase Storage patterns |
| [`tooling`](.github/instructions/tooling.instructions.md) | `**/*` | Commands, formatting, testing |
| [`optimization`](.github/instructions/optimization.instructions.md) | `**/*.ts,tsx` | Performance, bundle, rendering optimization |

Also see:
- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — Full project overview, MCP servers, agents
- [`AGENTS.md`](AGENTS.md) — Agent-specific instructions

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **Language:** TypeScript 5.9 (strict mode)
- **Package Manager:** pnpm 10.26 (workspaces)
- **Database:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **UI:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Forms:** react-hook-form + Zod 4
- **Data Fetching:** TanStack React Query 5 (client components)
- **Rich Text:** Tiptap v3
- **Testing:** Vitest 4 + Testing Library

## Project Structure

```
simplyCMS/
├── app/                              # Next.js App Router
│   ├── (storefront)/                 # Public SSR pages — uses getActiveThemeSSR()
│   ├── (cms)/admin/                  # Admin panel (client-side, auth-guarded)
│   ├── (protected)/                  # Auth-protected user pages (profile, orders)
│   ├── auth/                         # Login/register + OAuth callback
│   ├── api/                          # API routes (health, guest-order, revalidate)
│   ├── theme-registry.server.ts      # Server-side theme registration
│   ├── providers.tsx                 # Client providers (CMSProvider, ThemeProvider)
│   └── layout.tsx                    # Root layout (Inter font, ThemeProvider, Toaster)
│
├── supabase/                         # Site-level database
│   ├── config.toml                   # Supabase project config
│   ├── migrations/                   # SQL migrations
│   ├── functions/                    # Edge Functions
│   └── types.ts                      # Auto-generated TypeScript types
│
├── packages/simplycms/               # Core CMS (Git Subtree from simplyCMS-core)
│   ├── core/src/       @simplycms/core
│   ├── admin/src/      @simplycms/admin
│   ├── ui/src/         @simplycms/ui
│   ├── plugin-system/  @simplycms/plugins
│   ├── theme-system/   @simplycms/themes
│   └── schema/                       # Seed migrations
│
├── themes/default/                   # Default storefront theme
├── themes/solarstore/                # SolarStore theme (blue palette)
├── plugins/                          # Local plugins directory
├── temp/                             # Reference React SPA (read-only)
│
├── simplycms.config.ts               # CMS config
├── proxy.ts                          # Auth proxy
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind v4 config
└── pnpm-workspace.yaml               # Workspace config
```

## Package Aliases (tsconfig paths)

| Import | Path |
|--------|------|
| `@simplycms/db-types` | `supabase/types.ts` |
| `@simplycms/core` | `packages/simplycms/core/src` |
| `@simplycms/admin` | `packages/simplycms/admin/src` |
| `@simplycms/ui` | `packages/simplycms/ui/src` |
| `@simplycms/plugins` | `packages/simplycms/plugin-system/src` |
| `@simplycms/themes` | `packages/simplycms/theme-system/src` |
| `@/*` | `app/*` |
| `@themes/*` | `themes/*` |
| `@plugins/*` | `plugins/*` |

## Theme System (SSR)

Themes use build-time registration + runtime DB activation:

1. **Registration:** `app/theme-registry.server.ts` and `app/providers.tsx` register themes via `ThemeRegistry.register()`
2. **SSR Resolution:** `getActiveThemeSSR()` reads active theme from DB (cached via `unstable_cache`), resolves `ThemeModule` via `ThemeRegistry`
3. **Storefront pages:** Call `getActiveThemeSSR()` → get `theme.pages.XxxPage` dynamically
4. **Admin activation:** `themes` table `is_active` flag → `revalidatePath('/', 'layout')` on switch
5. **ThemeContext (client):** Accepts `initialThemeName` from SSR, avoids redundant client fetch

## Environment Variables

Required (copy `.env.example` to `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_PROJECT_ID` — Supabase project ref
- `SUPABASE_ACCESS_TOKEN` — Personal access token for Management API
- `NEXT_PUBLIC_SITE_URL` — Public site URL (production)
- `REVALIDATION_SECRET` — ISR revalidation token (optional)

## Git Subtree Workflow

```bash
pnpm cms:pull                  # Pull core updates from simplyCMS-core main
pnpm cms:push                  # Push core changes to simplyCMS-core main
pnpm cms:push:branch <branch>  # Push to a specific branch
pnpm cms:diff                  # View local core changes
```

## Database Commands

```bash
pnpm db:migrate                # Apply Supabase migrations
pnpm db:generate-types         # Regenerate TypeScript types to supabase/types.ts
```

After schema changes, always run `pnpm db:generate-types` to keep types in sync.

## CI/CD

GitHub Actions (`.github/workflows/workflow.yml`) on push/PR to `main`:
- **TypeScript job:** `pnpm install` → `pnpm build` → `pnpm typecheck` → `pnpm lint`
- **Test job:** `pnpm install` → `pnpm test`
