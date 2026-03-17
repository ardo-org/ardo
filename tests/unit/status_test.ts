import { assertEquals, assertStringIncludes } from "@std/assert";
import { formatStatus } from "../../src/service/status.ts";
import type { ServiceState } from "../../src/service/status.ts";

function baseState(overrides: Partial<ServiceState>): ServiceState {
  return {
    running: false,
    serviceInstalled: false,
    pid: null,
    port: 11434,
    authStatus: "authenticated",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Service line
// ---------------------------------------------------------------------------

Deno.test("formatStatus — service not installed shows 'Not installed'", () => {
  const out = formatStatus(baseState({ serviceInstalled: false }), []);
  assertStringIncludes(out, "Service:  Not installed");
});

Deno.test("formatStatus — service installed shows 'Installed'", () => {
  const out = formatStatus(baseState({ serviceInstalled: true }), []);
  assertStringIncludes(out, "Service:  Installed");
});

// ---------------------------------------------------------------------------
// State line
// ---------------------------------------------------------------------------

Deno.test("formatStatus — not installed, not running → State: Not running", () => {
  const out = formatStatus(
    baseState({ serviceInstalled: false, running: false }),
    [],
  );
  assertStringIncludes(out, "State:    Not running");
});

Deno.test("formatStatus — installed, stopped → State: Stopped", () => {
  const out = formatStatus(
    baseState({ serviceInstalled: true, running: false }),
    [],
  );
  assertStringIncludes(out, "State:    Stopped");
});

Deno.test("formatStatus — service running → State: Running at http://localhost:<port>", () => {
  const out = formatStatus(
    baseState({ serviceInstalled: true, running: true, port: 11434 }),
    [],
  );
  assertStringIncludes(out, "State:    Running at http://localhost:11434");
});

Deno.test("formatStatus — daemon running (no service) → State: Running at http://localhost:<port>", () => {
  const out = formatStatus(
    baseState({ serviceInstalled: false, running: true, port: 8080 }),
    [],
  );
  assertStringIncludes(out, "State:    Running at http://localhost:8080");
});

// ---------------------------------------------------------------------------
// Agents line
// ---------------------------------------------------------------------------

Deno.test("formatStatus — no agents configured → Agents: none", () => {
  const out = formatStatus(baseState({}), []);
  assertStringIncludes(out, "Agents:   none");
});

Deno.test("formatStatus — agents list rendered comma-separated", () => {
  const out = formatStatus(baseState({}), ["claude-code", "cline"]);
  assertStringIncludes(out, "Agents:   claude-code, cline");
});

Deno.test("formatStatus — single agent rendered without trailing comma", () => {
  const out = formatStatus(baseState({}), ["codex"]);
  assertStringIncludes(out, "Agents:   codex");
});

// ---------------------------------------------------------------------------
// Copilot line
// ---------------------------------------------------------------------------

Deno.test("formatStatus — authenticated shows Authenticated", () => {
  const out = formatStatus(baseState({ authStatus: "authenticated" }), []);
  assertStringIncludes(out, "Copilot:  Authenticated");
});

Deno.test("formatStatus — unauthenticated shows Not authenticated", () => {
  const out = formatStatus(baseState({ authStatus: "unauthenticated" }), []);
  assertStringIncludes(out, "Copilot:  Not authenticated");
});

Deno.test("formatStatus — unknown auth shows Unknown", () => {
  const out = formatStatus(baseState({ authStatus: "unknown" }), []);
  assertStringIncludes(out, "Copilot:  Unknown");
});

// ---------------------------------------------------------------------------
// Overall structure
// ---------------------------------------------------------------------------

Deno.test("formatStatus — output contains all four label lines", () => {
  const state = baseState({
    serviceInstalled: true,
    running: true,
    port: 11434,
    authStatus: "authenticated",
  });
  const out = formatStatus(state, ["claude-code"]);
  const lines = out.split("\n");
  assertEquals(lines.length, 4);
  assertStringIncludes(lines[0], "Service:");
  assertStringIncludes(lines[1], "State:");
  assertStringIncludes(lines[2], "Agents:");
  assertStringIncludes(lines[3], "Copilot:");
});
