export interface TextContentBlock {
  type: "text";
  text: string;
}

export interface ToolUseContentBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContentBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | TextContentBlock[];
  is_error?: boolean;
}

export type ContentBlock =
  | TextContentBlock
  | ToolUseContentBlock
  | ToolResultContentBlock;

export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ToolInputSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface Tool {
  name: string;
  description?: string;
  input_schema: ToolInputSchema;
}

export type ToolChoice =
  | { type: "auto" }
  | { type: "any" }
  | { type: "tool"; name: string };

export interface ProxyRequest {
  model: string;
  messages: Message[];
  max_tokens: number;
  system?: string;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  tools?: Tool[];
  tool_choice?: ToolChoice;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export interface ProxyResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "tool_use" | null;
  stop_sequence: string | null;
  usage: Usage;
}

export interface ErrorDetail {
  type: string;
  message: string;
  param: string | null;
}

export interface ErrorResponse {
  type: "error";
  error: ErrorDetail;
}

export type StreamEventType =
  | "message_start"
  | "content_block_start"
  | "content_block_delta"
  | "content_block_stop"
  | "message_delta"
  | "message_stop";

export interface StreamEvent {
  type: StreamEventType;
  index?: number;
  content_block?: {
    type: "text";
  } | {
    type: "tool_use";
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  delta?: {
    type: "text_delta";
    text: string;
  } | {
    type: "input_json_delta";
    partial_json: string;
  } | {
    type: "stop_reason";
    stop_reason: string;
  };
  usage?: Usage;
  message?: {
    id: string;
    type: "message";
    role: "assistant";
    model: string;
    usage: Usage;
  };
}

export interface CountTokensResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  model: string;
  stop_reason: null;
  stop_sequence: null;
  usage: Usage;
}

export function validateRequest(req: unknown): {
  valid: boolean;
  error?: ErrorResponse;
} {
  if (!req || typeof req !== "object") {
    return {
      valid: false,
      error: {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "Request body is required",
          param: null,
        },
      },
    };
  }

  const r = req as Record<string, unknown>;

  if (typeof r.model !== "string" || r.model === "") {
    return {
      valid: false,
      error: {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "model is required",
          param: "model",
        },
      },
    };
  }

  if (!Array.isArray(r.messages) || r.messages.length === 0) {
    return {
      valid: false,
      error: {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "messages is required and must be non-empty",
          param: "messages",
        },
      },
    };
  }

  if (typeof r.max_tokens !== "number" || r.max_tokens <= 0) {
    return {
      valid: false,
      error: {
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "max_tokens must be a positive integer",
          param: "max_tokens",
        },
      },
    };
  }

  return { valid: true };
}

export function generateMessageId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "msg_claudio_";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
