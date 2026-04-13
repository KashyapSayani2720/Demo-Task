#!/bin/bash
cd "$(dirname "$0")"
echo "Starting DealerOS..."
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "Node.js is not installed. Please install Node.js 22+ from https://nodejs.org"
  read -p "Press Enter to exit..."
  exit 1
fi

# Check for MongoDB
if ! command -v mongod &> /dev/null && ! pgrep -x mongod > /dev/null; then
  echo "MongoDB does not appear to be running. Please start MongoDB first."
  echo "Install: https://www.mongodb.com/docs/manual/installation/"
  read -p "Press Enter to continue anyway..."
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

# Check for .env
if [ ! -f ".env" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

echo "Starting server on http://localhost:5050"
echo "Press Ctrl+C to stop."
echo ""
npm start
