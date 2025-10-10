# Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This leads to more readable messages that are easy to follow when looking through the project history and enables automatic generation of changelogs.

## Commit Message Format

Each commit message consists of a **header**, an optional **body**, and an optional **footer**.

```markdown
<type>(<scope>): <subject>

<body>

<footer>
```

### Header

The header is mandatory and must conform to the following format:

```markdown
<type>(<scope>): <subject>
```

- **type**: Must be one of the following:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation only changes
  - `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
  - `refactor`: A code change that neither fixes a bug nor adds a feature
  - `perf`: A code change that improves performance
  - `test`: Adding missing tests or correcting existing tests
  - `build`: Changes that affect the build system or external dependencies
  - `ci`: Changes to our CI configuration files and scripts
  - `chore`: Other changes that don't modify src or test files
  - `revert`: Reverts a previous commit

- **scope**: Optional. The scope should be the name of the package/module affected (e.g., `eth`, `pubsub`, `reqresp`, `host`, etc.)

- **subject**: A short summary of the code changes
  - Use the imperative, present tense: "change" not "changed" nor "changes"
  - Don't capitalize the first letter
  - No period (.) at the end

### Body

The body is optional. When used, it should:

- Explain the motivation for the change
- Contrast this with previous behavior
- Use the imperative, present tense

### Footer

The footer is optional and can contain:

- Breaking changes (prefixed with `BREAKING CHANGE:`)
- Issue references (e.g., `Closes #123`, `Fixes #456`)

## Examples

### Simple feature addition

```markdown
feat(eth): add support for blob sidecars
```

### Bug fix with scope

```markdown
fix(pubsub): handle nil pointer in message validation

Prevent panic when validating messages with missing fields
by adding proper nil checks before accessing nested structures.

Fixes #789
```

### Breaking change

```markdown
feat(api): change response format for beacon blocks

BREAKING CHANGE: The beacon block response now returns a versioned
structure instead of the raw block data. Clients will need to update
their parsing logic.
```

### Documentation update

```markdown
docs: update README with new installation instructions
```

### Multiple issues

```markdown
fix(eth): correct attestation subnet calculation

- Fix off-by-one error in subnet index calculation
- Add bounds checking for committee indices
- Update tests to cover edge cases

Fixes #123, #456
```

## Validation

Commit messages are automatically validated using [Cocogitto](https://github.com/cocogitto/cocogitto) when you commit. The validation ensures:

1. The type is one of the allowed types
2. The subject is present and not empty
3. The format follows the conventional commits specification

If your commit message doesn't meet these requirements, the commit will be rejected with an error message explaining what needs to be fixed.

## Tips

1. **Keep the subject line under 50 characters** - This ensures readability in various git tools
2. **Use the body for the "why", not the "what"** - The code shows what changed, the commit message should explain why
3. **Reference issues** - Always reference related issues in the footer when applicable
4. **Atomic commits** - Each commit should represent one logical change

## Tools

To make writing conventional commits easier, you can use the Cocogitto CLI:

```bash
# Create a commit interactively
cog commit

# Or specify type and message directly
cog commit feat "add new feature"
```

## Skip Validation

In rare cases where you need to skip validation (not recommended), you can use:

```bash
git commit --no-verify
```

However, this should be avoided as it breaks the consistency of the project's commit history.
