# Golden Image — Implementación detallada

> **Branch:** `feat/golden-image`
> **Estado:** funcional end-to-end (verificado con test real: search Composio + envío email Resend + memoria PG)
> **Fecha de cierre de implementación:** 2026-05-17

Este documento explica TODOS los cambios introducidos en el branch `feat/golden-image`, en orden lógico, con el porqué de cada decisión. Está pensado para que alguien que llega nuevo al repo entienda qué se construyó y por qué.

---

## 1. Objetivo del branch

Convertir el monorepo (que tenía Mastra corriendo en modo `mastra dev` con agentes hardcoded) en una **Golden Image Docker** capaz de:

1. Recibir un **swarm config en JSON via HTTP** y crear el agente dinámicamente
2. Persistir conversaciones en **Postgres** entre llamadas
3. Llamar a **herramientas externas reales** (búsqueda web vía Composio, envío de email vía Resend)
4. Escalar a 0 cuando no hay tráfico (autoscale en Fly.io)
5. Servir como base para crear VMs por tenant/usuario

---

## 2. Seguridad del Dockerfile

El Dockerfile **NO contiene secrets**. Verificación realizada:
- No hay `API_KEY=` hardcoded
- No hay passwords ni tokens literales
- No hay URLs de DB con credenciales
- Las env vars se inyectan en runtime via `--env-file` o `-e`

Las API keys viven en `apps/api/.env` (gitignoreado). El template público es `apps/api/.env.example.docker` (solo nombres de variables, sin valores reales).

**Es seguro publicar este Dockerfile en un repo público.**

---

## 3. Arquitectura — capas de la implementación

```
┌─────────────────────────────────────────────────────────────┐
│  Cliente (Frontend, CLI, otro servicio)                     │
│  └─► POST /agent/create  { userId, swarm_config }           │
│  └─► POST /chat/:agentId { prompt, threadId? }              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────────────┐
│  Express VM Server (vm-server.ts)                           │
│  └─► router.ts → agent.controller.ts                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  SwarmLoader                                                │
│  └─► splits workers en: builtins vs regulares               │
│      ├─► builtins: composio-search, resend-email            │
│      └─► regulares: AgentFactory (tool registry interno)    │
│  └─► Orquestador (con Memory + Postgres)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Postgres (storage de threads y mensajes)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Cambios archivo por archivo

### 4.1 `apps/api/Dockerfile`

**Antes:** corría directamente `mastra/output/index.mjs` (Mastra dev wrapper).

**Después:** multi-stage build optimizado para la Golden Image VM:
- Stage 1 (builder): instala deps, compila Mastra, **bundlea `vm-server.ts` con esbuild**
- Stage 2 (runtime): solo deps de producción, user `nodejs` sin privilegios

**Decisiones clave:**
- `node:22-alpine` para minimizar tamaño
- `--packages=external` en esbuild (en lugar de `--external:express`) — bundlea solo el código del swarm; todo `node_modules` se resuelve en runtime. **Esto evita conflictos de bundling con `@mastra/core`, `@mastra/pg`, `@composio/mastra`** que tienen side effects al cargar.
- `BUILD_START` / `BUILD_END` echo timestamps para medir tiempo de build
- `WORKDIR /app/mastra/output` + `pnpm install --prod` aislado (no instala devDeps en runtime)

### 4.2 `apps/api/.dockerignore`

Excluye `node_modules`, `.git`, `.env*`, `dist`, `.mastra/output` previos, `test-results`, etc. Evita meter archivos sensibles o pesados al contexto del build.

### 4.3 `apps/api/.env.example.docker`

Template público con TODOS los nombres de variables que el container espera. **Sin valores reales.** Se commitea para que cualquiera que clone el repo sepa qué hay que setear. Incluye:
- `PG_HOST`, `PG_PORT`, `PG_DATABASE`, `PG_USER`, `PG_PASSWORD` (storage)
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` (modelos)
- `RESEND_API_KEY` (email)
- `TAVILY_API_KEY` (search fallback)
- `COMPOSIO_API_KEY` (search via Composio)

### 4.4 `apps/api/fly.toml`

