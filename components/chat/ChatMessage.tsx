"use client";

import { motion } from "framer-motion";
import { Sparkle, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { InlineUIRenderer } from "@/lib/inline-ui/renderer";
import { AgentPanel, type AgentData, type AgentType } from "@/components/AgentPanel";
import { ActionButtons } from "@/components/chat/ActionButtons";
import { BrowserTimeline } from "@/components/chat/BrowserTimeline";
import { extractAgentData } from "@/lib/chat/agent-data";
import { decodeActionPrompt } from "@/lib/chat/action-prompts";

interface ChatMessageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
  isLastAssistant: boolean;
  isLoading: boolean;
  controlValues: Record<string, unknown>;
  onControlChange: (id: string, value: unknown) => void;
  onAction?: (prompt: string) => void;
  onOpenPlanner?: () => void;
}

export function ChatMessage({
  message,
  isLastAssistant,
  isLoading,
  controlValues,
  onControlChange,
  onAction,
  onOpenPlanner,
}: ChatMessageProps) {
  const parts = message.parts as unknown[] | undefined;
  const { agentData, loadingAgents } = message.role === 'assistant'
    ? extractAgentData(parts)
    : { agentData: {} as AgentData, loadingAgents: new Set<AgentType>() };

  const showAgentPanel =
    message.role === 'assistant' &&
    (Object.keys(agentData).length > 0 || loadingAgents.size > 0);
  const isBookingInProgress =
    message.role === 'assistant' &&
    loadingAgents.has('booking') &&
    !agentData.booking;

  const textParts = (parts?.filter(
    (p) => (p as { type?: string }).type === 'text'
  ) as Array<{ type: 'text'; text: string }> | undefined) ?? [];
  const text =
    (textParts.map((part) => part.text).join('') || message.content) ??
    '';
  const userVisibleText =
    message.role === 'user'
      ? decodeActionPrompt(text).displayText
      : text;
  const hasText = text.trim().length > 0;
  const showActionButtons =
    isLastAssistant &&
    message.role === 'assistant' &&
    !!onAction &&
    (hasText || showAgentPanel);

  if (message.role === 'assistant' && !hasText && !showAgentPanel && !showActionButtons) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        "flex w-full min-w-0 gap-2 sm:gap-3",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role === 'assistant' && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: 'linear-gradient(to bottom, #f87360, #e84e30, #d93c20)',
            boxShadow: '0 4px 0 #a82610, inset 0 2px 0 rgba(255,200,185,0.4), 0 5px 12px rgba(215,60,32,0.3)',
          }}
        >
          <Sparkle weight="fill" className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={cn(
          message.role === "user"
            ? "max-w-[min(85%,20rem)] rounded-2xl px-3 py-3 text-white shadow-sm sm:max-w-[85%] sm:px-4"
            : "min-w-0 w-0 flex-1 py-1 sm:max-w-[min(100%,52rem)] sm:w-auto sm:flex-none"
        )}
        style={
          message.role === 'user'
            ? {
                background: 'linear-gradient(135deg, rgba(61,126,204,0.6), rgba(29,77,158,0.6))',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
              }
            : undefined
        }
      >
        <div className={cn('text-sm', message.role === 'user' ? 'text-white' : 'text-white/88')}>
          {message.role === 'assistant' && hasText ? (
            <InlineUIRenderer
              text={text}
              controlValues={controlValues}
              onControlChange={onControlChange}
            />
          ) : message.role === 'user' ? (
            <p className="whitespace-pre-wrap m-0">{userVisibleText}</p>
          ) : null}
        </div>
        {isBookingInProgress && (
          <BrowserTimeline active />
        )}
        {showAgentPanel && (
          <AgentPanel
            data={agentData}
            loading={loadingAgents}
            onAction={onAction}
            controlValues={controlValues}
            onControlChange={onControlChange}
          />
        )}
        {showActionButtons && (
          <ActionButtons
            agentData={agentData}
            controlValues={controlValues}
            assistantText={text}
            onAction={onAction}
            onOpenPlanner={onOpenPlanner}
            isLoading={isLoading}
          />
        )}
      </div>

      {message.role === 'user' && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <User weight="bold" className="w-4 h-4 text-white/65" />
        </div>
      )}
    </motion.div>
  );
}
