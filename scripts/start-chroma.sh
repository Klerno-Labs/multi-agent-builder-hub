#!/bin/bash

# Script to start ChromaDB server locally
# ChromaDB will run on http://localhost:8000

echo "Starting ChromaDB server..."
echo "This will run on http://localhost:8000"
echo "Press Ctrl+C to stop"

# Install chromadb if not already installed
if ! command -v chroma &> /dev/null; then
    echo "Installing ChromaDB..."
    pip install chromadb
fi

# Start ChromaDB server
chroma run --path ./chroma_data --port 8000
