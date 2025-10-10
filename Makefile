.PHONY: default generate-api dev build test clean install

# Default target
default: generate-api

# Generate API client from OpenAPI spec
generate-api:
	pnpm generate:api

# Start development server
dev:
	pnpm dev

# Build for production
build:
	pnpm build

# Run tests
test:
	pnpm test

# Type check
typecheck:
	pnpm typecheck

# Lint code
lint:
	pnpm lint

# Format code
format:
	pnpm format

# Clean build artifacts
clean:
	pnpm clean

# Install dependencies
install:
	pnpm install

# Run Storybook
storybook:
	pnpm storybook

# Build Storybook
build-storybook:
	pnpm build-storybook
