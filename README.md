# SimplyCMS

Open-source e-commerce CMS built with Next.js, Supabase, and shadcn/ui.

## Tech Stack

- **Next.js 15** (App Router, Turbopack)
- **TypeScript**
- **React 19**
- **Supabase** (Auth, Database, Storage, Edge Functions)
- **shadcn/ui** + Radix UI
- **Tailwind CSS**
- **TanStack React Query**

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Project Structure

```
app/                    # Next.js App Router pages
packages/simplycms/     # Core CMS packages (Git Subtree)
  ├── core/             # Supabase clients, hooks, business logic
  ├── admin/            # Admin panel components
  ├── ui/               # shadcn/ui component library
  ├── plugin-system/    # Plugin architecture
  ├── theme-system/     # Theme engine
  └── supabase/         # DB migrations & edge functions
themes/                 # Project themes
plugins/                # Project plugins
```

## License

MIT