Configuración de Fly.io para deploy: autoscale `min_machines = 0` (paga solo cuando hay tráfico), `max_machines = 3`, 1GB RAM.

### 4.5 `packages/contracts/`

Package nuevo que centraliza schemas Zod compartidos entre VM y frontend. **NO se llegó a usar en runtime** porque hubo problemas de bundling con package privado de GitHub Packages. Los schemas terminaron inlineados localmente en `apps/api/src/mastra/swarm/schema/index.ts` (ver 4.10). El package queda para futuro uso compartido.

### 4.6 `apps/api/src/mastra/swarm/vm-server.ts` (NUEVO)

Entry point del Golden Image. Express puro, sin Mastra wrapper:

```typescript
const app = express();
app.use(express.json());
app.use('/', router);
app.listen(PORT);
```

Mastra internamente usa Hono, pero el VM expone Express para tener control total de los endpoints y headers (como `X-Thread-Id`).

### 4.7 `apps/api/src/mastra/swarm/router.ts` (NUEVO)

Define las rutas Express:
- `GET /health` → liveness probe
- `GET /status` → uptime + memoria + estado del agente
- `POST /agent/create` → carga un swarm config
- `POST /agent/update` → reemplaza el swarm config existente
- `POST /chat/:agentId` → conversación con streaming

### 4.8 `apps/api/src/mastra/swarm/controllers/agent.controller.ts`

Maneja los endpoints. Cambios clave durante el branch:

1. **Captura `userId`** del `CreateAgentRequest` (antes se descartaba)
2. **Auto-genera `threadId`** con `randomUUID()` cuando el cliente no manda uno
3. **Devuelve `X-Thread-Id` header** para que el cliente pueda continuar la conversación
4. **Pasa `{ memory: { thread, resource } }`** al `agent.stream()` para que Mastra busque/guarde mensajes en Postgres
5. **Pasa `userId` al `loadSwarm`** para que los builtins como `composio-search` puedan crear sus sesiones
6. **Refleja `userId` real en `handleStatus`** (antes hardcoded a `null`)

Cache en memoria singleton por VM:
```typescript
let currentAgent: Agent | null = null;
let currentSwarmConfig: SwarmConfig | null = null;
let currentUserId: string | null = null;
let toolRegistry: Map<string, Tool> | null = null;
```

### 4.9 `apps/api/src/mastra/swarm/SwarmLoader.ts`

**Cambios críticos:**

1. **`import type { Agent }` → `import { Agent }`** — esto fixea el `Agent is not defined` runtime error. TypeScript permite usar `import type` y compila, pero esbuild borra el import en el bundle final, y `new Agent(...)` revienta porque el identificador no existe.

2. **Wiring de `Memory` con Postgres**:
```typescript
import { Memory } from '@mastra/memory';
import pgStore from '../storage/pgsql';

const memory = new Memory({ storage: pgStore });
new Agent({ ..., memory });
```
Solo el orchestrator tiene memory. Los workers son stateless (sub-agents que se invocan como tools).

3. **Separación de builtins vs workers regulares** (ver `BUILTIN_WORKERS` más abajo):
```typescript
const allWorkers = config.orchestrator.workers ?? [];
const builtinConfigs = allWorkers.filter(w => isBuiltinWorker(w.id));
const regularConfigs = allWorkers.filter(w => !isBuiltinWorker(w.id));

// regulares pasan por AgentFactory normal
const workersResult = factory.createWorkers(regularConfigs);

// builtins se crean directo, attached como Promise<Agent>
for (const cfg of builtinConfigs) {
  const factoryFn = BUILTIN_WORKERS[cfg.id];
  workersResult.successful.set(cfg.id, factoryFn(cfg, { userId }));
}
```

4. **Nuevo campo `userId?: string`** en `SwarmLoaderConfig` — requerido cuando hay builtins que lo necesitan (ej. Composio sessions).

### 4.10 `apps/api/src/mastra/swarm/schema/index.ts` (NUEVO)

