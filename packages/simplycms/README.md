# SimplyCMS Core

Open-source e-commerce CMS core packages for Next.js.

## Packages

| Package | Description |
|---------|-------------|
| `@simplycms/core` | Supabase clients, hooks, business logic, types |
| `@simplycms/admin` | Admin panel layouts, pages, components |
| `@simplycms/ui` | shadcn/ui component library |
| `@simplycms/plugins` | Plugin system (HookRegistry, PluginLoader, PluginSlot) |
| `@simplycms/themes` | Theme system (ThemeRegistry, ThemeContext, ThemeResolver) |
| `@simplycms/db` | Database migrations and edge functions |

## Usage

SimplyCMS core is distributed via Git Subtree. To use it in your project:

```bash
# Add remote
git remote add simplycms-core https://github.com/VSydorenko/simplyCMS-core.git

# Add as subtree
git subtree add --prefix=packages/simplycms simplycms-core main --squash

# Pull updates later
git subtree pull --prefix=packages/simplycms simplycms-core main --squash
```

## Development

When developing within the main SimplyCMS project, changes to `packages/simplycms/` are automatically part of the subtree. To push changes back to the core repo:

```bash
npm run cms:push
```

## License

MIT
