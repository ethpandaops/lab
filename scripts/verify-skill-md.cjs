#!/usr/bin/env node
/**
 * SKILL.md Validator
 *
 * Validates that SKILL.md follows the Agent Skills format:
 * - Valid YAML frontmatter with required fields (name, description)
 * - Markdown body with content
 * - Proper file structure
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  const frontmatterText = match[1];
  const body = match[2];

  // Simple YAML parser for key: value pairs
  const frontmatter = {};
  const lines = frontmatterText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Validate SKILL.md content
 */
function validateSkillMd(content, filePath) {
  const errors = [];
  const warnings = [];

  // Check for frontmatter
  const parsed = parseFrontmatter(content);

  if (!parsed) {
    errors.push({
      message: 'Missing or invalid YAML frontmatter. Expected format: ---\\nname: ...\\ndescription: ...\\n---'
    });
    return { valid: false, errors, warnings };
  }

  const { frontmatter, body } = parsed;

  // Validate required fields
  if (!frontmatter.name) {
    errors.push({ message: 'Missing required field: name' });
  } else {
    // Validate name format (lowercase letters, numbers, hyphens)
    const nameRegex = /^[a-z0-9-]+$/;
    if (!nameRegex.test(frontmatter.name)) {
      errors.push({
        message: `Invalid name format: "${frontmatter.name}". Must be lowercase letters, numbers, and hyphens only.`
      });
    }
    if (frontmatter.name.length > 64) {
      errors.push({
        message: `Name too long: ${frontmatter.name.length} characters (max 64)`
      });
    }
  }

  if (!frontmatter.description) {
    errors.push({ message: 'Missing required field: description' });
  } else if (frontmatter.description.length < 10) {
    warnings.push({
      message: 'Description is very short. Consider adding more detail about when to use this skill.'
    });
  }

  // Check for unknown fields (warnings only)
  const allowedFields = ['name', 'description', 'license'];
  for (const key of Object.keys(frontmatter)) {
    if (!allowedFields.includes(key)) {
      warnings.push({
        message: `Unknown frontmatter field: ${key}. Only 'name', 'description', and 'license' are standard.`
      });
    }
  }

  // Validate body content
  if (!body || body.trim().length === 0) {
    errors.push({ message: 'Missing markdown body content' });
  } else {
    const trimmedBody = body.trim();

    // Check for title/header
    if (!trimmedBody.startsWith('#')) {
      warnings.push({
        message: 'Body should start with a main heading (# Title)'
      });
    }

    // Check body length (should be substantial but not excessive)
    const wordCount = trimmedBody.split(/\s+/).length;
    if (wordCount < 50) {
      warnings.push({
        message: `Body is quite short (${wordCount} words). Consider adding more detailed instructions.`
      });
    }
    if (wordCount > 5000) {
      warnings.push({
        message: `Body is very long (${wordCount} words). Consider splitting content into reference files.`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      name: frontmatter.name,
      description: frontmatter.description
    }
  };
}

/**
 * Main validation function
 */
function main() {
  const args = process.argv.slice(2);
  const skillPath = args[0] || './SKILL.md';

  // Resolve path
  const resolvedPath = path.resolve(skillPath);

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\n❌ Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Read file
  let content;
  try {
    content = fs.readFileSync(resolvedPath, 'utf-8');
  } catch (error) {
    console.error(`\n❌ Error: Could not read file: ${resolvedPath}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Validate
  const result = validateSkillMd(content, resolvedPath);

  // Output results
  console.log(`\n📋 Validating: ${path.relative(process.cwd(), resolvedPath)}`);
  console.log('='.repeat(60));

  if (result.metadata) {
    console.log(`\n✓ Name: ${result.metadata.name}`);
    console.log(`✓ Description: ${result.metadata.description.substring(0, 100)}${result.metadata.description.length > 100 ? '...' : ''}`);
  }

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      console.log(`   • ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.log(`   • ${warning.message}`);
    }
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('\n✅ SKILL.md is valid!');
  } else if (result.valid) {
    console.log('\n✅ SKILL.md is valid (with warnings)');
  } else {
    console.log('\n❌ SKILL.md has errors and needs to be fixed');
  }

  console.log('');
  process.exit(result.valid ? 0 : 1);
}

main();
