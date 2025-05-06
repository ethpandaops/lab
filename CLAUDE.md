# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Always load and review all files in the `.cursor/rules/` directory to understand the codebase conventions and standards before making any changes.

## Development Server
The development server runs at:
- localhost:5173

## Claude Code Guidelines
- Do not run `npm build` commands unless explicitly requested. 
- If making a frontend change, you should use puppeteer to test the change, pointing at the development server.
  - Make sure you test against both desktop and mobile sizes.