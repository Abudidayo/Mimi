'use client';

import { useState, useRef, useCallback } from 'react';

interface UseVoiceReturn {
  recording: boolean;
  startRecording: () => void;
  stopRecording: () => Promise<string | null>;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  speaking: boolean;
  error: string | null;
}

/**
 * Voice hook.
 * STT: MediaRecorder → /api/voice/stt (OpenAI Whisper)
 * TTS: OpenAI tts-1 (nova) via /api/voice/tts — high quality voice
 *      Fetches audio for the full text, plays as soon as ready.
 */
export function useVoice(): UseVoiceReturn {
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied');
      console.error('[useVoice] mic error', err);
    }
  }, []);

  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        setRecording(false);
        recorder.stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size === 0) { resolve(null); return; }

        try {
          const form = new FormData();
          form.append('audio', blob, 'recording.webm');

          const res = await fetch('/api/voice/stt', { method: 'POST', body: form });
          if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || 'STT request failed');
          }
          const { text } = await res.json();
          resolve(text ?? null);
        } catch (err) {
          console.error('[useVoice] STT error', err);
          setError('Transcription failed');
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, []);

  const speak = useCallback(async (text: string) => {
    setError(null);
    cancelledRef.current = false;

    // Stop any ongoing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Replace inline UI controls with their default values for natural speech
    // Country picker: {{::country[id|JP]}} → "Japan"
    const COUNTRY_NAMES: Record<string, string> = {
      JP: 'Japan', US: 'United States', GB: 'United Kingdom', FR: 'France',
      ID: 'Indonesia', TH: 'Thailand', KR: 'South Korea', IT: 'Italy',
      ES: 'Spain', DE: 'Germany', AU: 'Australia', MX: 'Mexico',
      GR: 'Greece', PT: 'Portugal', BR: 'Brazil', IN: 'India',
      CN: 'China', SG: 'Singapore', AE: 'UAE', NZ: 'New Zealand',
      CA: 'Canada', TR: 'Turkey', EG: 'Egypt', MA: 'Morocco',
      PE: 'Peru', CO: 'Colombia', VN: 'Vietnam', PH: 'Philippines',
      MY: 'Malaysia', HK: 'Hong Kong', MV: 'Maldives', HR: 'Croatia',
      CZ: 'Czech Republic', NL: 'Netherlands', SE: 'Sweden', NO: 'Norway',
      CH: 'Switzerland', AT: 'Austria', IE: 'Ireland', IS: 'Iceland',
    };
    const clean = text
      // Country picker → country name
      .replace(/\{\{::country\[(\w+)\|(\w+)\]\}\}/g, (_m, _id, code) => COUNTRY_NAMES[code] ?? code)
      // Date picker → readable date
      .replace(/\{\{::date-picker\[(\w+)\|(\d{4}-\d{2}-\d{2})\]\}\}/g, (_m, _id, date) => {
        try {
          return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch { return date; }
      })
      // Date picker with no valid date
      .replace(/\{\{::date-picker\[[^\]]*\]\}\}/g, '')
      // Stepper (budget): {{+[$budget|3000]-}} → "$3000"
      .replace(/\{\{\+\[\$(\w+)\|(\d+)\]-\}\}/g, (_m, _id, val) => `$${val}`)
      // Stepper (regular): {{+[travelers|2]-}} → "2"
      .replace(/\{\{\+\[(\w+)\|(\d+)\]-\}\}/g, (_m, _id, val) => val)
      // Select: {{::select[pace|relaxed,moderate,packed]}} → "relaxed"
      .replace(/\{\{::select\[\w+\|([^,\]]+)[^\]]*\]\}\}/g, (_m, first) => first)
      // Toggles checked: {{[x] Culture & history}} → "Culture and history"
      .replace(/\{\{[xX]\]\s*([^}]+)\}\}/g, (_m, label) => label.trim())
      // Toggles unchecked: {{[ ] Adventure}} → remove
      .replace(/\{\{\[\s\]\s*([^}]+)\}\}/g, '')
      // Any remaining controls
      .replace(/\{\{[^}]*\}\}/g, '')
      // Strip markdown
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Clean up symbols
      .replace(/·/g, ', ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!clean) return;

    // Limit to ~800 chars for faster TTS response (covers the key info)
    const trimmed = clean.length > 800 ? clean.slice(0, 797) + '...' : clean;

    try {
      setSpeaking(true);

      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok || cancelledRef.current) {
        setSpeaking(false);
        return;
      }

      const audioBlob = await res.blob();
      if (cancelledRef.current) { setSpeaking(false); return; }

      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      if (!cancelledRef.current) {
        console.error('[useVoice] TTS error', err);
        setError('Speech failed');
      }
      setSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    cancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  return { recording, startRecording, stopRecording, speak, stopSpeaking, speaking, error };
}
