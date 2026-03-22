import { OpenAIVoice } from '@mastra/voice-openai';

let _voice: OpenAIVoice | null = null;

/**
 * Singleton OpenAI voice provider for TTS (tts-1) and STT (whisper-1).
 * Requires OPENAI_API_KEY in env.
 */
export function getVoice(): OpenAIVoice {
  if (!_voice) {
    _voice = new OpenAIVoice({
      speechModel: { name: 'tts-1', apiKey: process.env.OPENAI_API_KEY },
      listeningModel: { name: 'whisper-1', apiKey: process.env.OPENAI_API_KEY },
      speaker: 'nova', // friendly female voice — good for a travel assistant
    });
  }
  return _voice;
}
