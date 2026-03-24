# Factory Agents -- Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Notion Multi-Agent System](#notion-multi-agent-system)
4. [Japanese Sensei Agent](#japanese-sensei-agent)
5. [Composio Integration](#composio-integration)
6. [Workspace and Skills](#workspace-and-skills)
7. [API Routes](#api-routes)
8. [Configuration](#configuration)

---

## Overview

Factory Agents is an AI agent factory built with [Mastra](https://mastra.ai), a TypeScript framework for building agents, workflows, and tools. The project demonstrates how to compose multiple specialized AI agents into cohesive multi-agent systems, each with clearly defined responsibilities, tools, and delegation patterns.

The codebase ships two primary agent systems:

- **Notion Multi-Agent System** -- A multi-agent architecture where an orchestrator delegates to specialized sub-agents for reading, writing, and querying a Notion workspace.
- **Japanese Sensei** -- A Japanese language teaching agent for Spanish-speaking beginners that delegates to web search (via Composio) and the Notion system for progress tracking.

Additional standalone agents (weather, search) are included as reference implementations.

---

## Architecture

```
                        Mastra Instance
                             |
        +--------------------+--------------------+
        |                    |                    |
   API Routes           Workspace             Storage
   (chat/*)        (skills loader)         (PostgreSQL)
        |
        +----------+-----------+-----------+
        |          |           |           |
   weather    search     notion        japanese
   agent      agent    orchestrator     sensei
                           |               |
              +------------+-------+       +--------+-----------+
              |            |       |       |                    |
          search-       write-  database-  search-agent       notion-
          agent         agent   agent     (Composio)        orchestrator
                                                              (reused)
```

### Agent Hierarchy (detailed)

```
mastra
 |
 +-- weatherAgent                    (standalone, claude-haiku-4-5)
 +-- searchAgent                     (standalone)
 |
 +-- notionOrchestrator              (claude-haiku-4-5, has memory)
 |    +-- notionSearchAgent          (claude-haiku-4-5)
 |    +-- notionWriteAgent           (claude-haiku-4-5)
 |    +-- notionDatabaseAgent        (claude-haiku-4-5)
 |
 +-- japaneseSenseiOrchestrator      (claude-sonnet-4-5, has memory)
      +-- japaneseSenseiSearchAgent  (claude-haiku-4-5, Composio tools)
      +-- notionOrchestrator         (reused -- same instance as above)
```

---

## Notion Multi-Agent System

The Notion system follows a strict orchestrator/specialist pattern. The orchestrator never calls the Notion API directly; it delegates every operation to one of three sub-agents.

### Orchestrator

| Property | Value |
|----------|-------|
| ID | `notion-orchestrator` |
| Model | `anthropic/claude-haiku-4-5-20251001` |
| Memory | Yes (`@mastra/memory`) |
| Tools | None (delegates only) |

**Delegation strategy:**

1. Reading and searching --> `notion-search-agent`
2. Creating, updating, or deleting content --> `notion-write-agent`
3. Querying databases or managing schemas --> `notion-database-agent`
4. Complex tasks --> chains multiple delegations (e.g., search first, then write)

The orchestrator can load the `notion-api` skill via the workspace for Notion API reference details (rate limits, pagination rules, block types, filter syntax, etc.).

### Search Agent (read-only)

| Property | Value |
|----------|-------|
| ID | `notion-search-agent` |
| Model | `anthropic/claude-haiku-4-5-20251001` |
| Memory | No |

**Tools:**

| Tool | Description |
|------|-------------|
| `searchPages` | Search across all accessible pages and databases |
| `getPage` | Retrieve a single page and its properties |
| `getBlockChildren` | Get all child blocks of a page or block |
| `getBlock` | Retrieve a single block by ID |
| `getDatabase` | Fetch a database schema (properties, title, description) |
| `getComments` | Get comments on a page or block |

Key behavior: handles pagination automatically by checking `has_more` and using `next_cursor`.

### Write Agent (mutations)

| Property | Value |
|----------|-------|
| ID | `notion-write-agent` |
| Model | `anthropic/claude-haiku-4-5-20251001` |
| Memory | No |

**Tools:**

| Tool | Description |
|------|-------------|
| `createPage` | Create a new page under a parent page or database |
| `updatePage` | Update page properties |
| `appendBlocks` | Append child blocks to a page or block |
| `updateBlock` | Update an existing block's content |
| `deleteBlock` | Delete a block |
| `archivePage` | Archive (soft-delete) a page |
| `createComment` | Add a comment to a page or block |

**Critical limits enforced by this agent:**

- Maximum 100 blocks per append request
- Rich text content: max 2000 characters per text object
- URLs: max 2000 characters
- Block arrays support up to 2 levels of nesting
- Use `null` instead of empty strings for empty values

### Database Agent (structured data)

| Property | Value |
|----------|-------|
| ID | `notion-database-agent` |
| Model | `anthropic/claude-haiku-4-5-20251001` |
| Memory | No |

**Tools:**

| Tool | Description |
|------|-------------|
| `queryDatabase` | Query a database with filters and sorts |
| `createDatabase` | Create a new database with a property schema |
| `updateDatabase` | Update a database's configuration and properties |

**Filter rules enforced by this agent:**

- Filter types must match property types (`rich_text` for text, `number` for numbers, etc.)
- Compound filters use `and`/`or` arrays
- Every database must have exactly one title property
- Handles pagination via `has_more` / `start_cursor`

### Notion Client

All Notion tools share a single client instantiated in `apps/api/src/mastra/tools/notion/shared/client/`. The client wraps the official `@notionhq/client` and reads `NOTION_API_KEY` from the environment.

---

## Japanese Sensei Agent

A language teaching agent designed for Spanish-speaking beginners learning Japanese.

| Property | Value |
|----------|-------|
| ID | `japanese-sensei` |
| Model | `anthropic/claude-sonnet-4-5` |
| Memory | Yes (`@mastra/memory`) |

### Teaching Philosophy

- Learning should be enjoyable, never intimidating.
- Mistakes are corrected kindly with explanations of WHY something is wrong.
- Small victories are celebrated.
- Spanish-language analogies are used when helpful (e.g., Japanese vowels sound like Spanish vowels).
- Romaji is always provided alongside Japanese characters until the student is comfortable.

### Progression System (strict order)

The agent enforces a strict teaching progression and will NOT skip ahead unless the student demonstrates mastery.

| Stage | Content |
|-------|---------|
| **Stage 1: Hiragana** | Vowels (a, i, u, e, o) --> K-row --> S-row --> T-row --> N-row --> H, M, Y, R, W rows --> Dakuten/Handakuten --> Combinations |
| **Stage 2: Katakana** | Same row-by-row progression. Taught only after hiragana basics (vowels + K through N) are solid. Focus on foreign loanwords. |
| **Stage 3: Vocabulary and Phrases** | Greetings, self-introduction, numbers, days/months, time expressions. |

### Lesson Structure

Each lesson follows a four-part structure:

1. **Review** -- Quick check of previously learned material (2-3 questions)
2. **New content** -- Introduce 3-5 new characters or one new concept
3. **Practice** -- Exercises for the student (write romaji, identify characters, etc.)
4. **Fun fact** -- Cultural tidbit related to the lesson

### Delegation Strategy

The Japanese Sensei orchestrator delegates to two sub-agents:

| Sub-Agent | When Used |
|-----------|-----------|
| `japanese-sensei-search-agent` | Finding external resources: character charts, stroke order, mnemonics, example sentences, cultural context from Jisho.org, Tae Kim, NHK World |
| `notion-orchestrator` | Saving progress, creating vocabulary lists, storing lesson summaries, tracking covered characters and concepts |

Most teaching interactions (explaining characters, correcting mistakes, pronunciation rules) are handled by the orchestrator's own knowledge without delegation.

### Lazy Agent Loading

The search agent is loaded lazily via an async `agents` factory function. If the Composio client is unavailable (missing API key), the orchestrator logs a warning and continues without search capability. This prevents the entire system from failing due to an optional dependency.

```typescript
agents: async () => {
  const agents: Record<string, Agent> = { notionOrchestrator };
  try {
    const searchAgent = await getJapaneseSenseiSearchAgent();
    agents.japaneseSenseiSearchAgent = searchAgent;
  } catch (error) {
    console.warn('[japanese-sensei] Composio search agent unavailable:', (error as Error).message);
  }
  return agents;
},
```

---

## Composio Integration

[Composio](https://composio.dev) provides third-party tool integrations for AI agents. In this project it powers the Japanese Sensei's web search capability.

### Client (`apps/api/src/mastra/composio/client.ts`)

The Composio client uses a **lazy singleton** pattern:

- Nothing executes at import time.
- The client is created on first call to `getComposioClient()`.
- Caches on success; failed attempts retry on the next call.
- Requires `COMPOSIO_API_KEY` in the environment.
- Uses `MastraProvider` from `@composio/mastra` for framework integration.

### Search Tools

The search agent creates a Composio session with three tools from the `composio_search` toolkit:

| Tool | Purpose |
|------|---------|
| `COMPOSIO_SEARCH_WEB` | Web search for grammar explanations, vocabulary, cultural context |
| `COMPOSIO_SEARCH_IMAGE` | Image search for character charts, stroke order diagrams, mnemonics |
| `COMPOSIO_SEARCH_FETCH_URL_CONTENT` | Extracts full content from URLs (Jisho.org, Tae Kim, Imabi, NHK World) |

### The `outputSchema` Workaround

There is a known issue in `@composio/mastra@0.6.6` where `wrapTool()` generates an `outputSchema` that does not match the actual shape of data returned by the Composio API. Since Mastra validates tool output against this schema, the mismatch causes runtime failures.

The workaround is a `stripOutputSchemas()` function that **mutates** each Tool instance's `outputSchema` to `undefined` in place. This disables Mastra's output validation entirely.

Why mutation instead of object spread? Using `{ ...tool, outputSchema: undefined }` creates a new plain object, but the original Tool instance's `execute()` closure still references `this.outputSchema` on the original instance -- the spread has zero effect. Direct mutation on the instance is required.

This workaround is safe to remove once the upstream schema mismatch is fixed in `@composio/mastra`.

---

## Workspace and Skills

### Workspace Configuration (`apps/api/src/mastra/workspace.ts`)

```typescript
export const workspace = new Workspace({
  name: 'factory-agents',
  filesystem: new LocalFilesystem({ basePath: resolve(import.meta.dirname, '../../skills') }),
  skills: ['notion-api', 'composio-search'],
});
```

The workspace configures a local filesystem rooted at `apps/api/skills/` and registers two skills:

| Skill | Purpose |
|-------|---------|
| `notion-api` | Notion API reference material -- rate limits, pagination, block types, rich text format, filter/sort syntax, property types |
| `composio-search` | Composio search integration reference |

Agents can load these skills at runtime using the `skill` tool with a skill name. The workspace resolves the skill from the local filesystem and makes its contents (markdown files, reference docs) available to the agent.

---

## API Routes

The Mastra instance exposes chat endpoints via `chatRoute()` from `@mastra/ai-sdk`. Each route maps a URL path to a registered agent.

| Endpoint | Agent | Description |
|----------|-------|-------------|
| `POST /chat/weather` | `weather-agent` | Weather information queries |
| `POST /chat/search` | `search-agent` | General search queries |
| `POST /chat/notion` | `notion-orchestrator` | Notion workspace operations (delegates to sub-agents) |
| `POST /chat/japanese` | `japanese-sensei` | Japanese language lessons |

All chat routes accept the standard Mastra chat request format and return streaming responses.

---

## Configuration

### Required Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `NOTION_API_KEY` | Notion tools | Notion integration token. Create one at https://www.notion.so/my-integrations |
| `COMPOSIO_API_KEY` | Composio client | Composio API key. Run `composio init` or set manually in `.env` |
| `PG_HOST` | PostgreSQL storage | Database host |
| `PG_PORT` | PostgreSQL storage | Database port |
| `PG_DATABASE` | PostgreSQL storage | Database name |
| `PG_USER` | PostgreSQL storage | Database user |
| `PG_PASSWORD` | PostgreSQL storage | Database password |

### Optional Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `MASTRA_CLOUD_ACCESS_TOKEN` | Observability | Enables trace export to Mastra Cloud |

### Storage

The project uses two storage backends:

- **PostgreSQL** (`@mastra/pg`) -- Primary storage for Mastra state, configured via `PG_*` environment variables.
- **LibSQL** (`@mastra/libsql`) -- Imported but usage depends on configuration (referenced in the Mastra instance setup).

### Observability

Traces are exported via two channels:

- `DefaultExporter` -- Persists traces to storage for viewing in Mastra Studio.
- `CloudExporter` -- Sends traces to Mastra Cloud (only active when `MASTRA_CLOUD_ACCESS_TOKEN` is set).
- `SensitiveDataFilter` -- Redacts passwords, tokens, and keys from span output.

### Logging

PinoLogger is configured at `info` level with the service name `Mastra`.
