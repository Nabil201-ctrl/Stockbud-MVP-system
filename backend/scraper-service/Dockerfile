FROM mcr.microsoft.com/playwright:v1.42.1-focal

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set environment variables for Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production

EXPOSE 3005

CMD ["node", "index.js"]
