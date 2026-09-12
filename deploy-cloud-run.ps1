<#
.SYNOPSIS
  Deploy Bonus Tracker to Google Cloud Run with Google AI Studio (Gemini) support.
.DESCRIPTION
  Builds and deploys the Next.js application to Google Cloud Run.
#>

[CmdletBinding()]
param (
  [Parameter(Mandatory = $false)]
  [string]$ProjectId,

  [Parameter(Mandatory = $false)]
  [string]$Region = "us-central1",

  [Parameter(Mandatory = $false)]
  [string]$GeminiApiKey
)

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Bonus Tracker - Google Cloud Run Deployment " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Check if gcloud CLI is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "Error: 'gcloud' CLI is not found in your PATH." -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Prompt for Project ID if not supplied
if (-not $ProjectId) {
    $currentProject = gcloud config get-value project 2>$null
    if ($currentProject -and $currentProject -ne "(unset)") {
        $confirm = Read-Host "Use current GCP project '$currentProject'? (Y/n)"
        if ($confirm -eq "" -or $confirm -match "^[Yy]") {
            $ProjectId = $currentProject
        }
    }
    if (-not $ProjectId) {
        $ProjectId = Read-Host "Enter your Google Cloud Project ID"
    }
}

if (-not $ProjectId) {
    Write-Host "GCP Project ID is required." -ForegroundColor Red
    exit 1
}

Write-Host "Configuring project: $ProjectId..." -ForegroundColor Green
gcloud config set project $ProjectId

Write-Host "Enabling Google Cloud APIs (Cloud Run, Cloud Build, Secret Manager)..." -ForegroundColor Green
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# Handle Gemini API Key in Secret Manager
if ($GeminiApiKey) {
    Write-Host "Configuring GEMINI_API_KEY secret in Google Secret Manager..." -ForegroundColor Green
    $secretExists = gcloud secrets describe GEMINI_API_KEY --quiet 2>$null
    if (-not $secretExists) {
        gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
    }
    $GeminiApiKey | gcloud secrets versions add GEMINI_API_KEY --data-file=-
}

Write-Host "Building and deploying container to Google Cloud Run..." -ForegroundColor Green
$deployArgs = @(
    "run", "deploy", "bonus-tracker",
    "--source", ".",
    "--region", $Region,
    "--platform", "managed",
    "--allow-unauthenticated",
    "--port", "8080"
)

# If GEMINI_API_KEY secret exists, attach it
$secretExists = gcloud secrets describe GEMINI_API_KEY --quiet 2>$null
if ($secretExists) {
    $deployArgs += "--set-secrets"
    $deployArgs += "GEMINI_API_KEY=GEMINI_API_KEY:latest"
}

& gcloud @deployArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeployment successful! Your Bonus Tracker is now live on Google Cloud Run." -ForegroundColor Green
} else {
    Write-Host "`nDeployment failed. Review the logs above." -ForegroundColor Red
}

