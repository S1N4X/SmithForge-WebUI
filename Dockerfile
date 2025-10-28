# Dockerfile
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

# Copy requirements.txt and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything into the container
COPY . .

# Create necessary directories
RUN mkdir -p outputs inputs inputs/bases

# Web server
EXPOSE 8000
CMD ["uvicorn", "web.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Labels (for Unraid)
LABEL com.docker.compose.project="smithforge"
LABEL com.docker.compose.service="web"
LABEL com.docker.compose.version="1.0"

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:8000/health || exit 1