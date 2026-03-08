# Project Guidelines (extracted from CLAUDE.md + AGENTS.md)

## Critical Paths
- `src/mastra/` - Mastra agents, tools, workflows (moves to apps/api/)
- `src/app/` - Next.js app router (moves to apps/web/)
- `src/components/` - UI components (moves to apps/web/)
- `src/lib/` - Utilities (moves to apps/web/)
- `src/types/` - Type definitions (moves to apps/web/)

## Tech Stack
- Next.js 16.1.6 with React 19.2.3
- Mastra AI Framework (core, memory, libsql, loggers, observability)
- TypeScript 5 with path aliases (@/* -> ./src/*)
- Tailwind CSS 4 with PostCSS
- shadcn/ui components + custom AI elements
- pnpm workspace

## Database
- LibSQL via @mastra/libsql (file:./mastra.db)
- Used for Mastra storage (observability, scores)

## Code Practices
- Load Mastra skill FIRST before any Mastra work
- Never rely on cached Mastra knowledge - APIs change frequently
- Follow Mastra conventions for project structure

## Build Rules
- Use pnpm as package manager
- Turborepo for monorepo task orchestration
- React Compiler enabled (babel-plugin-react-compiler)

## Key Dependencies Split
### API (Mastra backend):
- @mastra/core, @mastra/libsql, @mastra/loggers, @mastra/memory, @mastra/observability, mastra, zod

### Web (Next.js frontend):
- next, react, react-dom, @ai-sdk/react, @mastra/ai-sdk, ai, shadcn components, tailwind, all UI deps

### Shared (mastra-client package):
- @mastra/client-js (HTTP SDK for frontend -> backend communication)
