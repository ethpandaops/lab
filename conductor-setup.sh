#!/bin/bash
set -e

echo "🚀 Setting up Lab workspace..."
echo ""

# Validate pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed."
    echo "   Please install pnpm globally first: npm install -g pnpm"
    exit 1
fi

echo "✅ pnpm is installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies with pnpm..."
pnpm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next step: Click 'Run' to start both the dev server and Storybook"
