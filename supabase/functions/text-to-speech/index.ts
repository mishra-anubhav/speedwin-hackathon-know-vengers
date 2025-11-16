import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Split text into chunks at sentence boundaries, respecting the 4096 char limit
function splitTextIntoChunks(text: string, maxLength: number = 4000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    // If a single sentence is too long, split by words
    if (sentence.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      const words = sentence.split(' ');
      for (const word of words) {
        if ((currentChunk + ' ' + word).length > maxLength) {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + word;
        }
      }
    } else if ((currentChunk + ' ' + sentence).length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Generate audio for a single chunk
async function generateAudioChunk(text: string, voice: string, apiKey: string): Promise<ArrayBuffer> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI TTS error:', response.status, errorText);
    throw new Error(`OpenAI TTS error: ${response.status}`);
  }

  return await response.arrayBuffer();
}

// Concatenate multiple MP3 buffers
function concatenateMP3Buffers(buffers: ArrayBuffer[]): Uint8Array {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return result;
}

// Safe Uint8Array -> base64 without stack overflow
function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000; // 32KB
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    let s = '';
    for (let j = 0; j < chunk.length; j++) s += String.fromCharCode(chunk[j]);
    parts.push(s);
  }
  return btoa(parts.join(''));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "alloy" } = await req.json();
    console.log('Generating speech for text length:', text?.length);

    if (!text) {
      throw new Error('Text is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Split text into chunks if needed
    const chunks = splitTextIntoChunks(text);
    console.log(`Split into ${chunks.length} chunks`);

    // Generate audio for each chunk
    const audioBuffers: ArrayBuffer[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Generating chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
      const audioBuffer = await generateAudioChunk(chunks[i], voice, OPENAI_API_KEY);
      audioBuffers.push(audioBuffer);
    }

    // Concatenate all audio buffers
    const combinedAudio = concatenateMP3Buffers(audioBuffers);

    // Convert to base64 safely
    const base64Audio = uint8ToBase64(combinedAudio);

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in text-to-speech function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
