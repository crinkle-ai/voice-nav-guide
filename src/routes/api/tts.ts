import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";

// Wrap raw 16-bit PCM (mono) into a WAV container.
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { text, voice } = (await request.json()) as { text: string; voice?: string };
          if (!text || typeof text !== "string" || text.length > 800) {
            return new Response("Invalid text", { status: 400 });
          }
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) return new Response("Missing GEMINI_API_KEY", { status: 500 });

          const ai = new GoogleGenAI({ apiKey });
          const resp = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice || "Kore" },
                },
              },
            },
          });

          const part = resp.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
          const b64 = (part as any)?.inlineData?.data;
          const mime: string = (part as any)?.inlineData?.mimeType || "audio/L16;rate=24000";
          if (!b64) return new Response("No audio returned", { status: 502 });

          const pcm = Buffer.from(b64, "base64");
          const rateMatch = mime.match(/rate=(\d+)/);
          const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
          const wav = pcmToWav(pcm, sampleRate);

          return new Response(wav, {
            status: 200,
            headers: {
              "Content-Type": "audio/wav",
              "Cache-Control": "no-store",
            },
          });
        } catch (e) {
          console.error("TTS error", e);
          return new Response("TTS failed", { status: 500 });
        }
      },
    },
  },
});
