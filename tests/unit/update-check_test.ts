import { assertEquals } from "@std/assert";
import { join } from "@std/path";

// CLI_PATH is relative to this test file (tests/unit/)
const CLI_PATH = "../../cli/src/update-check.ts";
// deno.json is at repo root, two levels up from tests/unit/
const DENO_CONFIG = new URL("../../deno.json", import.meta.url).pathname
  .replace(/^\/([A-Za-z]:)/, "$1");

// Generate a subprocess script that uses dynamic import so that globalThis.fetch
// can be mocked before the module is loaded.
function makeScript(moduleUrl: string, preamble: string): string {
  return `${preamble}
const { maybeNotifyUpdate } = await import("${moduleUrl}");
await maybeNotifyUpdate();
`;
}

Deno.test("maybeNotifyUpdate — writes state file on first run", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "modmux_upd_test_" });
  try {
    const modmuxDir = join(tmp, ".modmux");
    await Deno.mkdir(modmuxDir, { recursive: true });

    const stateFile = join(modmuxDir, "update-check.json");
    let existsBefore = true;
    try {
      await Deno.stat(stateFile);
    } catch {
      existsBefore = false;
    }
    assertEquals(existsBefore, false);

    const moduleUrl = new URL(CLI_PATH, import.meta.url).href;
    const script = makeScript(
      moduleUrl,
      `globalThis.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ tag_name: "v0.4.1" }) });`,
    );
    const scriptPath = join(tmp, "run.ts");
    await Deno.writeTextFile(scriptPath, script);
    await new Deno.Command(Deno.execPath(), {
      args: ["run", "--allow-all", "--config", DENO_CONFIG, scriptPath],
      env: { HOME: tmp, USERPROFILE: tmp },
      stdout: "piped",
      stderr: "piped",
    }).output();

    let existsAfter = false;
    try {
      await Deno.stat(stateFile);
      existsAfter = true;
    } catch {
      // not written
    }
    assertEquals(existsAfter, true);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("maybeNotifyUpdate — silent on network failure", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "modmux_upd_test_" });
  try {
    const moduleUrl = new URL(CLI_PATH, import.meta.url).href;
    const script = makeScript(
      moduleUrl,
      `globalThis.fetch = () => Promise.reject(new Error("no network"));`,
    );
    const scriptPath = join(tmp, "run.ts");
    await Deno.writeTextFile(scriptPath, script);
    const result = await new Deno.Command(Deno.execPath(), {
      args: ["run", "--allow-all", "--config", DENO_CONFIG, scriptPath],
      env: { HOME: tmp, USERPROFILE: tmp },
      stdout: "piped",
      stderr: "piped",
    }).output();

    assertEquals(result.code, 0);
    const stderr = new TextDecoder().decode(result.stderr);
    assertEquals(stderr.includes("new version"), false);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("maybeNotifyUpdate — silent on malformed state file", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "modmux_upd_test_" });
  try {
    const modmuxDir = join(tmp, ".modmux");
    await Deno.mkdir(modmuxDir, { recursive: true });
    await Deno.writeTextFile(
      join(modmuxDir, "update-check.json"),
      "not json{{",
    );

    const moduleUrl = new URL(CLI_PATH, import.meta.url).href;
    const script = makeScript(
      moduleUrl,
      `globalThis.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ tag_name: "v0.4.1" }) });`,
    );
    const scriptPath = join(tmp, "run.ts");
    await Deno.writeTextFile(scriptPath, script);
    const result = await new Deno.Command(Deno.execPath(), {
      args: ["run", "--allow-all", "--config", DENO_CONFIG, scriptPath],
      env: { HOME: tmp, USERPROFILE: tmp },
      stdout: "piped",
      stderr: "piped",
    }).output();

    assertEquals(result.code, 0);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test(
  "maybeNotifyUpdate — skips network when checked within 24h, shows cached newer version",
  async () => {
    const tmp = await Deno.makeTempDir({ prefix: "modmux_upd_test_" });
    try {
      const modmuxDir = join(tmp, ".modmux");
      await Deno.mkdir(modmuxDir, { recursive: true });

      const recentTimestamp = new Date(
        Date.now() - 60 * 60 * 1000,
      ).toISOString();
      await Deno.writeTextFile(
        join(modmuxDir, "update-check.json"),
        JSON.stringify(
          { lastChecked: recentTimestamp, latestVersion: "9.9.9" },
          null,
          2,
        ) + "\n",
      );

      const moduleUrl = new URL(CLI_PATH, import.meta.url).href;
      // No fetch mock — fetch must NOT be called (would throw)
      const script = makeScript(
        moduleUrl,
        `globalThis.fetch = () => { throw new Error("fetch must not be called"); };`,
      );
      const scriptPath = join(tmp, "run.ts");
      await Deno.writeTextFile(scriptPath, script);
      const result = await new Deno.Command(Deno.execPath(), {
        args: ["run", "--allow-all", "--config", DENO_CONFIG, scriptPath],
        env: { HOME: tmp, USERPROFILE: tmp },
        stdout: "piped",
        stderr: "piped",
      }).output();

      assertEquals(result.code, 0);
      const stderr = new TextDecoder().decode(result.stderr);
      assertEquals(stderr.includes("9.9.9"), true);
      assertEquals(stderr.includes("new version"), true);
    } finally {
      await Deno.remove(tmp, { recursive: true });
    }
  },
);

Deno.test("maybeNotifyUpdate — re-checks after 24h and updates state", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "modmux_upd_test_" });
  try {
    const modmuxDir = join(tmp, ".modmux");
    await Deno.mkdir(modmuxDir, { recursive: true });

    const staleTimestamp = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();
    await Deno.writeTextFile(
      join(modmuxDir, "update-check.json"),
      JSON.stringify(
        { lastChecked: staleTimestamp, latestVersion: "0.3.0" },
        null,
        2,
      ) + "\n",
    );

    const moduleUrl = new URL(CLI_PATH, import.meta.url).href;
    const script = makeScript(
      moduleUrl,
      `globalThis.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ tag_name: "v0.4.1" }) });`,
    );
    const scriptPath = join(tmp, "run.ts");
    await Deno.writeTextFile(scriptPath, script);
    await new Deno.Command(Deno.execPath(), {
      args: ["run", "--allow-all", "--config", DENO_CONFIG, scriptPath],
      env: { HOME: tmp, USERPROFILE: tmp },
      stdout: "piped",
      stderr: "piped",
    }).output();

    const raw = await Deno.readTextFile(join(modmuxDir, "update-check.json"));
    const state = JSON.parse(raw);
    assertEquals(state.latestVersion, "0.4.1");
    const lastChecked = new Date(state.lastChecked).getTime();
    assertEquals(Date.now() - lastChecked < 60_000, true);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
