# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies and lib3mf C++ library
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Build and install lib3mf CLI tool
RUN git clone https://github.com/3MFConsortium/lib3mf.git /tmp/lib3mf \
    && cd /tmp/lib3mf \
    && mkdir build && cd build \
    && cmake .. -DCMAKE_BUILD_TYPE=Release -DLIB3MF_TESTS=OFF \
    && make -j$(nproc) \
    && cp bin/lib3mf.com/lib3mf_cli /usr/local/bin/lib3mf-cli \
    && chmod +x /usr/local/bin/lib3mf-cli \
    && cd / && rm -rf /tmp/lib3mf

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