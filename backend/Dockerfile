FROM python:3.11-slim

WORKDIR /app

# Install Poetry
RUN pip install poetry

# Copy Poetry files
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev --no-interaction --no-ansi

# Copy source code and config
COPY lab/ ./lab/
COPY config.example.yaml /app/config.yaml

# Create state directory
RUN mkdir -p /app/state/modules && chmod -R 777 /app/state

# Create volume mount points
VOLUME ["/app/state", "/app/config.yaml"]

# Run the application
ENTRYPOINT ["python", "-m", "lab"] 