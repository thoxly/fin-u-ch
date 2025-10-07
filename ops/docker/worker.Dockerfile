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

# Install OpenSSL and build dependencies for native modules
RUN apk add --no-cache openssl python3 make g++

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

# Install dependencies in production (this will build native modules for this stage)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Generate Prisma Client in production stage
RUN pnpm --filter worker prisma:generate

# Set working directory to worker
WORKDIR /app/apps/worker

# Health check (check if process is running)
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "node.*index.js" || exit 1

# Start the worker
CMD ["pnpm", "start"]

