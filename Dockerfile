# Multi-stage Dockerfile for SmithForge-WebUI
# Stage 1: Build React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend ./

# Build React app for production
RUN npm run build

# Stage 2: Runtime environment (Python + Node.js)
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies including Bambu Studio requirements
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    libfuse2 \
    libwebkit2gtk-4.1-0 \
    libgtk-3-0 \
    libglib2.0-0 \
    libnss3 \
    libgdk-pixbuf-2.0-0 \
    libcairo2 \
    libpango-1.0-0 \
    libdbus-1-3 \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

# Download and install Bambu Studio AppImage (Ubuntu 24.04 for webkit 4.1 compatibility)
RUN wget -O /tmp/bambustudio.AppImage \
    "https://github.com/bambulab/BambuStudio/releases/download/v02.03.00.70/Bambu_Studio_ubuntu-24.04_PR-8184.AppImage" \
    && chmod +x /tmp/bambustudio.AppImage \
    && cd /tmp && ./bambustudio.AppImage --appimage-extract \
    && mv squashfs-root /opt/bambustudio \
    && ln -s /opt/bambustudio/AppRun /usr/local/bin/bambu-studio \
    && rm /tmp/bambustudio.AppImage

# Install Node.js 20.x for Express backend
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend ./backend

# Install backend Node.js dependencies (production only)
WORKDIR /app/backend
RUN npm ci --production

# Copy smithforge Python scripts
WORKDIR /app
COPY smithforge ./smithforge

# Copy built React frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p outputs inputs inputs/bases

# Expose port 3001
EXPOSE 3001

# Start Express backend server
WORKDIR /app/backend
CMD ["node", "server.js"]

# Labels (for Unraid)
LABEL com.docker.compose.project="smithforge"
LABEL com.docker.compose.service="web"
LABEL com.docker.compose.version="2.0"

# Add health check for Express API
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:3001/api/health || exit 1
