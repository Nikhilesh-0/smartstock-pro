#!/bin/bash
# Fallback to port 8000 if Railway doesn't provide one
PORT="${PORT:-8000}" 
echo "Starting server on port $PORT..."
uvicorn main:app --host 0.0.0.0 --port $PORT