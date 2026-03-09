# Claudio

**GitHub Copilot bridge for Claude Code** — Use GitHub Copilot's API through Claude's interface.

Claudio acts as a proxy server that translates Claude Code's API calls to GitHub Copilot's format, allowing you to leverage your existing GitHub Copilot subscription with Claude's superior user experience.

## Features

- 🔗 **Seamless Integration** — Use Claude Code with your existing GitHub Copilot subscription
- 🚀 **Zero Configuration** — Automatically handles authentication and proxy setup
- 🌐 **Cross-Platform** — Works on macOS, Linux, and Windows
- ⚡ **Native Performance** — Compiled binaries for optimal speed
- 🔄 **Stream Support** — Real-time streaming responses from GitHub Copilot
- 📦 **Multiple Install Methods** — npm, Homebrew, Deno, mise, or direct download

## How It Works

1. **Authentication** — Claudio authenticates with GitHub using OAuth device flow
2. **Proxy Server** — Starts a local proxy server that translates API calls
3. **Bridge** — Claude Code requests → Claudio proxy → GitHub Copilot API
4. **Response** — GitHub Copilot responses → Claudio proxy → Claude Code

## Prerequisites

- **GitHub Copilot subscription** — Individual, Business, or Enterprise
- **Claude Code** — Download from [Claude's website](https://claude.ai/claude-code)

## Installation

### npm (Recommended)

**Node.js ≥18 required, no Deno installation needed**

```bash
npm install -g claudio
```

The npm package automatically downloads the native binary for your platform. Supported platforms:

| OS      | Architecture | Status |
|---------|--------------|--------|
| macOS   | arm64        | ✅     |
| macOS   | x64          | ✅     |
| Linux   | x64          | ✅     |
| Linux   | arm64        | ✅     |
| Windows | x64          | ✅     |

### Direct Binary Download

Download platform-specific binaries from [GitHub Releases](https://github.com/myty/claudio/releases):

<details>
<summary>macOS Installation</summary>

```bash
# Apple Silicon (M1/M2/M3)
curl -Lo claudio https://github.com/myty/claudio/releases/latest/download/claudio-macos-arm64
chmod +x claudio
sudo mv claudio /usr/local/bin/

# Intel Macs
curl -Lo claudio https://github.com/myty/claudio/releases/latest/download/claudio-macos-x64
chmod +x claudio
sudo mv claudio /usr/local/bin/
```

**macOS Gatekeeper Notice:** You may need to remove the quarantine flag:
```bash
xattr -d com.apple.quarantine ./claudio
```

</details>

<details>
<summary>Linux Installation</summary>

```bash
# x64 (most common)
curl -Lo claudio https://github.com/myty/claudio/releases/latest/download/claudio-linux-x64
chmod +x claudio
sudo mv claudio /usr/local/bin/

# ARM64 (Raspberry Pi, Apple Silicon Linux)
curl -Lo claudio https://github.com/myty/claudio/releases/latest/download/claudio-linux-arm64
chmod +x claudio
sudo mv claudio /usr/local/bin/
```

</details>

### JSR (Deno Runtime)

**Requires [Deno](https://deno.land) to be installed**

```bash
# Install globally
deno install -A -g jsr:@myty/claudio

# Or run directly without installing
deno run -A jsr:@myty/claudio --version
```

### mise (Version Manager)

```bash
mise use -g claudio@0.1.0
```

Or add to your `.mise.toml`:

```toml
[tools]
claudio = "0.1.0"
```

## Usage

### Basic Usage

```bash
# Start Claudio (launches Claude Code with proxy)
claudio

# Pass options to Claude Code
claudio --dark-mode
claudio --verbose

# Resume a specific session
claudio --resume <session-id>
```

### Command Line Options

```
claudio [OPTIONS] [CLAUDE_ARGS...]

Options:
  --help       Show this help message
  --version    Show version information
  --server     Start the proxy server (default)

Any options not listed above are forwarded verbatim to Claude Code.
```

### First Run

1. **Run Claudio**: `claudio`
2. **Authenticate**: Follow the GitHub OAuth flow in your browser
3. **Start Coding**: Claude Code will launch automatically with GitHub Copilot backend

### Session Management

Claudio automatically manages sessions and will display the session ID when you exit:

```bash
Run `claudio --resume abc123` to resume.
```

## Troubleshooting

<details>
<summary>Common Issues</summary>

### "Claude Code not found"
- Install Claude Code from [claude.ai/claude-code](https://claude.ai/claude-code)
- Ensure it's in your PATH or default installation location

### "Authentication failed"
- Verify you have an active GitHub Copilot subscription
- Check your internet connection
- Try clearing stored credentials and re-authenticating

### "Connection refused"
- Ensure no other processes are using the proxy port
- Check firewall settings
- Try restarting Claudio

### macOS "Cannot open" error
- Run `xattr -d com.apple.quarantine claudio` to remove quarantine
- Or use "Open" from right-click context menu first time

</details>

## Development

Want to contribute? Here's how to get started:

```bash
# Clone the repository
git clone https://github.com/myty/claudio.git
cd claudio

# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# Run in development mode
deno task dev

# Run quality checks (lint + format + typecheck + tests)
deno task quality

# Compile native binary
deno task compile

# Sync version across all artifacts
deno task sync-version
```

### Project Structure

```
src/
├── cli/          # Command-line interface
├── server/       # Proxy server and routing
├── auth/         # GitHub OAuth authentication
├── copilot/      # GitHub Copilot API integration
└── lib/          # Shared utilities
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

## Acknowledgments

- **Anthropic** for Claude Code
- **GitHub** for Copilot API
- **Deno** for the excellent runtime and tooling