Schemas Zod v4 inlineados localmente. Definen:
- `WorkerSchema` — `id`, `name`, opcional: `instructions`, `model`, `role`, `tools` (default `[]`), `optional`
- `OrchestratorSchema` — extends de Worker + `workers: WorkerSchema[]`
- `SwarmConfigSchema` — `id`, `name`, `orchestrator`
- `CreateAgentRequestSchema` — `swarm_config` + `userId`
- `ChatRequestSchema` — `prompt` + `threadId?`
- `AgentResponseSchema` — status/agentId/machineId/error

**Por qué `instructions` es opcional:** los builtin workers (composio-search, resend-email) traen instructions por default. Si el cliente no manda nada, el builtin usa las suyas.

### 4.11 `apps/api/src/mastra/swarm/validators.ts`

Funciones helper que validan los requests usando los schemas y retornan el dato tipado, lanzando errors descriptivos si fallan. Usan `z.input<typeof Schema>` para tipar el body antes de parsearlo.

### 4.12 `apps/api/src/mastra/swarm/types.ts`

Type aliases compartidos: re-exporta `LoadedSwarm` desde `swarm-config.schema.ts` + define `VmStatus` para la respuesta de `/status`.

### 4.13 `apps/api/src/mastra/swarm/tools/simple-registry.mjs` (NUEVO)

Tool registry mínimo (array vacío `[]`) sin React deps. Se copia al output del build como `tools.mjs` para reemplazar el que genera Mastra (que incluye `send-email.tsx` con React, que rompe en runtime).

**Nota:** después del Fix #2 esto dejó de ser crítico porque el `buildToolRegistryFromOutput` fallback usa un Map vacío y los builtins no dependen de este archivo. Se mantiene por compatibilidad.

### 4.14 `apps/api/src/mastra/swarm/builtins/index.ts` (NUEVO — corazón del sistema)

Registry interno de workers built-in que viven dentro del bundle. Reemplaza el patrón `factory: '/path/to/file.mjs'` (que no sirve en una imagen bundleada) por un map de factories en memoria.

**Estructura:**
```typescript
export type BuiltinFactory = (
  workerConfig: WorkerConfig,
  context: { userId: string }
) => Promise<Agent>;

export const BUILTIN_WORKERS: Record<string, BuiltinFactory> = {
  'composio-search': composioSearch,
  'resend-email': resendEmail,
};

export function isBuiltinWorker(id: string): boolean {
  return id in BUILTIN_WORKERS;
}
```

**Builtin `composio-search`:**
- Crea cliente Composio con `MastraProvider`
- Llama `client.create(userId, { toolkits: ['composio_search'] })` para abrir sesión
- Lista tools (`COMPOSIO_SEARCH_WEB`, `COMPOSIO_SEARCH_FETCH_URL_CONTENT`)
- **Workaround**: `outputSchema = undefined` para evitar el bug conocido de `@composio/mastra@0.6.6` donde el schema generado no matchea la respuesta real
- Retorna `Agent` con esas tools

**Builtin `resend-email`:**
- Crea un único `createTool` `send-email` con schema: `to`, `subject`, `html`
- **NO usa el SDK de Resend** — usa `fetch` directo a `https://api.resend.com/emails` con `Authorization: Bearer ${apiKey}`
- Razón: el SDK `resend@4.0` carga `@react-email/render` que tira de `react-dom@18`, mismatch con `react@19` instalado, crash al import time. Con `fetch` no necesitamos el SDK ni React.
- Retorna `Agent` con esa única tool

### 4.15 `apps/api/src/mastra/swarm/AgentFactory.ts`

(Ya existía antes del branch) Crea agents sync o async desde `WorkerConfig`. Sin cambios funcionales en esta sesión.

### 4.16 `apps/api/src/mastra/swarm/swarm-config.schema.ts`

(Ya existía antes del branch) Define interfaces TypeScript de `SwarmConfig`, `WorkerConfig`, `OrchestratorConfig`, `ToolRegistry`. Sin cambios estructurales.

### 4.17 `apps/api/package.json`

Agregados:
- `"@mastra/memory": "1.9.0"` (memoria per-agent con PG)
- `"express": "4.21.0"` (server de la VM)
- `"@types/express": "4.17.21"` (devDep)

