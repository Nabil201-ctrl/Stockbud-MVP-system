# syntax=docker/dockerfile:1

# Stage 1: Common base image
FROM node:20-alpine AS base
RUN apk add --no-cache openssl

# Stage 2: Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Install all dependencies including devDependencies for the build process
RUN npm ci

# Stage 3: Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client and build the app
RUN npx prisma generate
RUN npm run build

# Stage 4: Production runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 stockbud

# Copy built application and necessary runtime files
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dbsetup.js ./dbsetup.js
COPY --from=builder /app/litestream.yml ./litestream.yml

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force
# Generate Prisma client for runtime
RUN npx prisma generate

# Ensure the app can write to the data directory (for SQLite)
# Symlink for SQLite will be handled by dbsetup.js
RUN mkdir -p /data && chown -R stockbud:nodejs /data
RUN chown -R stockbud:nodejs /app

USER stockbud

EXPOSE 3000
ENV PORT 3000

# Use dbsetup.js as the entry point to handle DB migrations and Litestream replication
CMD ["node", "./dbsetup.js", "npm", "run", "start"]
