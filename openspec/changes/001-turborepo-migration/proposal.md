# Change Proposal: Turborepo Monorepo Migration

## Intent
Migrate the current monolith Next.js + Mastra project into a Turborepo monorepo with:
- `apps/api` - Mastra backend server (agents, tools, workflows)
- `apps/web` - Next.js frontend (UI, chat pages)
- `packages/mastra-client` - Shared HTTP SDK client

## Scope
- All source files under src/
- All config files (tsconfig, next.config, postcss, eslint, etc.)
- Package dependencies split between api and web
- Root workspace configuration (turbo.json, pnpm-workspace.yaml)

## Approach
1. Create directory structure (apps/api, apps/web, packages/mastra-client)
2. Move Mastra code to apps/api/src/mastra/
3. Move Next.js frontend to apps/web/src/
4. Create package.json for each package with correct dependencies
5. Create turbo.json (root + local overrides)
6. Update pnpm-workspace.yaml
7. Create shared mastra-client package
8. Update root package.json with turbo scripts
9. Create tsconfig.json for each package

## Rollback
- Git revert to pre-migration commit
- All original files preserved in git history

## Critical Change
- `apps/web/src/app/api/chat/route.ts` MUST be updated to use mastraClient HTTP SDK
  instead of direct `import { mastra } from '@/mastra'`
