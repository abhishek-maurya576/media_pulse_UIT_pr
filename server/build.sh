#!/usr/bin/env bash
# Render build script for Media Pulse backend
# This script runs during each deploy on Render.

set -o errexit   # exit on error
set -o pipefail  # catch pipe failures

echo "==> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Collecting static files..."
python manage.py collectstatic --no-input

echo "==> Running database migrations..."
python manage.py migrate --no-input

echo "==> Build complete!"
