---
status: complete
created: 2026-03-21
priority: critical
tags:
- rename
- branding
- cli
- docs
- migration
- release
created_at: 2026-03-21T02:07:34.078975Z
updated_at: 2026-03-21T02:40:00.822767Z
completed_at: 2026-03-21T02:40:00.822767Z
transitions:
- status: complete
  at: 2026-03-21T02:40:00.822767Z
---

# Project Rename: Coco to Ardo

## Overview

Rename the project identity from Coco to Ardo across source code, CLI surface area, repository metadata, documentation, build and release assets, and brand artifacts. The migration must be safe, reversible where practical, and operationally compatible for existing users during a defined transition window.

## Summary

This spec defines a full-scope rename from `Coco`/`coco` to `Ardo`/`ardo`, including organizational references now under `ardo-org`. It covers code-level identifiers, command-line interfaces, config and environment variable migration, package and distribution updates, documentation and branding refresh, and publish-time communication assets such as changelog and migration guidance.

## Motivation

The project has moved to a new brand and organizational identity. Keeping mixed naming introduces user confusion, installation friction, and operational risk (broken scripts, stale docs, mismatched package names, and invalid links). A coordinated rename ensures consistency across developer experience, release channels, and public-facing assets while protecting current users through compatibility and migration guidance.

## Requirements

- [x] **R-001 Name Canonicalization**: Replace all first-party references to `Coco`/`coco` with `Ardo`/`ardo` across source, docs, scripts, and metadata except where historical context is explicitly required.
- [x] **R-002 CLI Primary Command**: CLI entrypoint command must be `ardo` and all help text, examples, and diagnostics must show `ardo` as canonical.
- [x] **R-003 Backward Compatibility Alias**: Provide optional compatibility path for `coco` command invocation that delegates to `ardo` with a clear deprecation warning and sunset timeline.
- [x] **R-004 Binary and Service Identity**: Update binary names, daemon/service labels, process names, and runtime identifiers to `ardo`.
- [x] **R-005 Internal Identifiers**: Rename relevant package/module symbols, constants, and generated identifiers that encode the old name when safe to do so.
- [x] **R-006 GitHub Organization References**: Replace GitHub organization references with `ardo-org` in all docs, workflows, URLs, and badges.
- [x] **R-007 Repository and URL Integrity**: Update repository name references, clone/install links, badges, social links, and docs cross-links; verify no broken URLs remain.
- [x] **R-008 GitHub Templates and Automation**: Update issue templates, PR templates, and CI/workflow text or logic that references `Coco`.
- [x] **R-009 Documentation Rename Completion**: Update all project docs (README, docs/, specs references where appropriate) to use Ardo terminology and accurate examples.
- [x] **R-010 Conceptual and Diagram Alignment**: Update architecture diagrams and conceptual explanations to reflect Ardo naming and current org/repo context.
- [x] **R-011 CLI and Config Examples**: Update all installation and usage examples from `coco` to `ardo`, including command snippets and sample outputs.
- [x] **R-012 Config Directory Migration**: Default config/state path must move from `~/.coco` to `~/.ardo`.
- [x] **R-013 Config Fallback and Migration**: Implement fallback resolution and/or one-time migration logic for existing `~/.coco` data with non-destructive behavior.
- [x] **R-014 Environment Variable Migration**: Introduce `ARDO_*` environment variables as canonical and provide compatibility behavior for existing `COCO_*` variables during transition.
- [x] **R-015 Warning and Telemetry Messaging**: Where old command/env/config paths are used, emit concise migration guidance in warnings/logs without hard-failing existing flows during compatibility window.
- [x] **R-016 Branding Assets**: Replace logos, icons, naming marks, and visible brand strings with Ardo assets.
- [x] **R-017 Visual System Update**: Update brand palette, typography references, and social preview metadata used by website/repository assets.
- [x] **R-018 Distribution Identity**: Update package/distribution names and install metadata where required (npm package scope/name, binary artifact names, installers, checksums, release notes).
- [x] **R-019 Legacy Package Handling**: For old package names/channels, provide deprecation notices, redirects, or compatibility stubs where ecosystem constraints allow.
- [x] **R-020 Changelog Entry**: Add a changelog entry documenting rename scope, compatibility behavior, and migration deadlines.
- [x] **R-021 Migration Guide**: Add `MIGRATION.md` at repository root with rationale, before/after mapping, CLI/config/env updates, and explicit upgrade steps.
- [x] **R-022 Build and Runtime Safety**: Project must build, install, and run under Ardo naming without functional regression.
- [x] **R-023 Link and Command Validation**: Validate docs commands and external links after rename; no stale `coco` commands/URLs in active docs except in migration-history sections.

## Non-Goals

- Re-architecting proxy/runtime behavior unrelated to naming migration.
- Introducing new product features unrelated to rename.
- Retroactively rewriting immutable historical artifacts (old release notes, external blog posts) beyond adding references/redirects.
- Breaking existing user workflows without a documented migration path.

## Technical Notes

