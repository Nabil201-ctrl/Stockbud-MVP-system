FROM node:20-alpine

WORKDIR /app

# 1. Install ALL dependencies first (including devDeps for the build)
COPY package*.json ./
RUN npm ci

# 2. Copy source
COPY . .

# 3. Generate Prisma Client (CRITICAL for TypeScript compilation)
RUN npx prisma generate

# 4. Build the application
RUN npm run build

# 5. Security & Permissions
RUN chown -R node:node /app
USER node

EXPOSE 3000
ENV NODE_ENV=production

# 6. Start the app
# Use node directly. Path to main.js is usually dist/main.js for Nest
CMD ["node", "dist/main.js"]
