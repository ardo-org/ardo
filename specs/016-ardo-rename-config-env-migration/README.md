---
status: complete
created: 2026-03-21
priority: critical
tags:
- rename
- config
- environment
- migration
parent: 014-coco-to-ardo-rename
created_at: 2026-03-21T02:09:18.091392Z
updated_at: 2026-03-21T02:20:19.308913Z
completed_at: 2026-03-21T02:20:19.308913Z
transitions:
- status: in-progress
  at: 2026-03-21T02:17:41.128297Z
- status: complete
  at: 2026-03-21T02:20:19.308913Z
---

# Ardo Rename Child: Config and Environment Migration

## Overview

Migrate configuration and environment variable conventions from Coco to Ardo while preserving existing users through fallback and compatibility behavior.

## Design

This child spec owns filesystem and process configuration transitions:

- default path migration from `~/.coco` to `~/.ardo`
- compatibility read path for legacy configuration
- one-time or lazy migration logic with idempotent behavior
- environment variable migration from `COCO_*` to `ARDO_*`
- precedence and warning semantics when both old and new variables are present

## Plan

- [x] Define config path migration policy (`copy`, `move`, or lazy fallback) and rollback behavior.
- [x] Implement default path resolution to `~/.ardo`.
- [x] Implement compatibility handling for existing `~/.coco` state.
- [x] Add canonical `ARDO_*` variables and compatibility behavior for `COCO_*`.
- [x] Add user-facing warnings for legacy env/config usage.
- [x] Add migration-focused tests for idempotency and precedence.

## Test

- [x] Fresh install uses only `~/.ardo`.
- [x] Existing `~/.coco` users continue to function without data loss.
- [x] Migration path is idempotent across repeated runs.
- [x] `ARDO_*` precedence and `COCO_*` fallback behavior are validated in tests.

## Notes

Maps from umbrella requirements: R-001, R-012, R-013, R-014, R-015, R-022.

Implementation progress (2026-03-21):

- Canonical config directory moved to `~/.ardo` with optional env override `ARDO_CONFIG_DIR`.
- Legacy config support preserved via non-destructive copy migration from `~/.coco/config.json` when canonical file is missing.
- Legacy env fallback implemented with warnings:
  - `COCO_CONFIG_DIR` -> `ARDO_CONFIG_DIR`
  - `COCO_PORT` -> `ARDO_PORT`
  - `COCO_LOG_LEVEL` -> `ARDO_LOG_LEVEL`
  - `COCO_MODEL_MAPPING_POLICY` -> `ARDO_MODEL_MAPPING_POLICY`
- Runtime state files migrated to canonical Ardo locations:
  - PID file: `~/.ardo/ardo.pid` (legacy read/cleanup for `~/.coco/coco.pid`)
  - Log file: `~/.ardo/ardo.log` (read fallback to legacy `~/.coco/coco.log`)
- Service manager generated log destinations updated to Ardo log path.
- Verified with targeted tests:
  - `tests/unit/config-store_test.ts`
  - `tests/unit/autostart_test.ts`
  - `tests/unit/managers/daemon_test.ts`
  - `tests/contract/cli_interface_test.ts`
  - `tests/contract/cli_test.ts`