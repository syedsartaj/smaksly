#!/bin/bash

# =============================================================================
# GCP Cloud Run Deployment Script for Smaksly
# =============================================================================

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="smaksly"
REPO_NAME="smaksly-repo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Smaksly Cloud Run Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}Not authenticated. Running gcloud auth login...${NC}"
    gcloud auth login
fi

# Set project
echo -e "${YELLOW}Setting project to: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    --quiet

# Create Artifact Registry repository if it doesn't exist
echo -e "${YELLOW}Creating Artifact Registry repository...${NC}"
gcloud artifacts repositories create ${REPO_NAME} \
    --repository-format=docker \
    --location=${REGION} \
    --description="Smaksly container images" \
    --quiet 2>/dev/null || echo "Repository already exists"

# Configure Docker for GCP
echo -e "${YELLOW}Configuring Docker for GCP...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build and push image
IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:$(date +%Y%m%d%H%M%S)"
IMAGE_LATEST="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${IMAGE_TAG} -t ${IMAGE_LATEST} .

echo -e "${YELLOW}Pushing image to Artifact Registry...${NC}"
docker push ${IMAGE_TAG}
docker push ${IMAGE_LATEST}

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image=${IMAGE_TAG} \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=1 \
    --max-instances=10 \
    --memory=1Gi \
    --cpu=1 \
    --timeout=60 \
    --set-env-vars="NODE_ENV=production"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Service URL: ${SERVICE_URL}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Set up secrets in Secret Manager:"
echo "   gcloud secrets create mongodb-uri --data-file=-"
echo "   gcloud secrets create jwt-secret --data-file=-"
echo ""
echo "2. Update the service with secrets:"
echo "   gcloud run services update ${SERVICE_NAME} --region=${REGION} \\"
echo "     --set-secrets=MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest"
echo ""
echo "3. Set up custom domain (optional):"
echo "   gcloud run domain-mappings create --service=${SERVICE_NAME} \\"
echo "     --domain=your-domain.com --region=${REGION}"
