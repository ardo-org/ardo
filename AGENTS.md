# claudio Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-28

## Active Technologies

### Core Technologies
- **Deno (latest stable)** - Runtime environment and toolkit
- **TypeScript** - Primary development language
- **Deno Standard Library** - HTTP server, utilities, testing

### Key Dependencies
- **GitHub Copilot API** - AI code completion service
- **OAuth 2.0 Device Flow** - Authentication with GitHub
- **HTTP/2** - Proxy server protocol support
- **JSON-RPC** - API communication format

### Platform Integration
- **Cross-platform binaries** - macOS (arm64/x64), Linux (x64/arm64), Windows (x64)
- **NPM distribution** - Node.js package manager integration
- **JSR registry** - Deno package distribution
- **GitHub Actions** - CI/CD and automation

### Architecture Patterns
- **Proxy server pattern** - Request/response translation
- **Command pattern** - CLI interface design
- **OAuth device flow** - Secure authentication
- **Stateless design** - No persistent state management

## Project Structure

```text
src/
├── cli/              # Command-line interface
│   ├── main.ts      # Main entry point
│   ├── launch.ts    # Claude Code launcher
│   ├── session.ts   # Session management
│   └── auth.ts      # Authentication handling
├── server/          # Proxy server implementation
│   ├── router.ts    # Request routing and handling
│   ├── server.ts    # HTTP server setup
│   ├── transform.ts # Request/response transformation
│   ├── copilot.ts   # GitHub Copilot integration
│   ├── types.ts     # Server type definitions
│   └── mod.ts       # Module exports
├── auth/            # Authentication modules
│   ├── copilot.ts   # GitHub Copilot OAuth flow
│   └── mod.ts       # Authentication exports
├── copilot/         # GitHub Copilot API integration
│   ├── client.ts    # API client implementation
│   ├── models.ts    # Data models
│   ├── token.ts     # Token management
│   ├── types.ts     # Type definitions
│   └── mod.ts       # Module exports
├── lib/             # Shared utilities
│   ├── errors.ts    # Error handling utilities
│   └── token.ts     # Token utilities
└── version.ts       # Version information

tests/
├── contract/        # Contract tests for external interfaces
├── integration/     # Integration tests
└── unit/           # Unit tests

scripts/
└── docs/           # Documentation automation scripts

.github/
└── workflows/      # GitHub Actions CI/CD
```

## Contribution Workflow

### Getting Started
1. **Fork and clone** the repository
2. **Create feature branch** from main: `git checkout -b feature/your-feature-name`
3. **Install Deno** if not already available (see README for instructions)
4. **Run quality checks** to ensure environment works: `deno task quality`

### Development Process
1. **Write failing tests first** (TDD approach) in appropriate test directory
2. **Implement feature** following the code style guidelines above
3. **Update documentation** if API or behavior changes
4. **Run quality gates** before committing: `deno task quality`
5. **Commit with clear message** following conventional commit format

### Quality Requirements
- ✅ **All tests pass** - `deno test`
- ✅ **Linting passes** - `deno lint`
- ✅ **Formatting correct** - `deno fmt --check`
- ✅ **Type checking passes** - `deno check`
- ✅ **Documentation updated** if needed
- ✅ **Constitutional compliance** verified

### Pull Request Process
1. **Create PR** with clear title and description
2. **Link to issue** if addressing existing issue
3. **Add tests** that demonstrate the fix/feature
4. **Update CHANGELOG** if user-facing changes
5. **Request review** from maintainers
6. **Address feedback** and update as needed

### Testing Strategy
- **Contract tests** - Test external interfaces and API contracts
- **Integration tests** - Test component interactions
- **Unit tests** - Test individual functions and modules
- **Manual testing** - Verify user experience for CLI changes

