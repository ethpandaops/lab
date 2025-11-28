.DEFAULT_GOAL := generate-api-types

.PHONY: generate-api-types

generate-api-types:
	@pnpm run generate:api
