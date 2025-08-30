# Production Dockerfile for API (Express)
FROM node:20-alpine
WORKDIR /app

# Install only production deps first (leveraging npm ci)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source and data folder structure
COPY src ./src
COPY data ./data

ENV NODE_ENV=production \
    PORT=3000

# Persist uploads
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "src/server.js"]
