FROM node:20-alpine

# Install OpenSSL (Alpine version)
RUN apk add --no-cache openssl

WORKDIR /app

# 1. Install ALL dependencies first (including dev)
COPY package*.json ./
RUN npm ci

# 2. Copy source
COPY . .

# 3. Generate Prisma Client
RUN npx prisma generate

# 4. Build the application
RUN npm run build

# 5. Security & Permissions
RUN chown -R node:node /app
USER node

EXPOSE 3000
ENV NODE_ENV=production

# 6. Start the app
CMD ["node", "dist/src/main.js"]

