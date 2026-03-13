import {
  type ErrorResponse,
  type Message,
  type OpenAIChatRequest,
  type OpenAIModel,
  type OpenAIModelList,
  type OpenAIResponsesInputMessage,
  type OpenAIResponsesRequest,
  type ProxyRequest,
  validateRequest,
} from "./types.ts";
import { chat, chatStream, countTokens } from "./copilot.ts";
import { toStreamEvent } from "./transform.ts";
import { addShutdownHandler, getConfig } from "./server.ts";
import { log } from "../lib/log.ts";
import {
  anthropicStreamEventToOpenAI,
  anthropicToOpenAI,
  makeStreamState,
  openAIError,
  openAIToAnthropic,
} from "./openai-translate.ts";
import { DEFAULT_MODEL_MAP } from "../agents/models.ts";
import { loadConfig } from "../config/store.ts";
import { fetchModelList } from "../copilot/models.ts";
import { resolveModelForEndpoint } from "./model-resolver.ts";

const server = Deno.serve;

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST" && url.pathname === "/v1/messages") {
    return await handleMessages(req);
  }

  if (req.method === "POST" && url.pathname === "/v1/messages/count_tokens") {
    return await handleCountTokens(req);
  }

  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    return await handleChatCompletions(req);
  }

  if (req.method === "POST" && url.pathname === "/v1/responses") {
    return await handleResponses(req);
  }

  if (req.method === "GET" && url.pathname === "/v1/models") {
    return await handleModels();
  }

  return new Response(
    JSON.stringify({
      type: "error",
      error: {
        type: "invalid_request_error",
        message: "Not found",
        param: null,
      },
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    },
  );
}

async function handleMessages(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error: unknown) {
    console.error("Request Handled:", error, req);
    return errorResponse(
      400,
      "invalid_request_error",
      "Invalid JSON body",
      null,
    );
  }

  const validation = validateRequest(body);
  if (!validation.valid) {
    return errorResponse(
      400,
      validation.error!.error.type,
      validation.error!.error.message,
      validation.error!.error.param,
    );
  }

  const request = body as ProxyRequest;

  if (request.stream) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          await chatStream(request, (event) => {
            controller.enqueue(encoder.encode(toStreamEvent(event)));
          });
        } catch (err) {
          const errorEvent = {
            type: "error" as const,
            error: {
              type: "service_error",
              message: err instanceof Error
                ? err.message
                : "Internal server error",
              param: null,
            },
          };
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify(errorEvent)}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  try {
    const response = await chat(request);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Request Chat Error:", "400", err);
    return errorResponse(
      503,
      "service_error",
      err instanceof Error ? err.message : "Copilot unavailable",
      null,
    );
  }
}

async function handleCountTokens(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      400,
      "invalid_request_error",
      "Invalid JSON body",
      null,
    );
  }

  if (!body || typeof body !== "object") {
    return errorResponse(
      400,
      "invalid_request_error",
      "Request body is required",
      null,
    );
  }

  const r = body as Record<string, unknown>;
  if (typeof r.model !== "string" || r.model === "") {
    return errorResponse(
      400,
      "invalid_request_error",
      "model is required",
      "model",
    );
  }
  if (!Array.isArray(r.messages) || r.messages.length === 0) {
    return errorResponse(
      400,
      "invalid_request_error",
      "messages is required",
      "messages",
    );
  }

  try {
    const response = countTokens({
      model: r.model as string,
      messages: r.messages as Message[],
    });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return errorResponse(
      503,
      "service_error",
      err instanceof Error ? err.message : "Copilot unavailable",
      null,
    );
  }
}

