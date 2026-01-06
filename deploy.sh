#!/bin/bash

# EventGrapher Deployment Script
# This script helps you build and deploy to Google Cloud Run

set -e  # Exit on error

echo "🚀 EventGrapher Deployment Script"
echo "=================================="
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install it from: https://www.docker.com/get-started"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "⚠️  No Google Cloud project is set."
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
    echo "✅ Project set to: $PROJECT_ID"
else
    echo "✅ Using project: $PROJECT_ID"
fi

# Get region
read -p "Enter region (default: us-central1): " REGION
REGION=${REGION:-us-central1}
echo "✅ Using region: $REGION"

# Get storage bucket (optional)
read -p "Enter GCS bucket name (optional, press Enter to skip): " STORAGE_BUCKET

echo ""
echo "📦 Starting deployment..."
echo ""

# Deploy Backend
echo "🔨 Building and deploying backend..."
if [ -z "$STORAGE_BUCKET" ]; then
    gcloud builds submit --config=cloudbuild-backend.yaml \
        --substitutions=_REGION=$REGION
else
    gcloud builds submit --config=cloudbuild-backend.yaml \
        --substitutions=_REGION=$REGION,_STORAGE_BUCKET=$STORAGE_BUCKET
fi

# Get backend URL
BACKEND_URL=$(gcloud run services describe eventgrapher-backend \
    --region=$REGION \
    --format="value(status.url)" 2>/dev/null)

if [ -z "$BACKEND_URL" ]; then
    echo "⚠️  Could not get backend URL. Please check deployment status."
    exit 1
fi

echo "✅ Backend deployed: $BACKEND_URL"
echo ""

# Deploy Frontend
echo "🔨 Building and deploying frontend..."
gcloud builds submit --config=cloudbuild-frontend.yaml \
    --substitutions=_REGION=$REGION,_BACKEND_URL=$BACKEND_URL

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe eventgrapher-frontend \
    --region=$REGION \
    --format="value(status.url)" 2>/dev/null)

if [ -z "$FRONTEND_URL" ]; then
    echo "⚠️  Could not get frontend URL. Please check deployment status."
    exit 1
fi

echo "✅ Frontend deployed: $FRONTEND_URL"
echo ""

# Update backend CORS
echo "🔧 Updating backend CORS settings..."
gcloud run services update eventgrapher-backend \
    --region=$REGION \
    --update-env-vars FRONTEND_URL=$FRONTEND_URL

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📍 URLs:"
echo "   Backend:  $BACKEND_URL"
echo "   Frontend: $FRONTEND_URL"
echo "   Slideshow: $FRONTEND_URL/slideshow"
echo ""
echo "📝 Next steps:"
echo "   1. Visit $FRONTEND_URL to see your app"
echo "   2. Visit $FRONTEND_URL/slideshow to see the slideshow"
echo "   3. Check logs: gcloud run services logs read eventgrapher-backend --region=$REGION"
echo ""

