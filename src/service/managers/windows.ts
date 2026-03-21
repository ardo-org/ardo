import { findFirstBinary } from "../../lib/process.ts";
import {
  generateConfig as crossGenerateConfig,
  installService as crossInstallService,
  uninstallService as crossUninstallService,
} from "@cross/service";
import type {
  ServiceInstallOptions,
  ServiceInstallResult,
  ServiceUninstallResult,
} from "../autostart.ts";
import type { ServiceManager } from "./interfaces.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVICE_NAME = "ardo";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function isRegistered(): Promise<boolean> {
  try {
    const { code } = await new Deno.Command("sc.exe", {
      args: ["query", SERVICE_NAME],
      stdout: "null",
      stderr: "null",
    }).output();
    return code === 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// WindowsServiceManager
// ---------------------------------------------------------------------------

export class WindowsServiceManager implements ServiceManager {
  async isInstalled(): Promise<boolean> {
    return await isRegistered();
  }

  async isRunning(): Promise<boolean> {
    try {
      const { code, stdout } = await new Deno.Command("sc.exe", {
        args: ["query", SERVICE_NAME],
        stdout: "piped",
        stderr: "null",
      }).output();
      if (code !== 0) return false;
      return new TextDecoder().decode(stdout).includes("RUNNING");
    } catch {
      return false;
    }
  }

  async install(
    opts: ServiceInstallOptions = {},
  ): Promise<ServiceInstallResult> {
    const ardoPath = await findFirstBinary(["ardo", "coco"]);
    if (!ardoPath) {
      if (opts.dryRun) {
        const cmd = "ardo --daemon";
        let configContent: string;
        try {
          configContent = await crossGenerateConfig({
            system: false,
            name: SERVICE_NAME,
            cmd,
          });
        } catch {
          configContent = `sc create ${SERVICE_NAME} binPath="ardo --daemon"`;
        }
        return {
          installed: true,
          binaryPath: "ardo",
          configPath: "Windows SCM registry",
          configContent,
        };
      }
      throw new Error(
        "Neither 'ardo' nor legacy 'coco' is installed globally. Run: deno task install",
      );
    }

    const cmd = `${ardoPath} --daemon`;
    let configContent: string;
    try {
      configContent = await crossGenerateConfig({
        system: false,
        name: SERVICE_NAME,
        cmd,
      });
    } catch {
      configContent =
        `sc create ${SERVICE_NAME} binPath="${ardoPath} --daemon"`;
    }
    const configPath = "Windows SCM registry";

    if (opts.dryRun) {
      return {
        installed: true,
        binaryPath: ardoPath,
        configPath,
        configContent,
      };
    }

    await crossInstallService(
      { system: false, name: SERVICE_NAME, cmd },
      false,
    );
    return { installed: true, binaryPath: ardoPath, configPath, configContent };
  }

  async uninstall(
    opts: ServiceInstallOptions = {},
  ): Promise<ServiceUninstallResult> {
    if (!await isRegistered()) return { removed: false };
    if (opts.dryRun) return { removed: true };
    await crossUninstallService({ system: false, name: SERVICE_NAME });
    return { removed: true };
  }

  async start(): Promise<void> {
    const { code } = await new Deno.Command("sc.exe", {
      args: ["start", SERVICE_NAME],
      stdout: "null",
      stderr: "null",
    }).output();
    if (code !== 0) {
      throw new Error(`sc.exe start failed (exit ${code})`);
    }
  }

  async stop(): Promise<void> {
    await new Deno.Command("sc.exe", {
      args: ["stop", SERVICE_NAME],
      stdout: "null",
      stderr: "null",
    }).output();
    // ignoreFailure — already stopped is not an error
  }
}
