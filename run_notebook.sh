#!/bin/bash

# Check if notebook name is provided
if [ -z "$1" ]; then
    echo "Usage: ./run_notebook.sh <notebook_name>"
    exit 1
fi

NOTEBOOK_NAME=$1

# Load environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run the notebook
python notebook_runner.py "notebooks/${NOTEBOOK_NAME}.ipynb" 