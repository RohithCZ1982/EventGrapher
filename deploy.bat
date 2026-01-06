@echo off
REM EventGrapher Deployment Script for Windows
REM This script helps you build and deploy to Google Cloud Run

echo 🚀 EventGrapher Deployment Script
echo ==================================
echo.

REM Check if gcloud is installed
where gcloud >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: gcloud CLI is not installed.
    echo Please install it from: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

REM Check if Docker is installed
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Docker is not installed.
    echo Please install it from: https://www.docker.com/get-started
    exit /b 1
)

REM Get project ID
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set PROJECT_ID=%%i

if "%PROJECT_ID%"=="" (
    echo ⚠️  No Google Cloud project is set.
    set /p PROJECT_ID="Enter your Google Cloud Project ID: "
    gcloud config set project "%PROJECT_ID%"
    echo ✅ Project set to: %PROJECT_ID%
) else (
    echo ✅ Using project: %PROJECT_ID%
)

REM Get region
set /p REGION="Enter region (default: us-central1): "
if "%REGION%"=="" set REGION=us-central1
echo ✅ Using region: %REGION%

REM Get storage bucket (optional)
set /p STORAGE_BUCKET="Enter GCS bucket name (optional, press Enter to skip): "

echo.
echo 📦 Starting deployment...
echo.

REM Deploy Backend
echo 🔨 Building and deploying backend...
if "%STORAGE_BUCKET%"=="" (
    gcloud builds submit --config=cloudbuild-backend.yaml --substitutions=_REGION=%REGION%
) else (
    gcloud builds submit --config=cloudbuild-backend.yaml --substitutions=_REGION=%REGION%,_STORAGE_BUCKET=%STORAGE_BUCKET%
)

REM Get backend URL
for /f "tokens=*" %%i in ('gcloud run services describe eventgrapher-backend --region=%REGION% --format="value(status.url)" 2^>nul') do set BACKEND_URL=%%i

if "%BACKEND_URL%"=="" (
    echo ⚠️  Could not get backend URL. Please check deployment status.
    exit /b 1
)

echo ✅ Backend deployed: %BACKEND_URL%
echo.

REM Deploy Frontend
echo 🔨 Building and deploying frontend...
gcloud builds submit --config=cloudbuild-frontend.yaml --substitutions=_REGION=%REGION%,_BACKEND_URL=%BACKEND_URL%

REM Get frontend URL
for /f "tokens=*" %%i in ('gcloud run services describe eventgrapher-frontend --region=%REGION% --format="value(status.url)" 2^>nul') do set FRONTEND_URL=%%i

if "%FRONTEND_URL%"=="" (
    echo ⚠️  Could not get frontend URL. Please check deployment status.
    exit /b 1
)

echo ✅ Frontend deployed: %FRONTEND_URL%
echo.

REM Update backend CORS
echo 🔧 Updating backend CORS settings...
gcloud run services update eventgrapher-backend --region=%REGION% --update-env-vars FRONTEND_URL=%FRONTEND_URL%

echo.
echo 🎉 Deployment complete!
echo.
echo 📍 URLs:
echo    Backend:  %BACKEND_URL%
echo    Frontend: %FRONTEND_URL%
echo    Slideshow: %FRONTEND_URL%/slideshow
echo.
echo 📝 Next steps:
echo    1. Visit %FRONTEND_URL% to see your app
echo    2. Visit %FRONTEND_URL%/slideshow to see the slideshow
echo    3. Check logs: gcloud run services logs read eventgrapher-backend --region=%REGION%
echo.