### Suggested Workstreams

| Workstream | Scope | Primary Outputs |
| --- | --- | --- |
| Source and CLI | Entrypoints, command text, errors, service identifiers | Renamed binaries/commands with compatibility alias |
| Config and Env | Config paths, keys, env var prefixes, migration hooks | `~/.ardo`, `ARDO_*`, fallback support |
| Docs and Site | README, docs, site, examples, diagrams | Ardo-first docs and updated visuals |
| GitHub and Automation | org/repo URLs, templates, CI metadata | Valid `ardo-org` references and working workflows |
| Distribution and Release | package names, artifacts, release process | Ardo-branded publish pipeline and migration notices |

### Compatibility Strategy

- Define a transition window where `coco` command and `COCO_*` env vars remain accepted.
- Emit deprecation warnings with exact replacement (`coco` -> `ardo`, `COCO_*` -> `ARDO_*`).
- Keep migration behavior idempotent and non-destructive for config data.

### Inventory and Validation Strategy

- Create a searchable rename inventory for code, docs, workflows, and assets.
- Classify each match as: `must-rename`, `keep-for-history`, or `compatibility-alias`.
- Run automated checks for stale names in active paths before release cut.


### Child Spec Decomposition

This umbrella is implemented through the following child specs:

- `015-ardo-rename-core-runtime-cli` -- CLI command surface, runtime identifiers, service labels, and compatibility alias behavior.
- `016-ardo-rename-config-env-migration` -- config directory migration, env variable migration, fallback rules, and idempotent transition behavior.
- `017-ardo-rename-repo-docs-branding` -- GitHub org/repo references, documentation updates, workflow/templates text, and branding assets.
- `018-ardo-rename-distribution-release-migration-comms` -- package/distribution naming, release pipeline updates, changelog entry, and `MIGRATION.md`.

Umbrella completion is gated on all child specs reaching `complete` with their test checklists satisfied.

## Acceptance Criteria

- [x] **AC-001** All active first-party references are Ardo-branded; any remaining `Coco` references are intentional and documented.
- [x] **AC-002** `ardo` command is primary and fully functional across all documented flows.
- [x] **AC-003** If alias is enabled, `coco` invocation works and prints migration/deprecation guidance.
- [x] **AC-004** Config resolution prefers `~/.ardo` and safely supports migration from `~/.coco`.
- [x] **AC-005** `ARDO_*` variables are documented and functional; compatibility for `COCO_*` is documented.
- [x] **AC-006** Repository/docs links, badges, and org references resolve correctly to `ardo-org` and renamed repo endpoints.
- [x] **AC-007** Brand assets and social previews reflect Ardo identity.
- [x] **AC-008** Distribution channels publish/install under Ardo identity or provide clear deprecation/redirect behavior for legacy channels.
- [x] **AC-009** `MIGRATION.md` exists, is linked from README/changelog, and contains working before/after examples.
- [x] **AC-010** CI/test/build and install verification pass after rename with no naming-related breakage.

## Migration Notes

### Required Migration Artifacts

- Root `MIGRATION.md` with:
  - What changed
  - Why it changed
  - CLI mapping (`coco` -> `ardo`)
  - Config path mapping (`~/.coco` -> `~/.ardo`)
  - Env var mapping (`COCO_*` -> `ARDO_*`)
  - Import/package mapping where applicable
  - Before/after command and config examples
  - Compatibility timeline and removal target for legacy aliases
- Changelog section summarizing rename impact and upgrade actions.

### Example Mapping Table (to include in MIGRATION.md)

| Area | Before | After |
| --- | --- | --- |
| CLI command | `coco status` | `ardo status` |
| Config dir | `~/.coco/config.json` | `~/.ardo/config.json` |
| Env vars | `COCO_HOST`, `COCO_PORT` | `ARDO_HOST`, `ARDO_PORT` |
| Service label | `coco` service | `ardo` service |

## Plan

- [x] Confirm all child specs are linked and scoped without overlap gaps.
- [x] Sequence child implementation where dependencies exist (e.g., CLI/config before migration docs finalization).
- [x] Track each child through implementation and test completion.
- [x] Reconcile cross-child naming inventory and resolve conflicts.
- [x] Run umbrella-level validation (global grep checks, full build/test, install smoke tests).
- [x] Mark umbrella complete only when all child acceptance criteria are satisfied.

## Test

- [x] Search-based verification shows no unintended `Coco`/`coco` references in active files.
- [x] CLI tests cover `ardo` command paths and compatibility alias behavior (if enabled).
- [x] Config migration tests verify first-run migration, fallback, and idempotency.
- [x] Env var tests verify `ARDO_*` precedence and `COCO_*` compatibility behavior.
- [x] Docs validation confirms command snippets and URLs are current and functional.
- [x] Release dry-run validates artifact names and package metadata.

## Notes

This is a cross-cutting change with high blast radius. Implementation should prefer staged roll-out with compatibility safeguards and explicit communication to users. Historical references to Coco may remain only where needed for migration context and release history.