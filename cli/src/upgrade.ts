import { VERSION } from "./version.ts";
import { loadConfig } from "../../gateway/src/store.ts";
import { ensureMiseRestartHook } from "./mise-hook.ts";

const REPO = "modmux/modmux";
const GITHUB_API = `https://api.github.com/repos/${REPO}/releases/latest`;

function detectAssetName(): string | null {
  const os = Deno.build.os;
  const arch = Deno.build.arch;

  if (os === "darwin" && arch === "aarch64") return "modmux-darwin-arm64";
  if (os === "darwin" && arch === "x86_64") return "modmux-darwin-x64";
  if (os === "linux" && arch === "x86_64") return "modmux-linux-x64";
  if (os === "linux" && arch === "aarch64") return "modmux-linux-arm64";
  if (os === "windows" && arch === "x86_64") return "modmux-windows-x64.exe";
  return null;
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  assets: ReleaseAsset[];
}

async function upgradeMise(): Promise<void> {
  await ensureMiseRestartHook();
  console.log("Upgrading via mise...");
  const proc = new Deno.Command("mise", {
    args: ["upgrade", "modmux"],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await proc.spawn().status;
  if (!status.success) {
    console.error(`Error: mise upgrade exited with code ${status.code}`);
    Deno.exit(status.code ?? 1);
  }
}

async function upgradeBinary(): Promise<void> {
  const assetName = detectAssetName();
  if (!assetName) {
    console.error(
      `Error: Unsupported platform: ${Deno.build.os}/${Deno.build.arch}`,
    );
    Deno.exit(1);
  }

  console.log("Checking for updates...");
  let release: GithubRelease;
  try {
    const res = await fetch(GITHUB_API, {
      headers: { "Accept": "application/vnd.github+json" },
    });
    if (!res.ok) {
      console.error(`Error: GitHub API returned ${res.status}`);
      Deno.exit(1);
    }
    release = await res.json() as GithubRelease;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: Failed to fetch release info: ${msg}`);
    Deno.exit(1);
  }

  const latestTag = release.tag_name;
  const latestVersion = latestTag.replace(/^v/, "");

  if (latestVersion === VERSION) {
    console.log(`Already at latest version (${VERSION}).`);
    return;
  }

  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) {
    console.error(
      `Error: No asset named "${assetName}" found in release ${latestTag}.`,
    );
    Deno.exit(1);
  }

  console.log(`Upgrading from v${VERSION} to ${latestTag}...`);

  const downloadUrl = asset.browser_download_url;
  let downloadedBytes: Uint8Array;
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      console.error(`Error: Failed to download asset: HTTP ${res.status}`);
      Deno.exit(1);
    }
    downloadedBytes = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: Download failed: ${msg}`);
    Deno.exit(1);
  }

  const currentPath = Deno.execPath();
  const tmpPath = currentPath + ".upgrade-tmp";

  try {
    await Deno.writeFile(tmpPath, downloadedBytes, { mode: 0o755 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: Could not write temporary file: ${msg}`);
    Deno.exit(1);
  }

  try {
    await Deno.rename(tmpPath, currentPath);
  } catch {
    // On Windows the binary may be locked; fall back to copy + delete
    try {
      await Deno.copyFile(tmpPath, currentPath);
      await Deno.remove(tmpPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await Deno.remove(tmpPath).catch(() => {});
      console.error(`Error: Could not replace binary: ${msg}`);
      Deno.exit(1);
    }
  }

  console.log(`Modmux upgraded to ${latestTag}.`);
}

export async function upgrade(): Promise<void> {
  const config = await loadConfig().catch(() => null);
  const method = config?.updates?.upgradeMethod ?? "binary";

  if (method === "mise") {
    await upgradeMise();
  } else {
    await upgradeBinary();
  }
}
