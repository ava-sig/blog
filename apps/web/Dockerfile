# Multi-stage Dockerfile for Nuxt 3 SSR (production)
FROM node:20-alpine AS builder
WORKDIR /app
# Install deps and build
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime image ---
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
# Copy built output only
COPY --from=builder --chown=node:node /app/.output /app/.output
# Default runtime env
ENV PORT=5000 \
    HOST=0.0.0.0
USER node
EXPOSE 5000
CMD ["node", ".output/server/index.mjs"]
