FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy worker package
COPY apps/worker ./apps/worker

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm --filter worker prisma:generate

# Build worker
WORKDIR /app
RUN pnpm --filter worker build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Copy worker built files
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/apps/worker/prisma ./apps/worker/prisma

# Copy all node_modules from builder (includes Prisma Client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules

# Set working directory to worker
WORKDIR /app/apps/worker

# Health check (check if process is running)
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "node.*index.js" || exit 1

# Start the worker
CMD ["pnpm", "start"]

