# Dockerfile
FROM python:3.9-slim

WORKDIR /app

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