FROM node:18-alpine

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Allow installing even when peer dependencies conflict (unblocks peer warnings)
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# Install dependencies with SSL configuration
RUN npm config set strict-ssl false \
    && npm install --no-audit --no-fund \
    && npm config set strict-ssl true

# Copy the rest of the frontend code
COPY . .

# Build the frontend
RUN npm run build

# Expose Vite preview server (we run preview on port 5000)
EXPOSE 5000

# Start frontend in preview mode (production-like server)
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5000"]
