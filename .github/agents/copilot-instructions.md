# claudio Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-07

## Active Technologies
- Deno 2.7.x, TypeScript strict mode + `@cliffy/ansi` (existing), `@std/fmt` (existing) — no new deps (009-install-autostart)
- Plist at `~/Library/LaunchAgents/com.coco.plist` (macOS), unit file at `~/.config/systemd/user/coco.service` (Linux) (009-install-autostart)

- Deno (latest stable) + TypeScrip + Deno std/http, @github/copilot-sdk (no new
  deps) (007-ux-improvements)
- Platform secure token storage (Keychain/Credential Manager/Secret Service)
  (007-ux-improvements)

- Deno 2.x + TypeScrip + None (zero runtime deps; Deno std lib only)
  (006-release-distribution)
- `deno.json` (version source of truth), `src/version.ts`
  (006-release-distribution)

- Deno (latest stable) + TypeScrip + Deno std/http (existing), native `fetch`
  (built-in — no new deps) (004-remove-copilot-sdk)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for Deno (latest stable) + TypeScrip

## Code Style

Deno (latest stable) + TypeScrip: Follow standard conventions

## Recent Changes
- 009-install-autostart: Added Deno 2.7.x, TypeScript strict mode + `@cliffy/ansi` (existing), `@std/fmt` (existing) — no new deps

- 007-ux-improvements: Added Deno (latest stable) + TypeScrip + Deno std/http,
  @github/copilot-sdk (no new deps)

- 006-release-distribution: Added Deno 2.x + TypeScrip + None (zero runtime
  deps; Deno std lib only)

  (existing), native `fetch` (built-in — no new deps)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
