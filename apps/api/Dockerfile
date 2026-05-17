# ============================================
# STAGE 1: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Build timestamp start
RUN echo "BUILD_START: $(date +%s)"

# Copiar solo archivos necesarios para install
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Instalar todas las deps (incluye dev para build)
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Instalar dependencias en el contenedor (no copiar node_modules del host)
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN CI=true pnpm install --frozen-lockfile

# Build de Mastra (esto genera .mastra/output/)
RUN pnpm --filter api build

# Compilar vm-server.ts con esbuild para Golden Image
# Instalamos esbuild globalmente porque pnpm ignora build scripts
RUN npm install -g esbuild@0.24.0
RUN esbuild apps/api/src/mastra/swarm/vm-server.ts --bundle --outfile=apps/api/.mastra/output/swarm/vm-server.mjs --platform=node --format=esm --packages=external

# Copiar simplified tool registry (sin React dependencies)
COPY apps/api/src/mastra/swarm/tools/simple-registry.mjs apps/api/.mastra/output/tools.mjs

# Build timestamp end and report
RUN echo "BUILD_END: $(date +%s)"

# ============================================
# STAGE 2: Runtime (minimal)
# ============================================
FROM node:22-alpine AS runtime

# Usuario sin privilegios para seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copiar solo lo necesario del builder
COPY --from=builder /app/apps/api/.mastra/output ./mastra/output
COPY --from=builder /app/apps/api/package.json ./mastra/output/package.json

# Instalar SOLO production deps
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app/mastra/output
RUN pnpm install --prod

# Cambiar ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Puerto (Mastra default 3000)
EXPOSE 3000

# Entry point — Golden Image VM server
CMD ["node", "/app/mastra/output/swarm/vm-server.mjs"]
