FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies for healthcheck
RUN apk add --no-cache wget

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]