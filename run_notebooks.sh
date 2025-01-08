#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run all notebooks
for notebook in notebooks/*.ipynb; do
    if [ -f "$notebook" ]; then
        echo "Running $notebook"
        python notebook_runner.py "$notebook"
    fi
done