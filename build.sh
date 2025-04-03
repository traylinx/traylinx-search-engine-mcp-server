#!/bin/bash
set -e

echo "==== Starting build process for Traylinx Search Engine MCP Server ===="

# Install dependencies
echo "Installing dependencies..."
npm ci || npm install

# Build TypeScript code
echo "Building TypeScript code..."
npm run build

echo "Build completed successfully!" 