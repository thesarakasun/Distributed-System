FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies with increased timeout and retry
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --only=production --legacy-peer-deps --no-audit --no-fund

# Copy application code
COPY . .

# Expose port
EXPOSE 3001 3002

# Start application
CMD ["node", "server.js"]
