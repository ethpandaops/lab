#!/bin/bash

# Load environment variables
if [ -f ../.env ]; then
    echo "Loading environment variables from .env"
    export $(cat ../.env | grep -v '^#' | xargs)
fi

if [ -z "$1" ]; then
    echo "No notebook specified - running all enabled notebooks"
    python notebook_runner.py
else
    NOTEBOOK_NAME=$1
    echo "Running notebook: ${NOTEBOOK_NAME}"
    python notebook_runner.py "${NOTEBOOK_NAME}.ipynb"
fi 