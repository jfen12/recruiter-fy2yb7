# Stage 1: Builder
# Base image: python:3.11-slim (v3.11.4)
FROM python:3.11-slim AS builder

# Set environment variables for build optimization
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONOPTIMIZE=2 \
    PYTHON_NUMERIC_OPTIMIZE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python packages with optimization flags
RUN pip install --no-cache-dir -r requirements.txt \
    && find /usr/local -name '*.pyc' -delete \
    && find /usr/local -name '__pycache__' -delete

# Stage 2: Final
# Base image: python:3.11-slim (v3.11.4)
FROM python:3.11-slim

# Set environment variables for runtime optimization
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONOPTIMIZE=2 \
    PYTHON_NUMERIC_OPTIMIZE=1 \
    PATH="/home/analytics/.local/bin:$PATH"

# Set working directory
WORKDIR /app

# Create non-root user
RUN groupadd -r analytics -g 1000 && \
    useradd -r -g analytics -u 1000 -m -s /bin/bash analytics

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=analytics:analytics . .

# Set secure file permissions
RUN chmod -R 755 /app/src && \
    chmod -R 644 /app/src/**/*.py && \
    chown -R analytics:analytics /app

# Create and set permissions for temporary directory
RUN mkdir -p /tmp/analytics && \
    chown -R analytics:analytics /tmp/analytics && \
    chmod 755 /tmp/analytics

# Switch to non-root user
USER analytics

# Expose FastAPI port
EXPOSE 8000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c 'import requests; requests.get("http://localhost:8000/health").raise_for_status()'

# Set entrypoint command
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--loop", "uvloop", "--http", "httptools"]