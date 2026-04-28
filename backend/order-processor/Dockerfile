FROM node:20-alpine
WORKDIR /app

# Copy package configurations
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port (IMAGE_SERVICE_PORT typically 3002)
EXPOSE 3002

# Start the application
CMD ["node", "index.js"]

