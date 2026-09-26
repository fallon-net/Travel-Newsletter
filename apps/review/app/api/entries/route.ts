import { captureEntrySchema } from "@travel-newsletter/shared";
import { getAuthenticatedServerClient } from "../../../lib/server-supabase";

export const runtime = "nodejs";

const mediaBucket = "travel-media";
const maxPhotoBytes = 10 * 1024 * 1024;
const maxVoiceNoteBytes = 25 * 1024 * 1024;

function response(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function extensionFor(file: File, fallback: string) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : fallback;
}

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedServerClient(request);
  if (!authenticated) {
    return response("Authentication is invalid or expired.", 401);
  }
  const { supabase, userId } = authenticated;

  const formData = await request.formData();
  const photos = formData.getAll("photos");
  const voiceNote = formData.get("voiceNote");
  const capturedAt = formData.get("capturedAt");
  const contentMode = formData.get("contentMode");
  const voiceNoteDurationSeconds = formData.get("voiceNoteDurationSeconds");

  if (
    photos.length !== 3 ||
    photos.some((photo) => !(photo instanceof File) || !photo.type.startsWith("image/") || photo.size > maxPhotoBytes) ||
    !(voiceNote instanceof File) ||
    !voiceNote.type.startsWith("audio/") ||
    voiceNote.size > maxVoiceNoteBytes
  ) {
    return response("Provide exactly three images and one audio file within the allowed size limits.", 400);
  }

  const capture = captureEntrySchema.safeParse({
    title: typeof formData.get("title") === "string" ? formData.get("title") : undefined,
    location: typeof formData.get("location") === "string" ? formData.get("location") : undefined,
    capturedAt,
    contentMode,
    photoCount: photos.length,
    voiceNoteDurationSeconds: Number(voiceNoteDurationSeconds)
  });

  if (!capture.success) {
    return response("Capture metadata is invalid.", 400);
  }

  const { data: entry, error: insertError } = await supabase
    .from("newsletter_entries")
    .insert({
      user_id: userId,
      title: capture.data.title ?? null,
      location: capture.data.location ?? null,
      captured_at: capture.data.capturedAt.toISOString(),
      content_mode: capture.data.contentMode,
      status: "uploading",
      voice_note_duration_seconds: capture.data.voiceNoteDurationSeconds,
      photo_paths: []
    })
    .select("id")
    .single();

  if (insertError || !entry) {
    return response("Could not create the processing entry.", 500);
  }

  const photoPaths: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const photoFile = photo as File;
    const path = `${userId}/${entry.id}/photo-${index + 1}.${extensionFor(photoFile, "jpg")}`;
    const { error } = await supabase.storage.from(mediaBucket).upload(path, await photoFile.arrayBuffer(), {
      contentType: photoFile.type,
      upsert: false
    });

    if (error) {
      await supabase.from("newsletter_entries").update({ status: "failed", error_message: "Photo upload failed." }).eq("id", entry.id);
      return response("Photo upload failed. Retry the entry.", 502);
    }
    photoPaths.push(path);
  }

  const voicePath = `${userId}/${entry.id}/voice-note.${extensionFor(voiceNote, "m4a")}`;
  const { error: voiceError } = await supabase.storage.from(mediaBucket).upload(voicePath, await voiceNote.arrayBuffer(), {
    contentType: voiceNote.type,
    upsert: false
  });

  if (voiceError) {
    await supabase.from("newsletter_entries").update({ status: "failed", error_message: "Voice note upload failed." }).eq("id", entry.id);
    return response("Voice note upload failed. Retry the entry.", 502);
  }

  const { error: updateError } = await supabase
    .from("newsletter_entries")
    .update({ photo_paths: photoPaths, voice_note_path: voicePath, status: "queued", error_message: null })
    .eq("id", entry.id);

  if (updateError) {
    return response("Media uploaded but processing could not be queued.", 502);
  }

  return Response.json({ entryId: entry.id, status: "queued" }, { status: 201 });
}
