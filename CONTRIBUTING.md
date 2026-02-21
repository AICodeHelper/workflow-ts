# Contributing to workflow-ts

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/your-org/workflow-ts.git
cd workflow-ts

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

## Project Structure

```
workflow-ts/
├── packages/
│   ├── core/           # Core runtime and types
│   ├── react/          # React bindings
│   └── testing/        # Testing utilities (planned)
├── examples/           # Example applications
├── docs/               # Documentation
└── package.json        # Root package.json
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Your Changes

- Write code following the existing style
- Add/update tests for your changes
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/core && pnpm test

# Type check
pnpm typecheck
```

### 4. Commit Your Changes

We use conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Adding/updating tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

Example:
```
feat(core): add snapshot/restore utilities for state persistence
```

### 5. Open a Pull Request

- Push your branch to your fork
- Open a PR against `main`
- Describe your changes and link any relevant issues

## Coding Standards

### TypeScript

- Use strict TypeScript (strict mode is enabled)
- Prefer explicit types over `any`
- Use discriminated unions for state machines
- Document public APIs with JSDoc

### Testing

- Write tests for new features
- Test edge cases and error conditions
- Use descriptive test names
- Keep tests focused and independent

### Code Style

- Use 2-space indentation
- Use semicolons
- Max line length: 100 characters
- Use `const` over `let` when possible
- Prefer named exports over default exports

## Adding a New Package

1. Create directory under `packages/`
2. Add `package.json` with proper dependencies
3. Add `tsconfig.json` extending root config
4. Update root `pnpm-workspace.yaml` if needed
5. Add package to root `package.json` workspaces

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments to public APIs
- Add examples for complex features
- Update type definitions for API changes

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- Questions about the API
- Discussion about architectural changes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
