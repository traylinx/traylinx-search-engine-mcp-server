FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code and build
COPY . .
RUN npm run build

# Set execution permissions
RUN chmod +x dist/index.js

# Use port 3000 by default (Smithery will override this with its own PORT)
ENV PORT=3000

# Run the server
CMD ["node", "dist/index.js"]
