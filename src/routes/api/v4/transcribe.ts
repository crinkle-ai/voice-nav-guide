import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v4/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response("Expected multipart/form-data", { status: 400 });
        }
        const file = form.get("file");
        if (!(file instanceof Blob)) {
          return new Response("Missing audio file", { status: 400 });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        const type = (file as Blob).type || "audio/webm";
        const ext =
          type.includes("wav") ? "wav" :
          type.includes("mp4") || type.includes("m4a") ? "mp4" :
          type.includes("mpeg") || type.includes("mp3") ? "mp3" :
          "webm";
        upstream.append("file", file, `recording.${ext}`);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          return new Response(`Transcription failed: ${msg}`, { status: res.status });
        }
        const json = (await res.json()) as { text?: string };
        return Response.json({ text: json.text ?? "" });
      },
    },
  },
});
