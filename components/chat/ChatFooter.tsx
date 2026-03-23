"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, PaperPlaneRight, User, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ChatFooterProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  variant?: "footer" | "inline" | "confirm";
  onConfirmChanges?: () => void;
  onCancelChanges?: () => void;
}

export function ChatFooter({
  inputValue,
  onInputChange,
  isLoading,
  onSubmit,
  variant = "footer",
  onConfirmChanges,
  onCancelChanges,
}: ChatFooterProps) {
  const inlineTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [inlineHeight, setInlineHeight] = useState(26);
  const inlinePlaceholder = "Ask mimi anything...";

  useLayoutEffect(() => {
    if (variant !== "inline") return;

    const textarea = inlineTextareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(220, Math.max(26, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    setInlineHeight(nextHeight);
  }, [inputValue, variant]);

  if (variant === "confirm") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex justify-end gap-3 max-sm:min-w-0 max-sm:w-full max-sm:flex-wrap max-sm:gap-2"
      >
        <motion.div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2.5 text-white backdrop-blur-[12px] max-sm:min-w-0 max-sm:max-w-full max-sm:gap-2",
          )}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
        >
          <span className="text-sm font-semibold text-white/88 pr-1">
            Apply edits
          </span>

          <motion.button
            type="button"
            onClick={onCancelChanges}
            disabled={isLoading}
            className="h-10 min-w-10 px-3 rounded-full flex items-center justify-center gap-1.5 border border-white/12 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "rgba(14,26,68,0.32)" }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            <X weight="bold" className="w-4.5 h-4.5" />
            <span className="text-sm font-semibold">Cancel</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={onConfirmChanges}
            disabled={isLoading}
            className="h-10 min-w-10 px-3 rounded-full flex items-center justify-center gap-1.5 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(180deg, #58df8c 0%, #25c965 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.16), 0 5px 12px rgba(12,110,48,0.12)",
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            <Check weight="bold" className="w-4.5 h-4.5" />
            <span className="text-sm font-semibold">Apply</span>
          </motion.button>
        </motion.div>

        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <User weight="bold" className="w-4 h-4 text-white/65" />
        </div>
      </motion.div>
    );
  }

  if (variant === "inline") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex justify-end gap-3 max-sm:min-w-0 max-sm:flex-wrap max-sm:items-end max-sm:gap-2"
      >
        <motion.div
          className={cn(
            "min-w-0 w-[360px] rounded-2xl border border-white/15 px-5 py-3 text-white shadow-sm backdrop-blur-[12px] max-sm:w-full max-sm:max-w-[min(648px,calc(100vw-2.5rem))] max-sm:px-4",
            isFocused && "w-[min(648px,calc(100vw-3rem))] max-sm:w-full"
          )}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          style={{
            background:
              "linear-gradient(135deg, rgba(61,126,204,0.55), rgba(29,77,158,0.55))",
          }}
        >
          <form onSubmit={onSubmit} className="relative">
            <textarea
              ref={inlineTextareaRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={inlinePlaceholder}
              disabled={isLoading}
              rows={1}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && inputValue.trim()) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }
              }}
              className={cn(
                "w-full pr-14 pt-1 bg-transparent text-white placeholder:text-white/50 resize-none overflow-hidden",
                "text-[15px] font-medium",
                "focus:outline-none leading-7",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200",
              )}
              style={{ minHeight: `${inlineHeight}px` }}
            />
            <motion.button
              type="submit"
              disabled={isLoading || !inputValue?.trim()}
              className="absolute right-0 bottom-0 w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(180deg, rgba(116,177,255,0.95) 0%, rgba(71,126,255,0.95) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.22), 0 7px 16px rgba(48,111,255,0.16)",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
            >
              <PaperPlaneRight
                weight="fill"
                className={cn(
                  "w-4 h-4",
                  inputValue?.trim() && !isLoading
                    ? "text-white"
                    : "text-white/55",
                )}
              />
            </motion.button>
          </form>
        </motion.div>

        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <User weight="bold" className="w-4 h-4 text-white/65" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="shrink-0"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(16,40,100,0.45)",
        backdropFilter: "blur(20px)",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto max-w-3xl px-4 py-3 max-sm:px-3">
        <form onSubmit={onSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask mimi anything..."
            disabled={isLoading}
            className={cn(
              "w-full rounded-full py-3 pl-5 pr-12",
              "bg-white text-gray-800 placeholder:text-gray-400",
              "text-sm font-medium max-sm:text-base",
              "focus:outline-none focus:ring-4 focus:ring-blue-300/40",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200",
            )}
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
          />
          <motion.button
            type="submit"
            disabled={isLoading || !inputValue?.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background:
                "linear-gradient(to bottom, #f87360 0%, #e84e30 55%, #d93c20 100%)",
              boxShadow:
                "0 4px 0 #a82610, inset 0 2px 0 rgba(255,200,185,0.45), 0 6px 16px rgba(215,60,32,0.35)",
            }}
            whileHover={{
              y: -2,
              boxShadow:
                "0 6px 0 #a82610, inset 0 2px 0 rgba(255,200,185,0.45), 0 8px 20px rgba(215,60,32,0.4)",
            }}
            whileTap={{
              y: 3,
              boxShadow:
                "0 1px 0 #a82610, inset 0 2px 0 rgba(255,200,185,0.45), 0 3px 8px rgba(215,60,32,0.25)",
            }}
          >
            <PaperPlaneRight
              weight="fill"
              className={cn(
                "w-4 h-4",
                inputValue?.trim() && !isLoading
                  ? "text-white"
                  : "text-white/60",
              )}
            />
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
