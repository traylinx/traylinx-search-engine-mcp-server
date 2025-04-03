FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production || npm install --production

# Copy pre-built application files
COPY dist/ ./dist/
COPY .env.example ./

# Make the application executable
RUN chmod +x dist/index.js

# The MCP protocol uses stdio, not HTTP, so no port is needed
ENV PORT=3000

# Command to run the application
CMD ["node", "dist/index.js"]
