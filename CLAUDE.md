# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## LLM Rules System

This repository contains coding standards and best practices that you MUST follow. Before starting any work, YOU MUST check the relevant rules by using the script below.

### Getting Contextual Rules

When working on a file, run the `get_llm_rules.sh` script to get relevant coding guidelines based on the context:

```bash
# To get all rules:
./scripts/get_llm_rules.sh

# Example: context-specific rules:
./scripts/get_llm_rules.sh frontend
./scripts/get_llm_rules.sh backend
./scripts/get_llm_rules.sh api
./scripts/get_llm_rules.sh charts
```

This script dynamically discovers and filters rules based on:
1. File name matches (e.g. frontend, backend)
2. Description matches
3. Content matches
4. Glob pattern matches

**IMPORTANT**: When starting work on a file, always run this script with the most relevant context for the file you're working with. For example:
- For React components: `./scripts/get_llm_rules.sh frontend`
- For Go backend: `./scripts/get_llm_rules.sh backend`
- For chart components: `./scripts/get_llm_rules.sh charts`
- For API work: `./scripts/get_llm_rules.sh api`

## Development Server
The development server runs at:
- localhost:5173

## Claude Code Guidelines
- Do not run `npm build` commands unless explicitly requested. 
- If making a frontend change, you should use puppeteer to test the change, pointing at the development server.
  - Make sure you test against both desktop and mobile sizes.
- You MUST NOT provide "fallback" or "defaults" values in the code you write. This is a very dangerous practice that can lead to bugs, poor user experiences, and security issues.