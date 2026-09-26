import { createClient } from "@supabase/supabase-js";
import { newsletterDraftSchema } from "@travel-newsletter/shared";

export const runtime = "nodejs";

const mediaBucket = "travel-media";

type Entry = {
  id: string;
  title: string | null;
  location: string | null;
  captured_at: string;
  content_mode: string;
  status: string;
  voice_note_path: string;
  photo_paths: string[];
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function openAiUrl(path: string) {
  return `${(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "")}/${path}`;
}

async function transcribe(audio: Blob) {
  const formData = new FormData();
  formData.append("file", audio, "voice-note.m4a");
  formData.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe");
  const response = await fetch(openAiUrl("audio/transcriptions"), {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData
  });

  if (!response.ok) {
    throw new Error("Voice transcription failed.");
  }
  const payload = (await response.json()) as { text?: string };
  if (!payload.text?.trim()) {
    throw new Error("Voice transcription returned no text.");
  }
  return payload.text.trim();
}

async function generateDraft(entry: Entry, transcript: string, imageUrls: string[]) {
  const response = await fetch(openAiUrl("chat/completions"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_GENERATION_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You create a factual travel newsletter draft. Treat the transcript as the primary source. Do not invent facts, people, dates, locations, events, conversations, or spiritual outcomes. Mark uncertain visual inferences in reviewFlags. Return only JSON matching the requested fields."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                task: "Create an editable newsletter draft.",
                requiredFields: ["title", "subjectLines", "previewText", "openingParagraph", "body", "photoCaptions", "callToAction", "prayerRequest", "socialCaption", "hashtags", "reviewFlags"],
                constraints: {
                  subjectLines: "3-5 items",
                  body: "250-400 words",
                  photoCaptions: "exactly 3 items",
                  prayerRequest: "string or null"
                },
                confirmedMetadata: {
                  title: entry.title,
                  location: entry.location,
                  capturedAt: entry.captured_at,
                  contentMode: entry.content_mode
                },
                transcript
              })
            },
            ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } }))
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("Newsletter generation failed.");
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Newsletter generation returned no draft.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Newsletter generation returned invalid JSON.");
  }
  const draft = newsletterDraftSchema.safeParse(parsed);
  if (!draft.success) {
    throw new Error("Newsletter draft failed schema validation.");
  }
  return draft.data;
}

export async function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !supabaseAnonKey || !openAiApiKey) {
    return errorResponse("Processing server configuration is missing.", 500);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return errorResponse("Authentication is required.", 401);
  }

  const token = authorization.slice("Bearer ".length);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { headers: { Authorization: authorization } }
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return errorResponse("Authentication is invalid or expired.", 401);
  }

  const { entryId } = await context.params;
  const { data: entry, error: entryError } = await supabase
    .from("newsletter_entries")
    .select("id,title,location,captured_at,content_mode,status,voice_note_path,photo_paths")
    .eq("id", entryId)
    .eq("user_id", userData.user.id)
    .single();

  if (entryError || !entry) {
    return errorResponse("Entry was not found.", 404);
  }

  try {
    await supabase.from("newsletter_entries").update({ status: "transcribing", error_message: null }).eq("id", entryId);
    const { data: audio, error: audioError } = await supabase.storage.from(mediaBucket).download(entry.voice_note_path);
    if (audioError || !audio) {
      throw new Error("Voice note could not be downloaded.");
    }
    const transcript = await transcribe(audio);
    await supabase.from("newsletter_entries").update({ transcript, status: "generating" }).eq("id", entryId);

    const signedImages = await Promise.all(
      entry.photo_paths.map((path: string) => supabase.storage.from(mediaBucket).createSignedUrl(path, 600))
    );
    const imageUrls = signedImages.map((result) => result.data?.signedUrl).filter((url): url is string => Boolean(url));
    if (imageUrls.length !== 3) {
      throw new Error("Private photos could not be prepared for generation.");
    }

    const draft = await generateDraft(entry, transcript, imageUrls);
    const { error: updateError } = await supabase
      .from("newsletter_entries")
      .update({ draft, status: "ready", error_message: null })
      .eq("id", entryId);
    if (updateError) {
      throw new Error("Generated draft could not be saved.");
    }

    return Response.json({ entryId, status: "ready" }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Processing failed.";
    await supabase.from("newsletter_entries").update({ status: "failed", error_message: errorMessage }).eq("id", entryId);
    return errorResponse(errorMessage, 502);
  }
}
