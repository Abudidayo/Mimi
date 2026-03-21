import type { UIMessage } from "ai";

export type PersistedChatMessage = {
  id: string;
  role: UIMessage["role"];
  parts: Record<string, unknown>[];
};

export type PersistedChatSnapshot = {
  messages: PersistedChatMessage[];
  controlValues: Record<string, unknown>;
};

export type PersistedChatSession = PersistedChatSnapshot & {
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}`;
}

export function getSessionTitleFromPrompt(prompt: string) {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New session";
  return cleaned.length > 48 ? `${cleaned.slice(0, 45)}...` : cleaned;
}

export function toConvexSafeSnapshot(
  messages: UIMessage[],
  controlValues: Record<string, unknown>
): PersistedChatSnapshot {
  const sanitizedMessages = messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: sanitizeMessageParts((message as UIMessage & { parts?: unknown[] }).parts),
  }));

  return JSON.parse(
    JSON.stringify({
      messages: sanitizedMessages,
      controlValues: sanitizeControlValues(controlValues),
    })
  ) as PersistedChatSnapshot;
}

export function normalizePersistedMessages(
  messages: unknown[] | undefined
): UIMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message) => normalizePersistedMessage(message))
    .filter((message): message is UIMessage => message !== null);
}

function normalizePersistedMessage(message: unknown): UIMessage | null {
  if (!message || typeof message !== "object") return null;

  const candidate = message as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id : null;
  const role = candidate.role;

  if (!id || (role !== "user" && role !== "assistant" && role !== "system")) {
    return null;
  }

  const normalizedParts = normalizeMessageParts(
    Array.isArray(candidate.parts) ? candidate.parts : undefined
  );
  const fallbackContent =
    normalizedParts.length === 0 && typeof candidate.content === "string"
      ? candidate.content
      : "";
  const content = normalizedParts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("") || fallbackContent;

  return {
    id,
    role,
    parts:
      normalizedParts.length > 0
        ? normalizedParts
        : content
          ? [{ type: "text", text: content }]
          : [],
    content,
  } as UIMessage;
}

type NormalizedPart =
  | { type: "text"; text: string }
  | Record<string, unknown>;

function normalizeMessageParts(parts: unknown[] | undefined): NormalizedPart[] {
  if (!Array.isArray(parts)) return [];

  const normalized: NormalizedPart[] = [];
  let activeText = "";
  const toolParts = new Map<string, Record<string, unknown>>();

  const flushText = () => {
    if (!activeText) return;
    normalized.push({ type: "text", text: activeText });
    activeText = "";
  };

  const getOrCreateDynamicToolPart = (
    toolCallId: string,
    toolName?: string
  ): Record<string, unknown> | null => {
    const existing = toolParts.get(toolCallId);
    if (existing) {
      if (!existing.toolName && toolName) {
        existing.toolName = toolName;
      }
      return existing;
    }

    if (!toolName) return null;

    const nextPart: Record<string, unknown> = {
      type: "dynamic-tool",
      toolCallId,
      toolName,
      state: "input-available",
      input: {},
    };
    toolParts.set(toolCallId, nextPart);
    normalized.push(nextPart);
    return nextPart;
  };

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;

    const candidate = part as Record<string, unknown>;
    const type = typeof candidate.type === "string" ? candidate.type : null;
    if (!type) continue;

    if (type === "text") {
      activeText += typeof candidate.text === "string" ? candidate.text : "";
      continue;
    }

    if (type === "text-start") {
      flushText();
      continue;
    }

    if (type === "text-delta") {
      activeText += typeof candidate.delta === "string" ? candidate.delta : "";
      continue;
    }

    if (type === "text-end") {
      flushText();
      continue;
    }

    if (type === "tool-input-available") {
      const toolCallId =
        typeof candidate.toolCallId === "string" ? candidate.toolCallId : null;
      const toolName =
        typeof candidate.toolName === "string" ? candidate.toolName : null;

      if (toolCallId && toolName) {
        const toolPart = getOrCreateDynamicToolPart(toolCallId, toolName);
        if (toolPart) {
          toolPart.state = "input-available";
          toolPart.input = candidate.input ?? {};
        }
      }
      continue;
    }

    if (type === "tool-output-available") {
      const toolCallId =
        typeof candidate.toolCallId === "string" ? candidate.toolCallId : null;

      if (toolCallId) {
        const toolPart = getOrCreateDynamicToolPart(toolCallId);
        if (toolPart) {
          toolPart.state = "output-available";
          toolPart.input = toolPart.input ?? {};
          toolPart.output = candidate.output;
        }
      }
      continue;
    }

    if (type === "tool-invocation") {
      const invocation =
        candidate.toolInvocation && typeof candidate.toolInvocation === "object"
          ? (candidate.toolInvocation as Record<string, unknown>)
          : null;

      const toolCallId =
        invocation && typeof invocation.toolCallId === "string"
          ? invocation.toolCallId
          : null;
      const toolName =
        invocation && typeof invocation.toolName === "string"
          ? invocation.toolName
          : null;
      const state =
        invocation && typeof invocation.state === "string"
          ? invocation.state
          : null;

      if (toolCallId && toolName && state) {
        const toolPart = getOrCreateDynamicToolPart(toolCallId, toolName);
        if (toolPart) {
          toolPart.state =
            state === "result" ? "output-available" : "input-available";
          toolPart.input = toolPart.input ?? {};
          if (state === "result") {
            toolPart.output = invocation?.result;
          }
        }
      }
      continue;
    }

    flushText();

    const sanitized = sanitizeMessagePart(candidate);
    if (
      sanitized &&
      sanitized.type !== "tool-input-available" &&
      sanitized.type !== "tool-output-available"
    ) {
      normalized.push(sanitized);
    }
  }

  flushText();
  return normalized;
}

function sanitizeMessageParts(parts: unknown[] | undefined) {
  if (!Array.isArray(parts)) return [];

  return parts
    .map((part) => sanitizeMessagePart(part))
    .filter((part): part is Record<string, unknown> => part !== null);
}

function sanitizeMessagePart(part: unknown): Record<string, unknown> | null {
  if (!part || typeof part !== "object") return null;

  const candidate = part as Record<string, unknown>;
  const type = typeof candidate.type === "string" ? candidate.type : null;
  if (!type) return null;

  if (type === "text") {
    return {
      type,
      text: typeof candidate.text === "string" ? candidate.text : "",
      state: typeof candidate.state === "string" ? candidate.state : undefined,
    };
  }

  if (type === "reasoning") {
    return {
      type,
      text: typeof candidate.text === "string" ? candidate.text : "",
      state: typeof candidate.state === "string" ? candidate.state : undefined,
    };
  }

  if (type === "step-start") {
    return { type };
  }

  if (type === "file") {
    const url = typeof candidate.url === "string" ? candidate.url : null;
    const mediaType =
      typeof candidate.mediaType === "string" ? candidate.mediaType : null;
    if (!url || !mediaType) return null;

    return {
      type,
      url,
      mediaType,
      filename:
        typeof candidate.filename === "string" ? candidate.filename : undefined,
    };
  }

  if (type === "source-url") {
    const sourceId =
      typeof candidate.sourceId === "string" ? candidate.sourceId : null;
    const url = typeof candidate.url === "string" ? candidate.url : null;
    if (!sourceId || !url) return null;

    return {
      type,
      sourceId,
      url,
      title: typeof candidate.title === "string" ? candidate.title : undefined,
    };
  }

  if (type === "source-document") {
    const sourceId =
      typeof candidate.sourceId === "string" ? candidate.sourceId : null;
    const mediaType =
      typeof candidate.mediaType === "string" ? candidate.mediaType : null;
    const title = typeof candidate.title === "string" ? candidate.title : null;
    if (!sourceId || !mediaType || !title) return null;

    return {
      type,
      sourceId,
      mediaType,
      title,
      filename:
        typeof candidate.filename === "string" ? candidate.filename : undefined,
    };
  }

  if (type.startsWith("data-")) {
    return {
      type,
      id: typeof candidate.id === "string" ? candidate.id : undefined,
      data: candidate.data,
    };
  }

  if (type === "tool-invocation") {
    const invocation =
      candidate.toolInvocation && typeof candidate.toolInvocation === "object"
        ? (candidate.toolInvocation as Record<string, unknown>)
        : null;

    if (!invocation) return null;

    return {
      type,
      toolInvocation: {
        toolCallId: typeof invocation.toolCallId === "string" ? invocation.toolCallId : undefined,
        toolName: typeof invocation.toolName === "string" ? invocation.toolName : undefined,
        state: typeof invocation.state === "string" ? invocation.state : undefined,
        result: invocation.result,
      },
    };
  }

  if (type === "tool-input-available") {
    return {
      type,
      toolName: typeof candidate.toolName === "string" ? candidate.toolName : undefined,
      toolCallId: typeof candidate.toolCallId === "string" ? candidate.toolCallId : undefined,
      input: candidate.input,
    };
  }

  if (type === "tool-output-available") {
    return {
      type,
      toolCallId: typeof candidate.toolCallId === "string" ? candidate.toolCallId : undefined,
      output: candidate.output,
    };
  }

  if (type === "dynamic-tool") {
    const toolName =
      typeof candidate.toolName === "string" ? candidate.toolName : null;
    const toolCallId =
      typeof candidate.toolCallId === "string" ? candidate.toolCallId : null;
    const state = typeof candidate.state === "string" ? candidate.state : null;
    if (!toolName || !toolCallId || !state) return null;

    return sanitizeToolLikePart(candidate, {
      type,
      toolCallId,
      toolName,
      state,
    });
  }

  if (type.startsWith("tool-") && !type.startsWith("tool-agent-") && type !== "data-tool-agent") {
    const toolCallId =
      typeof candidate.toolCallId === "string" ? candidate.toolCallId : null;
    const state = typeof candidate.state === "string" ? candidate.state : null;
    if (!toolCallId || !state) return null;

    return sanitizeToolLikePart(candidate, {
      type,
      toolCallId,
      state,
    });
  }

  return null;
}

function sanitizeToolLikePart(
  candidate: Record<string, unknown>,
  base: Record<string, unknown>
): Record<string, unknown> | null {
  const state = base.state;
  if (typeof state !== "string") return null;

  const part: Record<string, unknown> = {
    ...base,
    providerExecuted:
      typeof candidate.providerExecuted === "boolean"
        ? candidate.providerExecuted
        : undefined,
    preliminary:
      typeof candidate.preliminary === "boolean"
        ? candidate.preliminary
        : undefined,
    title: typeof candidate.title === "string" ? candidate.title : undefined,
  };

  if (
    state === "input-available" ||
    state === "approval-requested" ||
    state === "approval-responded" ||
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied"
  ) {
    part.input = candidate.input ?? {};
  }

  if (state === "input-streaming") {
    part.input = candidate.input;
  }

  if (state === "output-available") {
    part.output = candidate.output;
  }

  if (state === "output-error") {
    part.errorText =
      typeof candidate.errorText === "string"
        ? candidate.errorText
        : "Tool execution failed";
    part.rawInput = candidate.rawInput;
  }

  if (
    state === "approval-requested" ||
    state === "approval-responded" ||
    state === "output-available" ||
    state === "output-denied" ||
    state === "output-error"
  ) {
    if (candidate.approval && typeof candidate.approval === "object") {
      part.approval = candidate.approval;
    }
  }

  return part;
}

function sanitizeControlValues(
  controlValues: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(controlValues).map(([key, value]) => [key, sanitizeControlValue(value)])
  );
}

function sanitizeControlValue(value: unknown): unknown {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item) => sanitizeControlValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const candidate = value as Record<string, unknown>;

  if (
    "code" in candidate ||
    "name" in candidate ||
    "popular" in candidate
  ) {
    return {
      code: typeof candidate.code === "string" ? candidate.code : undefined,
      name: typeof candidate.name === "string" ? candidate.name : undefined,
      popular:
        typeof candidate.popular === "boolean" ? candidate.popular : undefined,
    };
  }

  if ("min" in candidate || "max" in candidate) {
    return {
      min:
        typeof candidate.min === "number" || typeof candidate.min === "string"
          ? candidate.min
          : undefined,
      max:
        typeof candidate.max === "number" || typeof candidate.max === "string"
          ? candidate.max
          : undefined,
    };
  }

  if ("id" in candidate && "airline" in candidate) {
    return {
      id: typeof candidate.id === "string" ? candidate.id : undefined,
      airline: typeof candidate.airline === "string" ? candidate.airline : undefined,
      departTime:
        typeof candidate.departTime === "string" ? candidate.departTime : undefined,
      arrivalTime:
        typeof candidate.arrivalTime === "string" ? candidate.arrivalTime : undefined,
      price: typeof candidate.price === "number" ? candidate.price : undefined,
      route: typeof candidate.route === "string" ? candidate.route : undefined,
      class: typeof candidate.class === "string" ? candidate.class : undefined,
    };
  }

  const shallowEntries = Object.entries(candidate).slice(0, 12).map(([key, entryValue]) => {
    if (entryValue instanceof Date) {
      return [key, Number.isNaN(entryValue.getTime()) ? null : entryValue.toISOString()];
    }

    if (
      entryValue === null ||
      typeof entryValue === "string" ||
      typeof entryValue === "number" ||
      typeof entryValue === "boolean"
    ) {
      return [key, entryValue];
    }

    return [key, String(entryValue)];
  });

  return Object.fromEntries(shallowEntries);
}
