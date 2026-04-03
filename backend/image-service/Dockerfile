FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose port (default is 3002 as per index.js)
EXPOSE 3002

# Start the Node.js application
CMD ["node", "index.js"]






