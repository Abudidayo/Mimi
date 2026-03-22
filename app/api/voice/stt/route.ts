import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/voice/stt
 * Body: FormData with "audio" file (webm from MediaRecorder)
 * Returns: { text: string }
 *
 * Calls OpenAI Whisper directly with a travel-biased prompt
 * to improve recognition of place names and travel vocabulary.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const whisperForm = new FormData();
    whisperForm.append('file', audioFile, 'recording.webm');
    whisperForm.append('model', 'whisper-1');
    whisperForm.append(
      'prompt',
      'Travel planning conversation. Common topics: Tokyo, Kyoto, Osaka, Japan, Paris, France, Bali, Indonesia, Bangkok, Thailand, Seoul, Korea, London, Barcelona, Rome, Italy, New York, Dubai, Singapore, Hong Kong, Machu Picchu, Peru, Santorini, Greece, Maldives, Hawaii, Cancun, Mexico, itinerary, budget, travelers, hotel, Airbnb, hostel, flight, booking, excursion, sightseeing, cuisine.',
    );

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[STT Error] OpenAI response:', errText);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const { text } = await res.json();
    return NextResponse.json({ text });
  } catch (err) {
    console.error('[STT Error]', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
