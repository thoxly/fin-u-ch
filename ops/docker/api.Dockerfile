FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy api package
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package
RUN pnpm --filter @fin-u-ch/shared build

# Generate Prisma Client
RUN pnpm --filter api prisma:generate

# Build api
WORKDIR /app
RUN pnpm --filter api build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for Prisma
# Force rebuild: bcryptjs migration 2025-10-08
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Copy shared package (built)
COPY --from=builder /app/packages/shared ./packages/shared

# Copy api built files
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Install dependencies fresh (this will compile native modules for this image)
RUN pnpm install --frozen-lockfile --prod=false

# Set working directory
WORKDIR /app/apps/api

# Generate Prisma Client
RUN npx prisma generate

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["pnpm", "start"]

