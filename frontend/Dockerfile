# Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# Build argument for API URL (can be overridden at build time)
ARG REACT_APP_API_BASE_URL=https://api.vsrecorder.app
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

RUN npm run build

# Stage 2: Runtime
FROM nginx:alpine

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
