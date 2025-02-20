FROM python:3.11-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    python3-setuptools \
    python3-wheel \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt ./

# Install dependencies with forced source build for clickhouse-driver
RUN pip install --upgrade pip && \
    pip install --no-binary clickhouse-driver -r requirements.txt

# Copy source code and config
COPY lab/ ./lab/
COPY config.example.yaml /app/config.yaml

# Create state directory
RUN mkdir -p /app/state/modules && chmod -R 777 /app/state

# Create volume mount points
VOLUME ["/app/state", "/app/config.yaml"]

# Run the application
ENTRYPOINT ["python", "-m", "lab"] 