Sin caret (`^`) en versiones — convención del proyecto, lockfile reproducible.

---

## 5. Bugs encontrados y resueltos durante la sesión

### Bug 1 — `Agent is not defined` en runtime
**Causa:** `SwarmLoader.ts` tenía `import type { Agent }` pero usaba `new Agent(...)` como constructor. TypeScript no chequea esto sin `verbatimModuleSyntax: true`. esbuild borra el import. Runtime explota.

**Fix:** `import type` → `import` en esa línea. Los otros archivos siguen con `import type` porque solo usan Agent como anotación.

### Bug 2 — Agentes sin memoria (stateless)
**Causa:** los `new Agent({...})` no recibían `memory`. Cada `/chat` arrancaba sin historial.

**Fix:** instanciar `Memory({ storage: pgStore })` y pasarlo al constructor del orchestrator. Pasar `{ memory: { thread, resource } }` al `agent.stream()`. Auto-generar `threadId` con `randomUUID()` y exponerlo en `X-Thread-Id`.

### Bug 3 — esbuild bundleaba `@mastra/*`
**Causa:** `--external:express` solo dejaba express afuera. esbuild intentaba bundlear `@mastra/core`, `@mastra/pg`, etc. Eso rompía side effects de carga.

**Fix:** `--external:express` → `--packages=external`. Todo `node_modules` se resuelve en runtime desde el stage 2.

### Bug 4 — `PostgresStore.init` fallaba con error vacío
**Causa:** `PG_HOST=localhost` en `.env` apuntaba al container mismo (no a la Mac donde corre el Postgres). El error real (`ECONNREFUSED`) quedaba envuelto en un `Error: ''` de Mastra.

**Fix de runtime:** override con `-e PG_HOST=host.docker.internal` al `docker run`. **No requiere cambio de código** — el `.env` queda válido para `mastra dev` nativo.

### Bug 5 — `require('resend')` crasheaba al import
**Causa:** Resend SDK 4.0 importa `@react-email/render` internamente. Ese paquete necesita `react-dom@18`. El proyecto tiene `react@19`. Mismatch fatal en `ReactCurrentDispatcher`.

**Fix:** no usar el SDK. Llamar la REST API de Resend con `fetch`. Sin React, sin SDK, sin mismatch.

### Bug 6 — `createTool.execute` signature incorrecta
**Causa:** Implementé `execute: async ({ context }) => ...`. La signature real de Mastra 1.x es `execute: async (inputData, context) => ...`. Mi destructuring hacía `inputData` undefined y cualquier acceso explotaba.

**Fix:** cambiar a `execute: async (input) => { const { to, ... } = input; }`. El tool `tools/email/send-email.tsx` original ya usaba esta forma — lo verifiqué post-bug.

### Bug 7 — `WorkerSchema` demasiado estricto
**Causa:** `instructions` era required. Los builtins (composio-search, resend-email) traen instructions por default — no tiene sentido obligar al cliente a re-escribirlas.

**Fix:** hacer `instructions` opcional. Agregar `role`, `model`, `optional` como opcionales. Default `tools: []`.

### Bug 8 — Resend free tier solo permite enviar al owner
**Causa:** no es un bug de código, es límite del plan free de Resend. Solo deja enviar a `contacto.eleanquintero@gmail.com` (la cuenta del dueño).

**Solución (no aplicada):** verificar un dominio en `resend.com/domains` y cambiar el `from` en el builtin de `'onboarding@resend.dev'` al dominio verificado.

---

## 6. Flujo end-to-end verificado

