'use client';

import { motion } from 'framer-motion';
import { Microphone, Stop, SpeakerHigh, SpeakerX } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface VoiceMicButtonProps {
  recording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
}

/** Mic toggle — hold or click to record, click again to stop */
export function VoiceMicButton({ recording, onStart, onStop, disabled, className }: VoiceMicButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={recording ? onStop : onStart}
      disabled={disabled}
      className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
        recording
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      title={recording ? 'Stop recording' : 'Voice input'}
    >
      {recording ? (
        <Stop weight="fill" className="w-4 h-4" />
      ) : (
        <Microphone weight="fill" className="w-4 h-4" />
      )}
      {recording && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-red-400"
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}

interface SpeakButtonProps {
  speaking: boolean;
  onSpeak: () => void;
  onStop: () => void;
  className?: string;
}

/** Small speaker icon to read AI messages aloud */
export function SpeakButton({ speaking, onSpeak, onStop, className }: SpeakButtonProps) {
  return (
    <button
      type="button"
      onClick={speaking ? onStop : onSpeak}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors',
        speaking
          ? 'text-blue-400 hover:text-blue-300'
          : 'text-white/40 hover:text-white/70',
        className,
      )}
      title={speaking ? 'Stop speaking' : 'Read aloud'}
    >
      {speaking ? (
        <SpeakerX weight="fill" className="w-3.5 h-3.5" />
      ) : (
        <SpeakerHigh weight="fill" className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
