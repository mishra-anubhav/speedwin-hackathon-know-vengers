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
function concatenateMP3Buffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return result.buffer;
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

// Clean script text by removing stage directions and formatting
function cleanScriptText(text: string): string {
  return text
    // Remove content in parentheses (stage directions)
    .replace(/\([^)]*\)/g, '')
    // Remove asterisks (formatting)
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove empty lines
    .replace(/^\s*[\r\n]/gm, '')
    .trim();
}

// Parse script into segments with speaker info
interface ScriptSegment {
  speaker: 'host' | 'interviewer';
  text: string;
}

function parseScript(text: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.toLowerCase().startsWith('host:')) {
      segments.push({
        speaker: 'host',
        text: cleanScriptText(trimmed.substring(5).trim())
      });
    } else if (trimmed.toLowerCase().startsWith('interviewer:')) {
      segments.push({
        speaker: 'interviewer',
        text: cleanScriptText(trimmed.substring(12).trim())
      });
    } else {
      // If no label, treat as host
      const cleaned = cleanScriptText(trimmed);
      if (cleaned) {
        segments.push({
          speaker: 'host',
          text: cleaned
        });
      }
    }
  }
  
  return segments;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    console.log('Generating speech for text length:', text?.length);

    if (!text) {
      throw new Error('Text is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Parse script into segments with speakers
    const segments = parseScript(text);
    console.log(`Parsed ${segments.length} dialogue segments`);

    // Voice mapping
    const voiceMap = {
      host: 'alloy',
      interviewer: 'nova'
    };

    // Generate audio for each segment
    const audioBuffers: ArrayBuffer[] = [];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const voice = voiceMap[segment.speaker];
      
      console.log(`Generating audio for segment ${i + 1}/${segments.length} (${segment.speaker})`);
      
      // Split long segments into chunks
      const chunks = splitTextIntoChunks(segment.text, 4000);
      for (const chunk of chunks) {
        const audioBuffer = await generateAudioChunk(chunk, voice, OPENAI_API_KEY);
        audioBuffers.push(audioBuffer);
      }
    }

    // Concatenate all audio buffers
    const combinedAudio = concatenateMP3Buffers(audioBuffers);
    console.log('Combined audio bytes:', combinedAudio.byteLength);

    // Return base64-encoded MP3 as JSON (easier for clients)
    const base64Audio = uint8ToBase64(new Uint8Array(combinedAudio));
    return new Response(
      JSON.stringify({ audio: base64Audio }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
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
