import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const mediaBucket = "travel-media";
const maxPhotoBytes = 10 * 1024 * 1024;

function response(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function extensionFor(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
}

async function authenticatedClient(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization");
  if (!supabaseUrl || !supabaseAnonKey || !authorization?.startsWith("Bearer ")) {
    return null;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    global: { headers: { Authorization: authorization } }
  });
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : { supabase, userId: data.user.id };
}

export async function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  const authenticated = await authenticatedClient(request);
  if (!authenticated) {
    return response("Authentication is required.", 401);
  }

  const { entryId } = await context.params;
  const formData = await request.formData();
  const index = Number(formData.get("index"));
  const file = formData.get("file");
  if (!Number.isInteger(index) || index < 0 || index > 2 || !(file instanceof File) || !file.type.startsWith("image/") || file.size > maxPhotoBytes) {
    return response("Provide a valid photo index and image file.", 400);
  }

  const { supabase, userId } = authenticated;
  const { data: entry, error: entryError } = await supabase
    .from("newsletter_entries")
    .select("photo_paths")
    .eq("id", entryId)
    .eq("user_id", userId)
    .single();
  if (entryError || !entry || !entry.photo_paths[index]) {
    return response("Entry or photo was not found.", 404);
  }

  const newPath = `${userId}/${entryId}/photo-${index + 1}-${Date.now()}.${extensionFor(file)}`;
  const { error: uploadError } = await supabase.storage.from(mediaBucket).upload(newPath, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) {
    return response("Replacement photo upload failed.", 502);
  }

  const oldPath = entry.photo_paths[index];
  const nextPaths = [...entry.photo_paths];
  nextPaths[index] = newPath;
  const { error: updateError } = await supabase.from("newsletter_entries").update({ photo_paths: nextPaths, status: "queued", human_reviewed: false }).eq("id", entryId);
  if (updateError) {
    await supabase.storage.from(mediaBucket).remove([newPath]);
    return response("Could not save the replacement photo.", 502);
  }
  await supabase.storage.from(mediaBucket).remove([oldPath]);
  return Response.json({ photoPaths: nextPaths, status: "queued" });
}

export async function DELETE(request: Request, context: { params: Promise<{ entryId: string }> }) {
  const authenticated = await authenticatedClient(request);
  if (!authenticated) {
    return response("Authentication is required.", 401);
  }

  const { entryId } = await context.params;
  const body = (await request.json()) as { index?: number };
  const index = body.index;
  if (!Number.isInteger(index) || index === undefined || index < 0 || index > 2) {
    return response("Provide a valid photo index.", 400);
  }

  const { supabase, userId } = authenticated;
  const { data: entry, error: entryError } = await supabase
    .from("newsletter_entries")
    .select("photo_paths")
    .eq("id", entryId)
    .eq("user_id", userId)
    .single();
  if (entryError || !entry || !entry.photo_paths[index]) {
    return response("Entry or photo was not found.", 404);
  }

  const oldPath = entry.photo_paths[index];
  const nextPaths = entry.photo_paths.filter((_: string, pathIndex: number) => pathIndex !== index);
  const { error: updateError } = await supabase.from("newsletter_entries").update({ photo_paths: nextPaths, status: "queued", human_reviewed: false }).eq("id", entryId);
  if (updateError) {
    return response("Could not delete the photo.", 502);
  }
  await supabase.storage.from(mediaBucket).remove([oldPath]);
  return Response.json({ photoPaths: nextPaths, status: "queued" });
}