```
1. docker build -f apps/api/Dockerfile -t factory-vm:latest .
2. docker run --rm -p 3000:3000 \
     --env-file apps/api/.env \
     -e PG_HOST=host.docker.internal \
     factory-vm:latest

3. POST /agent/create
   { userId: "elean-test-001",
     swarm_config: {
       orchestrator: {
         model: "anthropic/claude-sonnet-4-5",
         workers: [
           { id: "composio-search", name: "Web Search" },
           { id: "resend-email",    name: "Email Sender" }
         ]
       }
     }
   }
   → 201 { agentId, machineId }

4. POST /chat/swarm-forza
   { prompt: "Investigá Forza Horizon 6 y enviá a contacto.eleanquintero@gmail.com" }
   → 200 streaming response
   → Headers: X-Thread-Id: <uuid>
   → Composio busca info real
   → Resend envía email (emailId confirmado)
   → Postgres guarda thread + mensajes

5. POST /chat/swarm-forza
   { prompt: "Qué te pedí antes?", threadId: "<uuid del paso 4>" }
   → 200 con contexto previo recuperado de PG
```

**Verificado en sesión real:**
- emailId recibido: `2ed89d76-aa9d-4d99-b4c2-2a081d2e4955`
- Memoria persistente: confirmada con prueba de color favorito
- Control negativo: agente no inventa info que no se le dijo

---

## 7. Cómo correr localmente

### Requisitos previos
- Docker
- Postgres corriendo en la Mac (puerto 5432 por default)
- `apps/api/.env` con todas las vars de `apps/api/.env.example.docker` rellenas

### Build
```bash
docker build -f apps/api/Dockerfile -t factory-vm:latest .
```

### Run
```bash
docker run --rm -p 3000:3000 \
  --env-file apps/api/.env \
  -e PG_HOST=host.docker.internal \
  factory-vm:latest
```

**Nota sobre `PG_HOST=host.docker.internal`:** tu `.env` tiene `PG_HOST=localhost` (correcto para `mastra dev` nativo). Cuando corrés en Docker, `localhost` apunta al container mismo, no al host. El override con `-e PG_HOST=...` lo arregla en runtime sin tocar el `.env`.

### Tests rápidos
```bash
# Health
curl http://localhost:3000/health

# Status
curl http://localhost:3000/status

# Create agent (ver sección 6 para body completo)
curl -X POST http://localhost:3000/agent/create -H "Content-Type: application/json" -d '...'

# Chat (capturá X-Thread-Id del header)
curl -i -X POST http://localhost:3000/chat/<agentId> -H "Content-Type: application/json" -d '{"prompt":"..."}'
```

---

## 8. Estado del branch para PR

### Listo para mergear
- ✅ Builds limpio
- ✅ Tests E2E manuales pasando
- ✅ Sin secrets en código
- ✅ Sin breaking changes en otros agentes existentes (notion, japanese-sensei, etc.)

### Pendiente (no bloqueante)
- Sumar nota al `.env.example.docker` indicando `PG_HOST=host.docker.internal` cuando se corre en Docker (vs `localhost` en dev)
- Verificar dominio en Resend si se quiere enviar a destinatarios arbitrarios
- Migrar a una nueva versión de `@composio/mastra` cuando salga (parchar el workaround de `outputSchema`)
- Refactor potencial: `factory: 'builtin:nombre'` en lugar del map hardcoded (cuando crezcan los builtins)

---

## 9. Archivos nuevos vs modificados (resumen)

### Nuevos (untracked)
- `apps/api/src/mastra/swarm/builtins/index.ts`
- `apps/api/src/mastra/swarm/schema/index.ts`
- `apps/api/src/mastra/swarm/tools/simple-registry.mjs`
- `docs/golden-image-implementation.md` (este archivo)

### Modificados desde el inicio del branch
- `apps/api/Dockerfile`
- `apps/api/package.json`
- `apps/api/src/mastra/swarm/SwarmLoader.ts`
- `apps/api/src/mastra/swarm/controllers/agent.controller.ts`
- `apps/api/src/mastra/swarm/validators.ts`
- `packages/contracts/package.json`
- `pnpm-lock.yaml`

### Modificados antes en el branch (commits previos)
- `apps/api/.dockerignore` (creado)
- `apps/api/.env.example.docker` (creado)
- `apps/api/fly.toml` (creado)
- `apps/api/src/mastra/swarm/router.ts` (creado)
- `apps/api/src/mastra/swarm/types.ts` (creado)
- `apps/api/src/mastra/swarm/vm-server.ts` (creado)
- `packages/contracts/*` (paquete creado)
