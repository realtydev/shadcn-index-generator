#!/bin/bash

# Make this script executable
chmod +x "$0"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Installing dependencies...${NC}"
npm install

echo -e "${BLUE}Building the package...${NC}"
npm run build

echo -e "${BLUE}Linking package for local use...${NC}"
npm link

echo -e "${GREEN}✅ shadcn-index-generator has been successfully set up!${NC}"
echo -e "You can now run ${BLUE}shadcn-index-generator --help${NC} to see available commands."
echo
echo -e "To test it on your project, run:"
echo -e "${BLUE}shadcn-index-generator path/to/components/ui${NC}"
echo
echo -e "To publish to npm, run:"
echo -e "${BLUE}npm login${NC}"
echo -e "${BLUE}npm publish${NC}"
