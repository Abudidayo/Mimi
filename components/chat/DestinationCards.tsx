"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Star } from "@phosphor-icons/react";
import { CONTROL_COLORS, pillBoxShadow } from "@/lib/inline-ui/colors";
import { encodeActionPrompt } from "@/lib/chat/action-prompts";
import type { SuggestionsData } from "@/mastra/agents/suggestions";

interface DestinationCardsProps {
  data: SuggestionsData;
  onAction?: (prompt: string) => void;
}

function FlagAvatar({ code, name }: { code: string; name: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={name}
      className="w-5 h-5 rounded-full object-cover shrink-0"
    />
  );
}

function DestinationCard({
  suggestion,
  index,
  onAction,
}: {
  suggestion: SuggestionsData["suggestions"][number];
  index: number;
  onAction?: (prompt: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const color = CONTROL_COLORS[index % CONTROL_COLORS.length];

  const imageUrl = `/api/image?q=${encodeURIComponent(suggestion.imageQuery)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.08,
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      {/* Image */}
      <div className="relative h-36 shrink-0 overflow-hidden">
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={suggestion.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: color.gradient }}
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

        {/* Destination name on image */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 flex items-end justify-between">
          <div>
            <p className="text-white font-semibold text-base leading-tight drop-shadow-lg">
              {suggestion.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <FlagAvatar
                code={suggestion.countryCode}
                name={suggestion.country}
              />
              <span className="text-white/70 text-xs font-medium drop-shadow">
                {suggestion.country}
              </span>
            </div>
          </div>
          <div
            className="text-[10px] font-semibold text-white/80 px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(0,0,0,0.45)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(6px)",
            }}
          >
            {suggestion.bestFor}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2 flex-1">
        {/* Tagline */}
        <p className="text-white/90 text-sm font-semibold leading-snug">
          {suggestion.tagline}
        </p>

        {/* Highlights */}
        <div className="flex flex-wrap gap-1">
          {suggestion.highlights.map((h) => (
            <span
              key={h}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Star weight="fill" className="w-2.5 h-2.5 opacity-60" />
              {h}
            </span>
          ))}
        </div>

        {/* CTA */}
        {onAction && (
          <motion.button
            onClick={() =>
              onAction(
                encodeActionPrompt(
                  `Plan a trip to ${suggestion.name}, ${suggestion.country}`,
                  `Plan a trip to ${suggestion.name}, ${suggestion.country}`,
                ),
              )
            }
            className="mt-auto flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-sm font-semibold text-white"
            style={{
              background: color.gradient,
              boxShadow: pillBoxShadow(color, "sm"),
            }}
            whileHover={{
              scale: 1.03,
              transition: { type: "spring", stiffness: 800, damping: 20 },
            }}
            whileTap={{
              scale: 0.96,
              transition: { type: "spring", stiffness: 1000, damping: 30 },
            }}
          >
            <MapPin weight="fill" className="w-3.5 h-3.5" />
            <span>Plan this trip</span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export function DestinationCards({ data, onAction }: DestinationCardsProps) {
  if (!data?.suggestions?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mt-3 grid grid-cols-2 gap-3"
    >
      {data.suggestions.map((s, i) => (
        <DestinationCard
          key={`${s.countryCode}-${s.name}`}
          suggestion={s}
          index={i}
          onAction={onAction}
        />
      ))}
    </motion.div>
  );
}
