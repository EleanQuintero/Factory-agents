# Test E2E — Worker Edge Gateway + Fly VM + Agentes

> **Fecha:** 2026-05-24
> **Resultado:** PASS
> **Duración total del test exitoso:** ~107s (33s cold start + 73s ejecución del agente)

---

## 1. Objetivo del test

Validar el flujo completo end-to-end: un request entra por el Cloudflare Worker, el worker levanta una VM en Fly.io, la VM crea un agente con herramientas reales (búsqueda web + envío de email), el agente ejecuta una tarea y envía un email formateado al usuario.

**Todo el tráfico pasa por el worker. Cero acceso directo a Fly.**

---

## 2. Stack involucrado

```
Cliente (curl)
  ↓ HTTPS
Cloudflare Worker (Edge Gateway)
  ↓ Fly REST API (api.machines.dev/v1)
Fly.io Machine (fra, shared-cpu-1x, 1GB RAM)
  ↓ Golden Image (Node.js 22 + Mastra)
  ↓ Swarm Engine (orchestrator + 2 workers)
    ├── composio-search → Composio API → Web
    └── resend-email → Resend API → Email
  ↓ Anthropic API (claude-sonnet-4-6 + claude-haiku-4-5)
Supabase Postgres (eu-central-1)
  └── agent_configs, agent_logs, mastra_threads
```

---

## 3. Flujo ejecutado

### Paso 1 — Health check (crear VM)

```
GET /health?agentId=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

| Métrica | Valor |
|---------|-------|
| Tiempo total | 33.4s |
| Cold start (create machine) | ~24s |
| Boot container | ~2s |
| Node.js init | ~2s |
| waitForVmReady (poll /health) | ~5s |
| Resultado | `{"status":"ready"}` |

El worker llamó a `fly.ensureMachine()` que creó la machine via REST API, esperó al estado `started`, y después polleó `/health` del container hasta que respondió 200.

### Paso 2 — Crear agente

```
POST /agent/create/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Body: { userId, swarm_config con composio-search + resend-email }
```

| Métrica | Valor |
|---------|-------|
| Resultado | 201 Created |
| agentId | a1b2c3d4-e5f6-7890-abcd-ef1234567890 |

El worker validó el agentId contra Supabase, proxyeó a la VM con `fly-force-instance-id` header, y la VM cargó los builtins (composio-search + resend-email) usando las API keys de los secrets de Fly.

### Paso 3 — Chat con prompt

```
POST /chat/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Body: { prompt: "Busca 2 pueblos bonitos en la Sierra de Madrid..." }
```

| Métrica | Valor |
|---------|-------|
| Tiempo total | 73.7s |
| Modelo orchestrator | claude-sonnet-4-6 |
| Modelo workers | claude-haiku-4-5 |
| Response | Streaming (text/plain, chunked) |
| Email enviado | Sí, a contacto.eleanquintero@gmail.com |
| Asunto | "Sierra de Madrid - 2 escapadas" |

El agente:
1. Usó composio-search para buscar información sobre Manzanares el Real y Buitrago del Lozoya
2. Analizó resultados (qué ver, cómo llegar en bus)
3. Compuso un email HTML con diseño profesional
4. Envió via resend-email
5. Streamó la confirmación al cliente

**Email recibido y confirmado por el usuario.**

---

## 4. Problemas encontrados y resueltos

### 4.1 — Subdomain DNS no resuelve
- **Problema:** `vm-{id}.vm.zenith-factory.fly.dev` no resuelve DNS
- **Causa:** Fly no habilita subdomain routing por defecto en apps Machines
- **Solución:** Usar `zenith-factory.fly.dev` (app-level) + header `fly-force-instance-id: {machineId}` para routing a machine específica

### 4.2 — COMPOSIO_API_KEY inválida crashea la VM
- **Problema:** La VM entraba en crash loop al intentar crear el agente con composio-search
- **Causa:** El builtin tiene un `await` que falla con unhandled rejection si la API key es inválida. El proceso Node muere
- **Solución:** Actualizar la API key en Fly (`flyctl secrets set --stage`)
- **Pendiente:** Agregar try/catch en el builtin para devolver error graceful en vez de crashear

### 4.3 — `flyctl secrets set` falla en apps Machines
- **Problema:** `flyctl secrets set KEY=val --app zenith-factory` falla con "could not find image to use for deployment"
- **Causa:** La app usa Machines API (no Fly Launch), no tiene deployment history
- **Solución:** Usar `--stage` para solo guardar el secret. La machine lo recibe cuando se crea/recrea

### 4.4 — swarm_config.id vs agentId de Supabase
- **Problema:** El worker valida contra Supabase con el agentId de la URL, pero la VM registra el agente con `swarm_config.id`. Si no coinciden, el chat devuelve "Agent not initialized"
- **Solución:** Usar el mismo UUID como `swarm_config.id` y como agentId en Supabase

### 4.5 — waitForVmReady timeout insuficiente
- **Problema:** El timeout original (5s) era muy corto para cold starts (~33s)
- **Solución:** Ampliado a 23s (3s grace + 20 polls × 1s)

### 4.6 — Rate limit de Anthropic
- **Problema:** Múltiples intentos de debug agotaron el rate limit (50k input tokens/min en haiku)
- **Solución:** Reducir el prompt (2 lugares en vez de 3, menos detalle pedido). Esperar 1 minuto entre intentos

---

## 5. Métricas de performance

| Operación | Tiempo |
|-----------|--------|
| Cold start (create + boot + ready) | ~33s |
| Wake from suspend | ~1s |
| Agent creation | <2s |
| Chat con búsqueda web + email | ~74s |
| **Total E2E (cold start)** | **~107s** |
| **Total E2E (warm, wake from suspend)** | **~75s** |

---

## 6. PRs generados en esta sesión

| PR | Título | Estado |
|----|--------|--------|
| [#10](https://github.com/EleanQuintero/Factory-agents/pull/10) | refactor(worker): Fly client GraphQL → REST API | Merged |
| [#11](https://github.com/EleanQuintero/Factory-agents/pull/11) | feat(worker): gateway endpoints + chat UI + observability | Open |

---

## 7. Aprendizajes clave

1. **El worker SIEMPRE es el gateway.** Nunca acceso directo a Fly. Esto da control centralizado de auth, logging, rate limiting y error handling.

2. **`fly-force-instance-id` es la solución para multi-tenant.** No depender de subdomain DNS que puede no estar habilitado. El header funciona desde requests externos.

3. **Los builtins necesitan error handling defensivo.** Una API key inválida no debería tumbar toda la VM. Falta un try/catch en el factory de composio-search.

4. **IDs consistentes entre capas.** Si Supabase, el worker y la VM usan IDs diferentes para el mismo agente, las cosas se rompen silenciosamente.

5. **Los cold starts son el cuello de botella.** 33s es aceptable para la primera request, pero el autostop=suspend con wake de 1s hace que las requests subsiguientes sean rápidas.

6. **Testing E2E con APIs externas requiere paciencia.** Rate limits, API keys expiradas, DNS que no resuelve — cada capa agrega un punto de fallo. Prompts cortos para debug.