function openAIErrorResponse(
  status: number,
  message: string,
  type: string,
  code: string,
): Response {
  return new Response(JSON.stringify(openAIError(message, type, code)), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleChatCompletions(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return openAIErrorResponse(
      400,
      "Invalid JSON body",
      "invalid_request_error",
      "invalid_value",
    );
  }

  if (!body || typeof body !== "object") {
    return openAIErrorResponse(
      400,
      "Request body is required",
      "invalid_request_error",
      "invalid_value",
    );
  }

  const r = body as Record<string, unknown>;
  if (typeof r.model !== "string" || !r.model) {
    return openAIErrorResponse(
      400,
      "model is required",
      "invalid_request_error",
      "invalid_value",
    );
  }
  if (!Array.isArray(r.messages) || r.messages.length === 0) {
    return openAIErrorResponse(
      400,
      "messages is required and must be non-empty",
      "invalid_request_error",
      "invalid_value",
    );
  }

  const openAIReq = body as OpenAIChatRequest;
  const config = await loadConfig().catch(() => null);
  const modelResolution = await resolveModelForEndpoint(
    openAIReq.model,
    "chat_completions",
    config?.modelMap ?? {},
    config?.modelMappingPolicy,
  );
  if (modelResolution.rejected) {
    return new Response(
      JSON.stringify(openAIError(
        modelResolution.rejectReason ??
          `Model "${openAIReq.model}" is not supported for /v1/chat/completions in strict mode`,
        "invalid_request_error",
        "invalid_value",
      )),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  const resolvedModel = modelResolution.resolvedModel;
  if (resolvedModel !== openAIReq.model) {
    await log("debug", "Model resolved", {
      endpoint: "/v1/chat/completions",
      requestedModel: openAIReq.model,
      resolvedModel,
      strategy: modelResolution.strategy,
    });
  }
  const anthropicReq: ProxyRequest = {
    ...openAIToAnthropic(openAIReq),
    model: resolvedModel,
  };

  if (anthropicReq.stream) {
    const state = makeStreamState(resolvedModel);
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          await chatStream(anthropicReq, (event) => {
            const line = anthropicStreamEventToOpenAI(event, state);
            if (line) controller.enqueue(encoder.encode(line));
          });
          // Ensure [DONE] is always emitted
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          const errBody = openAIError(
            err instanceof Error ? err.message : "Service unavailable",
            "api_error",
            "service_unavailable",
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errBody)}\n\n`),
          );
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  try {
    const anthropicResp = await chat(anthropicReq);
    const openAIResp = anthropicToOpenAI(anthropicResp, resolvedModel);
    return new Response(JSON.stringify(openAIResp), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return openAIErrorResponse(
      503,
      err instanceof Error ? err.message : "Service unavailable",
      "api_error",
      "service_unavailable",
    );
  }
}

function responsesInputToMessages(
  input: string | OpenAIResponsesInputMessage[] | undefined,
): OpenAIChatRequest["messages"] {
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }

  if (!Array.isArray(input)) return [];

  const messages: OpenAIChatRequest["messages"] = [];
  for (const item of input) {
    const role = item.role;
    if (role !== "user" && role !== "assistant" && role !== "system") {
      continue;
    }

    if (typeof item.content === "string") {
      messages.push({ role, content: item.content });
      continue;
    }

    if (Array.isArray(item.content)) {
      const text = item.content
        .filter((part) =>
          part && typeof part === "object" &&
          (part.type === "input_text" || part.type === "text")
        )
        .map((part) => part.text)
        .join("\n");
      messages.push({ role, content: text });
    }
  }

  return messages.filter((m) => typeof m.content === "string");
}

async function handleResponses(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return openAIErrorResponse(
      400,
      "Invalid JSON body",
      "invalid_request_error",
      "invalid_value",
    );
  }

  if (!body || typeof body !== "object") {
    return openAIErrorResponse(
      400,
      "Request body is required",
      "invalid_request_error",
      "invalid_value",
    );
  }

  const r = body as Record<string, unknown>;
  if (typeof r.model !== "string" || !r.model) {
    return openAIErrorResponse(
      400,
      "model is required",
      "invalid_request_error",
      "invalid_value",
    );
  }

  const responsesReq = body as OpenAIResponsesRequest;
  const messages = responsesInputToMessages(responsesReq.input);
  if (messages.length === 0) {
    return openAIErrorResponse(
      400,
      "input is required and must contain text content",
      "invalid_request_error",
      "invalid_value",
    );
  }

  const config = await loadConfig().catch(() => null);
  const modelResolution = await resolveModelForEndpoint(
    responsesReq.model,
    "responses",
    config?.modelMap ?? {},
    config?.modelMappingPolicy,
  );
  if (modelResolution.rejected) {
    return new Response(
      JSON.stringify(openAIError(
        modelResolution.rejectReason ??
          `Model "${responsesReq.model}" is not supported for /v1/responses in strict mode`,
        "invalid_request_error",
        "invalid_value",
      )),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  const resolvedModel = modelResolution.resolvedModel;
  if (resolvedModel !== responsesReq.model) {
    await log("debug", "Model resolved", {
      endpoint: "/v1/responses",
      requestedModel: responsesReq.model,
      resolvedModel,
      strategy: modelResolution.strategy,
    });
  }
  const anthropicReq: ProxyRequest = {
    ...openAIToAnthropic({
      model: responsesReq.model,
      messages,
      max_tokens: responsesReq.max_output_tokens ?? 4096,
      stream: false,
      temperature: responsesReq.temperature,
      top_p: responsesReq.top_p,
    }),
    model: resolvedModel,
    stream: false,
  };

  const toResponsesBody = (
    openAIResp: ReturnType<typeof anthropicToOpenAI>,
  ) => {
    const text = openAIResp.choices[0]?.message?.content ?? "";
    return {
      id: `resp_${openAIResp.id}`,
      object: "response",
      created_at: openAIResp.created,
      status: "completed",
      model: openAIResp.model,
      output: [{
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
      }],
      output_text: text,
      usage: {
        input_tokens: openAIResp.usage.prompt_tokens,
        output_tokens: openAIResp.usage.completion_tokens,
        total_tokens: openAIResp.usage.total_tokens,
      },
    };
  };

  if (responsesReq.stream === true) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const write = (event: string, data: Record<string, unknown>) => {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        try {
          const anthropicResp = await chat(anthropicReq);
          // Keep the user-requested model in Responses payloads even when
          // backend routing uses a mapped chat-compatible model.
          const openAIResp = anthropicToOpenAI(
            anthropicResp,
            responsesReq.model,
          );
          const responseBody = toResponsesBody(openAIResp);
          const responseId = String(responseBody.id);
          const outputItemId = `msg_${responseId}`;
          const text = String(responseBody.output_text);

          write("response.created", {
            type: "response.created",
            response: {
              id: responseId,
              object: "response",
              model: responseBody.model,
              status: "in_progress",
            },
          });

          write("response.output_item.added", {
            type: "response.output_item.added",
            response_id: responseId,
            output_index: 0,
            item: {
              id: outputItemId,
              type: "message",
              role: "assistant",
              status: "in_progress",
              content: [],
            },
          });

          write("response.content_part.added", {
            type: "response.content_part.added",
            response_id: responseId,
            output_index: 0,
            item_id: outputItemId,
            content_index: 0,
            part: { type: "output_text", text: "" },
          });

          write("response.output_text.delta", {
            type: "response.output_text.delta",
            response_id: responseId,
            output_index: 0,
            item_id: outputItemId,
            content_index: 0,
            delta: text,
          });

          write("response.output_text.done", {
            type: "response.output_text.done",
            response_id: responseId,
            output_index: 0,
            item_id: outputItemId,
            content_index: 0,
            text,
          });

          write("response.content_part.done", {
            type: "response.content_part.done",
            response_id: responseId,
            output_index: 0,
            item_id: outputItemId,
            content_index: 0,
            part: { type: "output_text", text },
          });

          write("response.output_item.done", {
            type: "response.output_item.done",
            response_id: responseId,
            output_index: 0,
            item: {
              id: outputItemId,
              type: "message",
              role: "assistant",
              status: "completed",
              content: [{ type: "output_text", text }],
            },
          });

          write("response.completed", {
            type: "response.completed",
            response: responseBody,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          write("error", {
            type: "error",
            error: {
              message: err instanceof Error
                ? err.message
                : "Service unavailable",
              type: "api_error",
              code: "service_unavailable",
            },
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  try {
    const anthropicResp = await chat(anthropicReq);
    // Keep the user-requested model in Responses payloads even when backend
    // routing uses a mapped chat-compatible model.
    const openAIResp = anthropicToOpenAI(anthropicResp, responsesReq.model);
    const responseBody = toResponsesBody(openAIResp);

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return openAIErrorResponse(
      503,
      err instanceof Error ? err.message : "Service unavailable",
      "api_error",
      "service_unavailable",
    );
  }
}

async function handleModels(): Promise<Response> {
  const created = Math.floor(Date.now() / 1000);
  const liveModels = await fetchModelList().catch(() => []);

  // Combine live IDs with known defaults so clients can always resolve
  // metadata for baseline aliases even if Copilot omits them temporarily.
  const advertisedModelIds = [
    ...liveModels,
    ...Object.values(DEFAULT_MODEL_MAP),
  ];

  const models: OpenAIModel[] = advertisedModelIds
    .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate
    .map((id) => ({
      id,
      object: "model" as const,
      created,
      owned_by: "github-copilot",
    }));

  const list: OpenAIModelList = { object: "list", data: models };
  return new Response(JSON.stringify(list), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(
  status: number,
  type: string,
  message: string,
  param: string | null,
): Response {
  const body: ErrorResponse = {
    type: "error",
    error: { type, message, param },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function startServer(): Promise<
  { port: number; stop: () => Promise<void> }
> {
  const config = await getConfig();
  addShutdownHandler();

  const httpServer = server({
    hostname: config.hostname,
    port: config.port,
    handler: handleRequest,
    onListen: ({ port, hostname }) => {
      log("info", "Server started", { port, hostname });
    },
  });

  const { port } = httpServer.addr as Deno.NetAddr;

  return {
    port,
    stop: () => httpServer.shutdown(),
  };
}
