#!/bin/bash

echo "Setting up EventGrapher Backend..."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.7+ from https://www.python.org/"
    exit 1
fi

echo "Python found!"
echo

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo
echo "Backend setup complete!"
echo
echo "To run the backend:"
echo "  1. Activate the virtual environment: source venv/bin/activate"
echo "  2. Run: uvicorn app.main:app --reload"
echo

