# ========================================
# ZINA Cantine BAD - Dockerfile
# ========================================

# Use Python 3.8 slim image as base
FROM python:3.8-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_APP=app.py \
    FLASK_ENV=production \
    DEBIAN_FRONTEND=noninteractive

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libmagic1 \
    libmagic-dev \
    libffi-dev \
    libssl-dev \
    curl \
    wget \
    git \
    vim \
    supervisor \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r zina && useradd -r -g zina zina

# Copy requirements first for better caching
COPY requirements.txt requirements-dev.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /app/static /app/templates && \
    chown -R zina:zina /app

# Copy configuration files
COPY docker/supervisor.conf /etc/supervisor/conf.d/supervisor.conf
COPY docker/nginx.conf /etc/nginx/sites-available/default

# Install application in development mode
RUN pip install -e .

# Set permissions
RUN chmod +x docker/entrypoint.sh

# Switch to non-root user
USER zina

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the application
ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisor.conf"]
