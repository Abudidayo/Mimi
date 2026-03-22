import { NextResponse } from 'next/server';
import { getVoice } from '@/lib/voice/provider';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/voice/tts
 * Body: { text: string, speaker?: string }
 * Returns: audio/mpeg stream
 */
export async function POST(req: Request) {
  try {
    const { text, speaker } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const voice = getVoice();
    const audioStream = await voice.speak(text, {
      speaker: speaker ?? undefined,
    });

    // Convert Node readable stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        const nodeStream = audioStream as NodeJS.ReadableStream;
        nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', (err) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[TTS Error]', err);
    return NextResponse.json(
      { error: 'TTS failed' },
      { status: 500 },
    );
  }
}
