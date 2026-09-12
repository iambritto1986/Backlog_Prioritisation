# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install all dependencies for build
RUN npm install

# Copy all source files
COPY . .

# Build production bundle into /app/dist
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Copy package definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy built frontend assets from builder
COPY --from=builder /app/dist ./dist

# Copy server script
COPY server.js ./

# Expose application port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:10000/api/health || exit 1

# Start production server
CMD ["node", "server.js"]