### Review Criteria
- ✅ **Constitutional alignment** - Follows project principles
- ✅ **Code quality** - Readable, maintainable, well-tested
- ✅ **Performance** - No unnecessary performance degradation
- ✅ **Security** - No security vulnerabilities introduced
- ✅ **Documentation** - Clear and up-to-date

## Code Style Guidelines

### TypeScript Standards
- **Strict mode enabled** - All TypeScript strict checks required
- **Explicit types** - Prefer explicit type annotations over inference where clarity helps
- **Interface over type** - Use interfaces for object shapes, types for unions/primitives
- **Const assertions** - Use `as const` for immutable data structures

### Naming Conventions
- **Files**: kebab-case (e.g., `validate-request.ts`)
- **Directories**: kebab-case (e.g., `auth/`, `server/`)
- **Classes**: PascalCase (e.g., `CopilotClient`)
- **Functions/variables**: camelCase (e.g., `validateRequest`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces**: PascalCase with descriptive names (e.g., `AuthenticationResult`)

### Code Organization
- **Single responsibility** - Each module/function has one clear purpose
- **Dependency injection** - Prefer explicit dependencies over global state
- **Error handling** - Use Result types or explicit error handling, avoid throwing
- **Immutability** - Prefer immutable data structures and pure functions
- **Modular exports** - Use `mod.ts` files for clean module boundaries

### Deno-Specific Practices
- **Import maps** - Use import maps in `deno.json` for path management
- **Permissions** - Explicit permissions in scripts, minimal required permissions
- **Standard library** - Prefer Deno std library over third-party packages
- **Web standards** - Use web platform APIs when available
- **URL imports** - Pin versions for external dependencies

### Documentation Standards
- **JSDoc comments** - Document public APIs and complex logic
- **README updates** - Keep documentation current with code changes
- **Type documentation** - Document complex type relationships
- **Example usage** - Include examples for public APIs

## Development Commands

### Core Development
```bash
# Start development server with file watching
deno task dev

# Run the CLI in development mode
deno run -A src/cli/main.ts [args...]

# Type check all source files
deno check src/**/*.ts tests/**/*.ts
```

### Quality Assurance
```bash
# Run all quality checks (recommended before commit)
deno task quality

# Individual quality commands
deno lint                    # Lint all TypeScript files
deno fmt                     # Format all files
deno fmt --check            # Check formatting without modifying
deno check src/**/*.ts      # Type check source files
```

### Testing
```bash
# Run all tests
deno test --allow-all

# Run specific test types
deno test tests/unit/       # Unit tests only
deno test tests/contract/   # Contract tests only
deno test tests/integration/ # Integration tests only

# Run tests with coverage
deno test --coverage=coverage --allow-all
deno coverage coverage      # Generate coverage report
```

### Building and Distribution
```bash
# Compile native binary for current platform
deno task compile

# Sync version across all distribution artifacts
deno task sync-version

# Build for multiple platforms (if configured)
deno task build-all
```

### Utilities
```bash
# Check for outdated dependencies
deno cache --reload src/cli/main.ts

# Generate import map
deno info src/cli/main.ts

# Bundle for analysis
deno bundle src/cli/main.ts bundle.js
```

### Documentation
```bash
# Validate documentation
deno run -A scripts/docs/validate.ts README.md AGENTS.md

# Generate API documentation
deno doc src/mod.ts

# Apply progressive disclosure to markdown
deno run -A scripts/docs/generate-disclosure.ts README.md
```

## Recent Changes

- **2026-03-08**: Enhanced AGENTS.md with comprehensive development guidelines
  - Added detailed project structure documentation
  - Updated technology stack with current dependencies
  - Added code style guidelines and naming conventions
  - Documented contribution workflow and testing strategy
  - Added comprehensive development command reference

- **Previous changes**: Auto-generated from feature plans
  - 003-anthropic-proxy: Added Deno + TypeScript + GitHub Copilot SDK
  - 002-secure-token-storage: Added secure token handling
  - 001-copilot-auth: Added GitHub Copilot authentication integration

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
