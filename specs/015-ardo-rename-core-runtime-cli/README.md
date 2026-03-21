---
status: complete
created: 2026-03-21
priority: critical
tags:
- rename
- cli
- runtime
- service
parent: 014-coco-to-ardo-rename
created_at: 2026-03-21T02:09:18.081303Z
updated_at: 2026-03-21T02:16:14.233933Z
completed_at: 2026-03-21T02:16:14.233933Z
transitions:
- status: in-progress
  at: 2026-03-21T02:11:37.502843Z
- status: complete
  at: 2026-03-21T02:16:14.233933Z
---

# Ardo Rename Child: Core Runtime and CLI Surface

## Overview

Implement core codebase renaming from Coco to Ardo for runtime identifiers, CLI entrypoint, command output, and service/process naming. This child spec owns the executable surface area and command compatibility behavior.

## Design

This workstream focuses on source-level naming and runtime behavior that users invoke directly:

- canonical CLI command changes (`ardo`)
- optional `coco` alias compatibility path
- binary/service/process label renames
- user-facing help/version/error text updates
- internal identifiers that safely encode old naming

## Plan

- [x] Inventory runtime and CLI references to `coco`/`Coco` in source and tests.
- [x] Rename primary CLI entrypoint and command help text to `ardo`.
- [x] Update binary/service/process identifiers to Ardo naming.
- [x] Implement optional compatibility alias for `coco` command invocation.
- [x] Add deprecation warning with replacement guidance and sunset timeline.
- [x] Update runtime tests and contract tests for command/output changes.

## Test

- [x] `ardo` command passes existing core CLI workflows.
- [x] `coco` alias (if enabled) routes correctly and emits deprecation warning.
- [x] Version/help/error snapshots or assertions reflect Ardo naming.
- [x] Service lifecycle commands work with updated service labels.

## Notes

Maps from umbrella requirements: R-001, R-002, R-003, R-004, R-005, R-015, R-022.

Implementation progress (2026-03-21):

- Canonical CLI naming switched to `ardo` for help, version, and user-facing command guidance.
- Legacy command invocation warning added when process appears to be launched as `coco`.
- Service manager identities updated to Ardo labels (`ardo.service`, `com.ardo`, `ardo`) with binary fallback lookup order `ardo` then legacy `coco`.
- Dry-run service install paths now remain testable even without a globally installed binary.
- Legacy service-file detection retained for uninstall/isInstalled compatibility.
- Deno tasks updated to Ardo-first install/compile targets with explicit legacy tasks.
- Verified by contract and unit tests:
  - `tests/contract/cli_interface_test.ts`
  - `tests/contract/cli_test.ts`
  - `tests/contract/cli-install-service_test.ts`
  - `tests/unit/autostart_test.ts`
  - `tests/unit/managers/factory_test.ts`
  - `tests/unit/managers/daemon_test.ts`