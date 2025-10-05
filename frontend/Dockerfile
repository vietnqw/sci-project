FROM node:20-alpine

# Install minimal dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Accept build argument for API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build with memory limit
RUN npm run build

# Clean up dev dependencies to reduce image size
RUN npm prune --production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Simple health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=2 \
    CMD wget --quiet --tries=1 --spider http://0.0.0.0:3000 || exit 1

CMD ["npm", "start"]
