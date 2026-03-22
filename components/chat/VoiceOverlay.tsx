'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microphone, Stop, SpeakerHigh, SpeakerX, SpeakerSlash } from '@phosphor-icons/react';
import { useVoice } from '@/hooks/useVoice';

interface VoiceOverlayProps {
  onTranscription: (text: string) => void;
  latestAssistantText?: string;
  isLoading?: boolean;
}

export function VoiceOverlay({ onTranscription, latestAssistantText, isLoading }: VoiceOverlayProps) {
  const { recording, startRecording, stopRecording, speak, stopSpeaking, speaking, error } = useVoice();
  const [showError, setShowError] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastSpokenRef = useRef<string | null>(null);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const t = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Auto-speak when a new assistant message finishes streaming
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && latestAssistantText && !muted) {
      if (latestAssistantText !== lastSpokenRef.current) {
        lastSpokenRef.current = latestAssistantText;
        speak(latestAssistantText);
      }
    }
    wasLoadingRef.current = !!isLoading;
  }, [isLoading, latestAssistantText, muted, speak]);

  const handleMicToggle = useCallback(async () => {
    if (recording) {
      const text = await stopRecording();
      if (text) onTranscription(text);
    } else {
      await startRecording();
    }
  }, [recording, startRecording, stopRecording, onTranscription]);

  // Single speaker button: speaking → stop, muted → unmute + replay, idle → mute
  const handleSpeakerClick = useCallback(() => {
    if (speaking) {
      // Stop current speech and mute
      stopSpeaking();
      setMuted(true);
    } else if (muted) {
      // Unmute and replay latest
      setMuted(false);
      if (latestAssistantText) {
        lastSpokenRef.current = latestAssistantText;
        speak(latestAssistantText);
      }
    } else {
      // Not speaking, not muted — replay latest message
      if (latestAssistantText) {
        lastSpokenRef.current = latestAssistantText;
        speak(latestAssistantText);
      }
    }
  }, [speaking, muted, stopSpeaking, latestAssistantText, speak]);

  const speakerIcon = speaking
    ? <SpeakerX weight="fill" className="w-5 h-5 text-white" />
    : muted
      ? <SpeakerSlash weight="fill" className="w-5 h-5 text-red-400" />
      : <SpeakerHigh weight="fill" className="w-5 h-5 text-white/70" />;

  const speakerBg = speaking
    ? 'linear-gradient(180deg, #f87360 0%, #e84e30 100%)'
    : muted
      ? 'rgba(239,68,68,0.25)'
      : 'rgba(255,255,255,0.12)';

  return (
    <div className="fixed bottom-28 right-6 z-50 flex flex-col items-center gap-2">
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-10 right-0 whitespace-nowrap rounded-lg bg-red-500/90 px-3 py-1.5 text-xs text-white shadow-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speaker — stop / mute / unmute+replay */}
      {latestAssistantText && (
        <motion.button
          type="button"
          onClick={handleSpeakerClick}
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-colors"
          style={{
            background: speakerBg,
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(12px)',
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          title={speaking ? 'Stop & mute' : muted ? 'Unmute Mimi' : 'Replay last reply'}
        >
          {speakerIcon}
        </motion.button>
      )}

      {/* Mic */}
      <motion.button
        type="button"
        onClick={handleMicToggle}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg relative"
        style={{
          background: recording
            ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(180deg, rgba(116,177,255,0.95) 0%, rgba(71,126,255,0.95) 100%)',
          boxShadow: recording
            ? '0 4px 20px rgba(239,68,68,0.4)'
            : '0 4px 20px rgba(71,126,255,0.3)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        title={recording ? 'Stop recording' : 'Voice input'}
      >
        {recording ? (
          <Stop weight="fill" className="w-5 h-5 text-white" />
        ) : (
          <Microphone weight="fill" className="w-5 h-5 text-white" />
        )}
        {recording && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-red-300"
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </motion.button>
    </div>
  );
}
