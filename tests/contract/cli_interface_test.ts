import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runCoco(
  args: string[],
  env?: Record<string, string>,
): Promise<RunResult> {
  const command = new Deno.Command("deno", {
    args: ["run", "-A", "src/cli/main.ts", ...args],
    stdout: "piped",
    stderr: "piped",
    stdin: "null",
    env,
  });

  const output = await command.output();

  return {
    stdout: new TextDecoder().decode(output.stdout).trim(),
    stderr: new TextDecoder().decode(output.stderr).trim(),
    exitCode: output.code,
  };
}

Deno.test("CLI contract: --version prints version string and exits 0", async () => {
  const result = await runCoco(["--version"]);
  assertMatch(result.stdout, /^Ardo v\d+\.\d+\.\d+/);
  assertEquals(result.exitCode, 0);
});

Deno.test("CLI contract: -v alias prints version string and exits 0", async () => {
  const result = await runCoco(["-v"]);
  assertMatch(result.stdout, /^Ardo v\d+\.\d+\.\d+/);
  assertEquals(result.exitCode, 0);
});

Deno.test("CLI contract: --help prints usage and exits 0", async () => {
  const result = await runCoco(["--help"]);
  assertStringIncludes(result.stdout, "Ardo");
  assertStringIncludes(result.stdout, "Usage: ardo");
  assertStringIncludes(result.stdout, "Legacy alias: coco");
  assertStringIncludes(result.stdout, "start");
  assertStringIncludes(result.stdout, "--version");
  assertEquals(result.exitCode, 0);
});

Deno.test("CLI contract: -h alias prints usage and exits 0", async () => {
  const result = await runCoco(["-h"]);
  assertStringIncludes(result.stdout, "Ardo");
  assertStringIncludes(result.stdout, "--version");
  assertEquals(result.exitCode, 0);
});

Deno.test("CLI contract: legacy coco invocation prints deprecation warning", async () => {
  const result = await runCoco(["--help"], { _: "/usr/local/bin/coco" });
  assertStringIncludes(result.stderr, "'coco' is deprecated");
  assertEquals(result.exitCode, 0);
});

Deno.test("CLI contract: --help includes model-policy command", async () => {
  const result = await runCoco(["--help"]);
  assertStringIncludes(result.stdout, "model-policy");
  assertEquals(result.exitCode, 0);
});

Deno.test("CLI contract: model-policy prints current default", async () => {
  const tempHome = await Deno.makeTempDir({
    prefix: "coco_cli_policy_default_",
  });
  try {
    const result = await runCoco(["model-policy"], { HOME: tempHome });
    assertStringIncludes(result.stdout, "Model mapping policy: compatible");
    assertEquals(result.exitCode, 0);
  } finally {
    await Deno.remove(tempHome, { recursive: true });
  }
});

Deno.test("CLI contract: model-policy strict persists setting", async () => {
  const tempHome = await Deno.makeTempDir({ prefix: "coco_cli_policy_set_" });
  try {
    const setResult = await runCoco(["model-policy", "strict"], {
      HOME: tempHome,
    });
    assertStringIncludes(
      setResult.stdout,
      "Model mapping policy set to: strict",
    );
    assertEquals(setResult.exitCode, 0);

    const getResult = await runCoco(["model-policy"], { HOME: tempHome });
    assertStringIncludes(getResult.stdout, "Model mapping policy: strict");
    assertEquals(getResult.exitCode, 0);
  } finally {
    await Deno.remove(tempHome, { recursive: true });
  }
});

Deno.test("CLI contract: model-policy rejects invalid value", async () => {
  const tempHome = await Deno.makeTempDir({
    prefix: "coco_cli_policy_invalid_",
  });
  try {
    const result = await runCoco(["model-policy", "auto"], { HOME: tempHome });
    assertStringIncludes(result.stderr, "Invalid model policy");
    assertEquals(result.exitCode, 1);
  } finally {
    await Deno.remove(tempHome, { recursive: true });
  }
});
