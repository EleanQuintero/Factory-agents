# Refactor Worker — Fly Client GraphQL → REST

> **Branch:** `refactor/worker-fly-rest-api`
> **Estado:** implementado, tests pasando (61/61), pendiente smoke test E2E contra Fly real
> **Fecha:** 2026-05-24

Este documento explica el refactor completo del cliente Fly.io dentro del Cloudflare Worker Edge Gateway. El cliente viejo usaba GraphQL contra un endpoint undocumented que Fly marcó como EOL. El nuevo usa la REST API oficial (`api.machines.dev/v1`).

---

## 1. Por qué este refactor

El cliente original (`src/lib/flyio.ts`, PR #7) tenía 5 problemas:

| # | Problema | Antes | Después |
|---|----------|-------|---------|
| 1 | Protocolo | GraphQL (`api.fly.io/graphql`) — undocumented, EOL | REST (`api.machines.dev/v1`) — API oficial |
| 2 | App model | 1 app por tenant (`zenith-factory-${agentId}`) | 1 app + N machines (`zenith-factory` + `vm-${userId}`) |
| 3 | Region | Hardcoded `iad` (US East) | Configurable, default `fra` (co-ubicado con Supabase eu-central-1) |
| 4 | Image | `zenith-factory-golden:latest` (sin registry, tag genérico) | `registry.fly.io/zenith-factory:golden-v1` (registry completo) |
| 5 | URL | `https://zenith-factory-${agentId}.fly.dev` | `https://vm-${userId}.vm.zenith-factory.fly.dev` |

---

## 2. Qué se hizo — fase por fase

### Fase 1 — Tipos (`src/lib/fly/types.ts`)

Contrato de tipos entre nuestro código y la API de Fly. Sin lógica, cero runtime.

- Union types para enums (`MachineState`, `CpuKind`, `Autostop`, etc.)
- Interfaces de configuración (`Guest`, `Service`, `MachineConfig`, `Machine`)
- Request/Response shapes (`CreateMachineRequest`, `WaitOptions`, etc.)
- Jerarquía de errores (`FlyApiError` base → subclases por status code)

### Fase 2 — Cliente REST (`src/lib/fly/client.ts`)

Rewrite completo. Clase `FlyMachinesClient` con:

- **DI via `FlyClientEnv`** — 4 variables inyectadas por constructor
- **`request<T>` privado** — centraliza auth header, JSON parsing, error mapping (401→FlyAuthError, 404→FlyNotFoundError, etc.)
- **Retry con backoff exponencial** — solo para 429 (rate limit) y 5xx (server error), max 4 intentos, con jitter para evitar thundering herd
- **Métodos CRUD** — `listMachines`, `getMachine`, `createMachine`, `updateMachine`, `startMachine`, `stopMachine`, `suspendMachine`, `destroyMachine`, `waitForState`
- **`ensureMachine(userId)`** — método de alto nivel que garantiza una VM corriendo: crea si no existe, arranca si está parada/suspendida, devuelve tal cual si ya está `started`. Idempotente.
- **`getVmUrl(userId)`** — genera la URL correcta con el nuevo formato de subdomain
- **`buildTenantConfig(userId)`** — configuración por defecto para VMs de tenant (region fra, autostop suspend, shared CPU 1c/1GB, dns-result-order ipv4first)

30 unit tests cubriendo cada método, error mapping, retry, y los 4 escenarios de `ensureMachine`.

### Fase 3 — Config del Worker

- `wrangler.toml` — sección `[vars]` con `FLY_APP_NAME`, `FLY_REGION`, `FLY_MACHINE_IMAGE` (el token sigue como wrangler secret)
- `models/types.ts` — 3 propiedades nuevas en interface `Env`
- Tests — mock `Env` actualizado en todos los archivos

### Fase 4 — Migración de services y controllers

Cambio arquitectónico principal: la orquestación fragmentada de VMs (`getVmStatus` + `createMachine` + `startMachine` con branching manual) se reemplazó por una sola llamada a `fly.ensureMachine()`.

**vmService.ts** — de 4 funciones a 1. Quedó solo `waitForVmReady` (poll app-level, distinto de `waitForState` que es infra-level de Fly).

**executeService.ts** — recibe `vmUrl: string` en vez del cliente Fly. Reducción de acoplamiento: el service no necesita saber que existe Fly.

**Controllers (health + execute)** — instancian `new FlyMachinesClient(c.env)`, llaman `ensureMachine`, pasan la URL. Código más corto y declarativo.

**Tests** — todos migrados. Los integration tests mockean `FlyMachinesClient` via `vi.mock`. Los unit tests de vmService y executeService usan las interfaces nuevas.

---

## 3. Decisiones arquitectónicas

Estas 6 decisiones se cerraron en la sesión del 2026-05-23, antes de tocar código:

| # | Decisión | Resolución | Razón |
|---|----------|------------|-------|
| 1 | Autostop | `suspend` | Cold start 300-500ms vs 1-3s con stop. No cobra CPU/RAM en ningún caso |
| 2 | Branch strategy | 1 PR, 4 commits por fase | Más fácil de revisar end-to-end |
| 3 | Gestión de apps | Worker asume app creada | No implementa createApp/deleteApp — la app se crea una vez manualmente |
| 4 | Logging | `ingestLogs` + `LogEntry[]` + `ctx.waitUntil` | Reusar el logService existente, async best-effort |
| 5 | 408 en `/wait` | 1 retry → si falla 504 al cliente | El wait de Fly tiene su propio timeout, no reintentar infinitamente |
| 6 | GC de machines | Otro PR | Tiene sus propias decisiones de producto |

---

## 4. Archivos modificados

### Nuevos
- `src/lib/fly/types.ts` — tipos de la REST API
- `src/lib/fly/client.ts` — cliente REST
- `tests/unit/flyMachinesClient.test.ts` — 30 tests del cliente
- `docs/architecture.mmd` — diagrama Mermaid del worker

### Modificados
- `wrangler.toml` — `[vars]` con config de Fly
- `src/models/types.ts` — `Env` ampliado
- `src/controllers/healthController.ts` — usa `FlyMachinesClient`
- `src/controllers/executeController.ts` — usa `FlyMachinesClient`
- `src/services/vmService.ts` — reducido a `waitForVmReady`
- `src/services/executeService.ts` — recibe `vmUrl` string
- `src/lib/index.ts` — barrel export actualizado
- `tests/` — todos los mocks actualizados (6 archivos)

### Sin tocar (pendiente cleanup)
- `src/lib/flyio.ts` — cliente GraphQL viejo, ya no importado por nadie

---

## 5. Tests

| Suite | Tests | Estado |
|-------|-------|--------|
| flyMachinesClient | 30 | OK |
| executeService | 6 | OK |
| vmService | 3 | OK |
| healthController | 1 | OK |
| agentService | 5 | OK |
| logService | 6 | OK |
| integration/execute | 4 | OK |
| integration/health | 2 | OK |
| integration/routes | 4 | OK |
| **Total** | **61** | **OK** |

---

## 6. Pendiente — Fase 5 (smoke test E2E)

No requiere code changes. Pasos:

1. Generar deploy token: `flyctl tokens create deploy --app zenith-factory --name worker-dev --expiry 720h`
2. Configurar en worker: `wrangler secret put FLY_API_TOKEN`
3. `wrangler dev` → hit `/execute` con userId de test
4. Verificar machine creada en `fra`, proxy funcional, auto-suspend a los 5min
5. Cleanup: `flyctl machines destroy <id> --force`
