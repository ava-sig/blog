# Production Dockerfile for API (Express)
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Install only production deps first (leveraging npm ci)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source and data folder structure
COPY --chown=node:node src ./src
COPY --chown=node:node data ./data

# Persist uploads
VOLUME ["/app/data"]

RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
