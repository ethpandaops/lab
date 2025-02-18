FROM python:3.11-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt ./

# Install dependencies
RUN pip install -r requirements.txt

# Copy source code and config
COPY lab/ ./lab/
COPY config.example.yaml /app/config.yaml

# Create state directory
RUN mkdir -p /app/state/modules && chmod -R 777 /app/state

# Create volume mount points
VOLUME ["/app/state", "/app/config.yaml"]

# Run the application
ENTRYPOINT ["python", "-m", "lab"] 