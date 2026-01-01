#!/bin/bash

# Generate Secure Secrets for Claim Mapper
# Usage: ./scripts/generate-secrets.sh [--env-file PATH]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default env file location
ENV_FILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [--env-file PATH]"
            echo ""
            echo "Generate secure secrets for Claim Mapper application."
            echo ""
            echo "Options:"
            echo "  --env-file PATH    Write secrets to specified .env file"
            echo "  -h, --help         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Display secrets to stdout"
            echo "  $0 --env-file .env.local     # Append secrets to .env.local"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Claim Mapper Secret Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check for openssl
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: openssl is required but not installed.${NC}"
    echo "Please install OpenSSL and try again."
    exit 1
fi

# Generate secrets
echo -e "${GREEN}Generating secure secrets...${NC}"
echo ""

JWT_SECRET=$(openssl rand -base64 48)
SESSION_SECRET=$(openssl rand -base64 48)
ML_SERVICE_API_KEY=$(openssl rand -hex 32)

# Output secrets
echo -e "${YELLOW}Generated Secrets:${NC}"
echo ""
echo -e "${GREEN}JWT_SECRET${NC}="
echo "$JWT_SECRET"
echo ""
echo -e "${GREEN}SESSION_SECRET${NC}="
echo "$SESSION_SECRET"
echo ""
echo -e "${GREEN}ML_SERVICE_API_KEY${NC}="
echo "$ML_SERVICE_API_KEY"
echo ""

# Write to file if specified
if [ -n "$ENV_FILE" ]; then
    echo -e "${BLUE}Writing secrets to ${ENV_FILE}...${NC}"

    # Check if file exists
    if [ -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}Warning: ${ENV_FILE} already exists.${NC}"
        read -p "Do you want to append to it? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Aborted.${NC}"
            exit 1
        fi
    fi

    # Append secrets to file
    {
        echo ""
        echo "# Generated Secrets - $(date '+%Y-%m-%d %H:%M:%S')"
        echo "# IMPORTANT: Keep this file secure and never commit to version control"
        echo "JWT_SECRET=$JWT_SECRET"
        echo "SESSION_SECRET=$SESSION_SECRET"
        echo "ML_SERVICE_API_KEY=$ML_SERVICE_API_KEY"
    } >> "$ENV_FILE"

    echo -e "${GREEN}Secrets written to ${ENV_FILE}${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Security Reminders:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "1. Never commit .env files to version control"
echo "2. Use different secrets for development and production"
echo "3. Store production secrets in a secure secrets manager"
echo "4. Rotate secrets periodically (recommended: every 90 days)"
echo "5. JWT_SECRET must be at least 32 characters long"
echo ""
echo -e "${GREEN}Add these to your .env file or environment variables.${NC}"
echo ""
