import { join } from "@std/path";
import { configDir, loadConfig } from "../../gateway/src/store.ts";
import { VERSION } from "./version.ts";

const GITHUB_API = "https://api.github.com/repos/modmux/modmux/releases/latest";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 3_000;

interface UpdateCheckState {
  lastChecked: string;
  latestVersion: string;
}

interface GithubRelease {
  tag_name: string;
}

function stateFilePath(): string {
  return join(configDir(), "update-check.json");
}

async function readState(): Promise<UpdateCheckState | null> {
  try {
    const raw = await Deno.readTextFile(stateFilePath());
    return JSON.parse(raw) as UpdateCheckState;
  } catch {
    return null;
  }
}

async function writeState(state: UpdateCheckState): Promise<void> {
  try {
    await Deno.mkdir(configDir(), { recursive: true });
    await Deno.writeTextFile(
      stateFilePath(),
      JSON.stringify(state, null, 2) + "\n",
    );
  } catch {
    // State write failure is non-fatal
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const res = await fetch(GITHUB_API, {
      headers: { "Accept": "application/vnd.github+json" },
      signal,
    });
    if (!res.ok) return null;
    const release = await res.json() as GithubRelease;
    return release.tag_name.replace(/^v/, "");
  } catch {
    return null;
  }
}

/**
 * Checks GitHub releases at most once per day. Returns the newer version string
 * if one is available, or null if up-to-date or the check fails. Failures are
 * always silent.
 */
export async function checkForNewerVersion(): Promise<string | null> {
  try {
    const config = await loadConfig();
    if (!config.updates.checkEnabled) return null;
  } catch {
    // If config can't be loaded, proceed with default (enabled)
  }

  const state = await readState();
  const now = Date.now();

  if (state !== null) {
    const lastChecked = new Date(state.lastChecked).getTime();
    if (!isNaN(lastChecked) && now - lastChecked < CHECK_INTERVAL_MS) {
      return state.latestVersion !== VERSION ? state.latestVersion : null;
    }
  }

  const latestVersion = await fetchLatestVersion();
  if (latestVersion === null) return null;

  await writeState({ lastChecked: new Date(now).toISOString(), latestVersion });

  return latestVersion !== VERSION ? latestVersion : null;
}

/**
 * Checks GitHub releases at most once per day. If a newer version is found,
 * prints a notification to stderr. Failures are always silent.
 */
export async function maybeNotifyUpdate(): Promise<void> {
  const newerVersion = await checkForNewerVersion();
  if (newerVersion !== null) {
    printNotification(newerVersion);
  }
}

function printNotification(latestVersion: string): void {
  console.error(
    `\nA new version of Modmux is available: v${latestVersion} (you have v${VERSION})`,
  );
  console.error(`Run 'modmux upgrade' to update.\n`);
}
