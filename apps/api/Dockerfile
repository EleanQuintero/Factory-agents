# ============================================
# STAGE 1: Builder
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar solo archivos necesarios para install
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Instalar todas las deps (incluye dev para build)
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Build de Mastra (esto genera .mastra/output/)
RUN pnpm build

# ============================================
# STAGE 2: Runtime (minimal)
# ============================================
FROM node:22-alpine AS runtime

# Usuario sin privilegios para seguridad
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copiar solo lo necesario del builder
COPY --from=builder /app/apps/api/.mastra/output ./mastra/output
COPY --from=builder /app/apps/api/.mastra/packages.json ./

# Instalar SOLO production deps
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN pnpm install --frozen-lockfile --prod

# Cambiar ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Puerto (Mastra default 3000)
EXPOSE 3000

# Entry point — Mastra directo, sin wrapper
CMD ["node", "mastra/output/index.mjs"]
