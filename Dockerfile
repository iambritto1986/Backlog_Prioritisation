# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all project source files first (so index.html and src/ are always present)
COPY . .

# Install dependencies and build production static bundle
RUN npm install
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Copy package definitions
COPY package*.json ./

# Install production dependencies only (ignoring scripts)
RUN npm install --omit=dev --ignore-scripts

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy production server script
COPY server.js ./

# Expose application port
EXPOSE 10000

# Start production server
CMD ["node", "server.js"]
