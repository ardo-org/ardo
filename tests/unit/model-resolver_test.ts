import { assertEquals } from "@std/assert";
import {
  _clearAvailableModelsForTest,
  _setAvailableModelsForTest,
  resolveModelForEndpoint,
} from "../../src/server/model-resolver.ts";

Deno.test("model resolver — uses exact model when available", async () => {
  _setAvailableModelsForTest(["gpt-4.1-copilot", "gpt-4o"]);
  const out = await resolveModelForEndpoint("gpt-4o", "responses");
  assertEquals(out.resolvedModel, "gpt-4o");
  assertEquals(out.strategy, "exact");
  _clearAvailableModelsForTest();
});

Deno.test("model resolver — maps gpt-5 family to compatible fallback", async () => {
  _setAvailableModelsForTest(["gpt-4.1-copilot", "gpt-4o"]);
  const out = await resolveModelForEndpoint("gpt-5.4", "responses");
  assertEquals(out.resolvedModel, "gpt-4.1-copilot");
  assertEquals(out.strategy, "family-fallback");
  _clearAvailableModelsForTest();
});

Deno.test("model resolver — respects user override when available", async () => {
  _setAvailableModelsForTest(["gpt-4.1", "gpt-4o"]);
  const out = await resolveModelForEndpoint(
    "gpt-5.4",
    "chat_completions",
    { "gpt-5.4": "gpt-4.1" },
  );
  assertEquals(out.resolvedModel, "gpt-4.1");
  assertEquals(out.strategy, "family-fallback");
  _clearAvailableModelsForTest();
});

Deno.test("model resolver — strict rejects remap candidates", async () => {
  _setAvailableModelsForTest(["gpt-4.1-copilot", "gpt-4o"]);
  const out = await resolveModelForEndpoint(
    "gpt-5.4",
    "responses",
    {},
    "strict",
  );
  assertEquals(out.rejected, true);
  assertEquals(out.strategy, "strict-reject");
  _clearAvailableModelsForTest();
});

Deno.test("model resolver — strict allows exact supported model", async () => {
  _setAvailableModelsForTest(["gpt-4.1-copilot", "gpt-4o"]);
  const out = await resolveModelForEndpoint(
    "gpt-4o",
    "responses",
    {},
    "strict",
  );
  assertEquals(out.rejected, undefined);
  assertEquals(out.resolvedModel, "gpt-4o");
  assertEquals(out.strategy, "exact");
  _clearAvailableModelsForTest();
});

Deno.test("model resolver — strict rejects gpt-5 even if listed when chat backend is used", async () => {
  _setAvailableModelsForTest(["gpt-5.4", "gpt-4o"]);
  const out = await resolveModelForEndpoint(
    "gpt-5.4",
    "responses",
    {},
    "strict",
  );
  assertEquals(out.rejected, true);
  assertEquals(out.strategy, "strict-reject");
  _clearAvailableModelsForTest();
});
