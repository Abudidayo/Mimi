import '@/lib/zod-compat';
import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/mastra';
import { decodeActionPrompt } from '@/lib/chat/action-prompts';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const params = await req.json();
  const normalizedParams =
    params && typeof params === 'object' && Array.isArray((params as { messages?: unknown[] }).messages)
      ? {
          ...params,
          messages: (params as { messages: unknown[] }).messages.map((message) => {
            if (!message || typeof message !== 'object') return message;
            const candidate = message as { parts?: unknown[] };
            if (!Array.isArray(candidate.parts)) return message;

            return {
              ...message,
              parts: candidate.parts.map((part) => {
                if (!part || typeof part !== 'object') return part;
                const record = part as { type?: unknown; text?: unknown };
                if (record.type !== 'text' || typeof record.text !== 'string') return part;

                const decoded = decodeActionPrompt(record.text);
                return {
                  ...part,
                  text: decoded.promptText,
                };
              }),
            };
          }),
        }
      : params;

  if (normalizedParams && typeof normalizedParams === 'object' && Array.isArray((normalizedParams as { messages?: unknown[] }).messages)) {
    const messages = (normalizedParams as { messages: Array<{ role?: string; parts?: Array<{ type?: string; text?: string }> }> }).messages;
    const lastUserMessage = [...messages].reverse().find((message) => message?.role === 'user');
    const lastUserText = lastUserMessage?.parts
      ?.filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('\n')
      .trim();

    console.groupCollapsed('[api/plan-trip] normalized request');
    console.log('messageCount', messages.length);
    console.log('lastUserText', lastUserText ?? '(none)');
    console.groupEnd();
  }

  const stream = await handleChatStream({
    mastra,
    agentId: 'supervisor',
    params: normalizedParams,
  });

  const normalizedStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const reader = (stream as ReadableStream<unknown>).getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value || typeof value !== 'object') continue;

        const part = value as Record<string, unknown>;
        writer.write(part as never);

        if (part.type !== 'tool-output-available') continue;

        const output = part.output;
        if (!output || typeof output !== 'object') continue;

        const subAgentToolResults = (output as { subAgentToolResults?: unknown }).subAgentToolResults;
        if (!Array.isArray(subAgentToolResults)) continue;

        for (const nestedResult of subAgentToolResults) {
          if (!nestedResult || typeof nestedResult !== 'object') continue;

          const toolCall = nestedResult as {
            toolCallId?: string;
            toolName?: string;
            args?: unknown;
            result?: unknown;
          };

          if (!toolCall.toolCallId || !toolCall.toolName) continue;

          writer.write({
            type: 'tool-input-available',
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input: toolCall.args ?? {},
          } as never);

          writer.write({
            type: 'tool-output-available',
            toolCallId: toolCall.toolCallId,
            output: toolCall.result ?? null,
          } as never);
        }
      }
    },
  });

  return createUIMessageStreamResponse({ stream: normalizedStream });
}
