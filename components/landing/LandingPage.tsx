"use client";

import { useCallback } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CloudShape } from "./CloudShape";
import Image from "next/image";
import { SessionHistoryMenu } from "./SessionHistoryMenu";
import type { PersistedChatSession } from "@/lib/chatPersistence";

// ─── Deterministic star field (LCG seeded — no SSR hydration mismatch) ────────
interface StarDot {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  warm: boolean;
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rand = lcg(0x1a2b3c4d);
const STARS: StarDot[] = Array.from({ length: 110 }, (_, i) => ({
  id: i,
  x: rand() * 100,
  y: rand() * 100,
  size: rand() * 2.4 + 0.6,
  opacity: rand() * 0.55 + 0.2,
  duration: rand() * 3 + 2,
  delay: rand() * 6,
  warm: rand() > 0.6,
}));

const LUCKY_PROMPT = "Surprise me with an incredible trip idea";

interface LandingPageProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSuggestionClick: (prompt: string) => void;
  sessions: PersistedChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onSessionRename: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
}

export function LandingPage({
  inputValue,
  onInputChange,
  isLoading,
  onSubmit,
  onSuggestionClick,
  sessions,
  onSessionSelect,
  onSessionRename,
  onSessionDelete,
}: LandingPageProps) {
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);
  const smoothX = useSpring(rawX, { stiffness: 45, damping: 18, mass: 0.6 });
  const smoothY = useSpring(rawY, { stiffness: 45, damping: 18, mass: 0.6 });

  const starsX = useTransform(smoothX, [0, 1], [-18, 18]);
  const starsY = useTransform(smoothY, [0, 1], [-12, 12]);
  const cloudsFarX = useTransform(smoothX, [0, 1], [-8, 8]);
  const cloudsFarY = useTransform(smoothY, [0, 1], [-4, 4]);
  const cloudsNearX = useTransform(smoothX, [0, 1], [-14, 14]);
  const cloudsNearY = useTransform(smoothY, [0, 1], [-7, 7]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      rawX.set((e.clientX - rect.left) / rect.width);
      rawY.set((e.clientY - rect.top) / rect.height);
    },
    [rawX, rawY]
  );

  return (
    <motion.div
      key="landing"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden px-4 max-sm:pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] max-sm:pt-[max(1.25rem,env(safe-area-inset-top,0px))]"
      onMouseMove={handleMouseMove}
    >
      {/* ── Star field ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ x: starsX, y: starsY }}
      >
        {STARS.map((star) => (
          <motion.span
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              background: star.warm ? "#ffe8a0" : "#ffffff",
              boxShadow: star.warm
                ? `0 0 ${star.size * 2}px rgba(255,232,140,0.7)`
                : `0 0 ${star.size}px rgba(255,255,255,0.5)`,
            }}
            animate={{ opacity: [star.opacity, Math.min(star.opacity * 2.4, 1), star.opacity] }}
            transition={{ duration: star.duration, repeat: Infinity, delay: star.delay, ease: "easeInOut" }}
          />
        ))}
      </motion.div>

      {/* ── Clouds — far layer ── */}
      <motion.div className="absolute pointer-events-none" style={{ x: cloudsFarX, y: cloudsFarY, top: "12%", left: "-2%" }}>
        <motion.div animate={{ y: [0, -10, 0], x: [0, 6, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
          <CloudShape scale={0.85} />
        </motion.div>
      </motion.div>

      <motion.div className="absolute pointer-events-none" style={{ x: cloudsFarX, y: cloudsFarY, top: "58%", right: "-4%" }}>
        <motion.div animate={{ y: [0, 8, 0], x: [0, -8, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>
          <CloudShape scale={1.1} />
        </motion.div>
      </motion.div>

      {/* ── Clouds — near layer ── */}
      <motion.div className="absolute pointer-events-none" style={{ x: cloudsNearX, y: cloudsNearY, bottom: "18%", left: "4%" }}>
        <motion.div animate={{ y: [0, -14, 0], x: [0, 10, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}>
          <CloudShape scale={1.25} />
        </motion.div>
      </motion.div>

      <motion.div className="absolute pointer-events-none" style={{ x: cloudsNearX, y: cloudsNearY, top: "20%", right: "3%" }}>
        <motion.div animate={{ y: [0, -12, 0], x: [0, -6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4.5 }}>
          <CloudShape scale={0.9} />
        </motion.div>
      </motion.div>

      {/* ── Ambient glow ── */}
      <div
        className="pointer-events-none absolute h-[220px] w-[600px] max-sm:h-40 max-sm:w-[min(600px,92vw)]"
        style={{
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, rgba(255,120,90,0.12) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* ── Hero text ── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mb-10 select-none text-start max-sm:mb-5 max-sm:flex max-sm:w-full max-sm:max-w-[min(100%,28rem)] max-sm:flex-col max-sm:items-center max-sm:text-center"
      >
        <p className="-rotate-8 font-fredoka text-2xl font-semibold text-white/75 max-sm:text-lg">
          Travel with
        </p>
        <motion.div
          className="max-sm:w-full"
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/assets/mimi-ballon.png"
            alt="mimi"
            width={3150}
            height={1334}
            priority
            className="mx-auto h-80 w-full max-sm:h-[clamp(7.5rem,36vw,10rem)] max-sm:max-w-[min(100%,24rem)] max-sm:object-contain"
          />
        </motion.div>
      </motion.div>

      {/* ── Input + pill suggestions ── */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="mb-5 max-sm:mb-4">
          <form onSubmit={onSubmit} className="relative min-w-0">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Where do you want to go?"
              disabled={isLoading}
              className={cn(
                "w-full rounded-full py-4 pl-6 pr-16 max-sm:min-h-12 max-sm:py-3.5 max-sm:pl-5 max-sm:pr-14",
                "bg-white text-gray-800 placeholder:text-gray-400",
                "text-base font-medium",
                "focus:outline-none focus:ring-4 focus:ring-blue-300/40",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200"
              )}
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12)" }}
            />
            <motion.button
              type="submit"
              disabled={isLoading || !inputValue?.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "radial-gradient(ellipse at 50% 20%, #ffcbb8 0%, #f87868 30%, #e84830 65%, #c83018 100%)",
                boxShadow: "inset 0 2px 10px rgba(255,220,205,0.6), inset 0 -6px 14px rgba(0,0,0,0.18), 0 10px 28px rgba(160,36,14,0.45)",
              }}
              whileHover={{ scale: 1.1, transition: { type: "spring", stiffness: 800, damping: 20 } }}
              whileTap={{ scale: 0.93, transition: { type: "spring", stiffness: 1000, damping: 30 } }}
              transition={{ type: "spring", stiffness: 800, damping: 20 }}
            >
              <PaperPlaneRight weight="fill" className="w-5 h-5 text-white" />
            </motion.button>
          </form>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <motion.button
            initial={{ opacity: 0, y: 14, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
            transition={{ type: "spring", stiffness: 800, damping: 20 }}
            onClick={() => onSuggestionClick(LUCKY_PROMPT)}
            disabled={isLoading}
            className="px-7 py-3 rounded-full text-sm font-bold text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
            style={{
              background: "radial-gradient(ellipse at 50% 15%, #ffd7c6 0%, #ff9f7b 28%, #f06545 62%, #cd3c1e 100%)",
              boxShadow: [
                "inset 0 2px 10px rgba(255,228,214,0.58)",
                "inset 0 -6px 14px rgba(0,0,0,0.18)",
                "0 10px 28px rgba(168,53,28,0.42)",
              ].join(", "),
            }}
            whileHover={{ scale: 1.08, transition: { type: "spring", stiffness: 800, damping: 20 } }}
            whileTap={{ scale: 0.93, transition: { type: "spring", stiffness: 1000, damping: 30 } }}
          >
            I&apos;m feeling lucky
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 } }}
          >
            <SessionHistoryMenu
              sessions={sessions}
              onSelect={onSessionSelect}
              onRename={onSessionRename}
              onDelete={onSessionDelete}
              triggerLabel="History"
              triggerVariant="pill"
              triggerStyle={{
                background: "radial-gradient(ellipse at 50% 15%, #d7e8ff 0%, #8dbdff 28%, #4e8ff3 62%, #2a64cf 100%)",
                boxShadow: [
                  "inset 0 2px 10px rgba(223,238,255,0.58)",
                  "inset 0 -6px 14px rgba(0,0,0,0.18)",
                  "0 10px 28px rgba(34,82,170,0.4)",
                ].join(", "),
                border: "none",
              }}
            />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
