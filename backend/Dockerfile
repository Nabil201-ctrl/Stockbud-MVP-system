# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the NestJS application
RUN npm run build


# --- Production Stage ---
FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Copy local data JSON files if they exist so the backend has initial state
# (Assuming the backend reads/writes these in the root/data directory)
COPY --from=builder /app/*.json ./
COPY --from=builder /app/data ./data

# Change ownership to the non-root 'node' user for security
RUN chown -R node:node /app

# Switch to the non-root user
USER node

# Expose the backend port
EXPOSE 3000

# Set environment variable to indicate production environment
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start:prod"]
