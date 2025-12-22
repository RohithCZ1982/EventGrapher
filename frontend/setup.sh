#!/bin/bash

echo "Setting up EventGrapher Frontend..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js 14+ from https://nodejs.org/"
    exit 1
fi

echo "Node.js found!"
echo

# Install dependencies
echo "Installing dependencies..."
npm install

echo
echo "Frontend setup complete!"
echo
echo "To run the frontend:"
echo "  npm run dev"
echo

