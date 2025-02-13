FROM python:3.11-slim

WORKDIR /app

# Install Poetry
RUN pip install poetry

# Copy Poetry files
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev --no-interaction --no-ansi

# Copy source code
COPY lab/ ./lab/

# Create state directory
RUN mkdir -p /app/state && chmod 777 /app/state

# Run the application
ENTRYPOINT ["python", "-m", "lab"] 