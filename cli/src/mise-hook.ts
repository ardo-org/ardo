/**
 * Manages a dedicated mise conf.d file that installs a postinstall hook to
 * restart the modmux daemon whenever mise upgrades modmux.
 *
 * Writing to ~/.config/mise/conf.d/modmux-restart.toml rather than the user's
 * config.toml keeps the change isolated and fully reversible without touching
 * or reformatting any user-managed files.
 *
 * All operations are non-fatal: failures are silently ignored so they never
 * break the upgrade flow.
 */

import { join } from "@std/path";

const CONF_D_FILE = "modmux-restart.toml";

// The restart hook checks MISE_INSTALLED_TOOLS so it only restarts when
// modmux itself was upgraded (not on every `mise install`).
// modmux restart uses the stored auth token, which is already valid when the
// daemon is running, so this is non-interactive in practice.
const HOOK_TOML = `\
# Managed by modmux. To disable, set upgradeMethod = "binary" in modmux config.

[hooks]
postinstall = "echo \\"$MISE_INSTALLED_TOOLS\\" | grep -q '\\"modmux\\"' && modmux restart || true"
`;

function miseConfDDir(): string {
  const xdgConfigHome = Deno.env.get("XDG_CONFIG_HOME");
  const base = xdgConfigHome ? join(xdgConfigHome, "mise") : join(
    Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".",
    ".config",
    "mise",
  );
  return join(base, "conf.d");
}

function hookFilePath(): string {
  return join(miseConfDDir(), CONF_D_FILE);
}

/**
 * Write the modmux postinstall hook into ~/.config/mise/conf.d/.
 */
export async function ensureMiseRestartHook(): Promise<void> {
  try {
    await Deno.mkdir(miseConfDDir(), { recursive: true });
    await Deno.writeTextFile(hookFilePath(), HOOK_TOML);
  } catch {
    // Non-fatal.
  }
}

/**
 * Remove the modmux postinstall hook file if present.
 */
export async function removeMiseRestartHook(): Promise<void> {
  try {
    await Deno.remove(hookFilePath());
  } catch {
    // Non-fatal: file may not exist.
  }
}
