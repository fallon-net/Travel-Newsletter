import { newsletterDraftSchema } from "@travel-newsletter/shared";
import { getAuthenticatedServerClient } from "../../../../../lib/server-supabase";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  const authenticated = await getAuthenticatedServerClient(request);
  if (!authenticated) {
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { entryId } = await context.params;
  const body = (await request.json()) as { draft?: unknown; locationConfirmed?: boolean };
  const draft = newsletterDraftSchema.safeParse(body.draft);
  if (!draft.success || body.locationConfirmed !== true) {
    return Response.json({ error: "A valid draft and confirmed location are required." }, { status: 400 });
  }

  const { supabase, userId } = authenticated;
  const { error } = await supabase
    .from("newsletter_entries")
    .update({ draft: draft.data, location_confirmed: true, human_reviewed: true, reviewed_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) {
    return Response.json({ error: "Could not save the reviewed draft." }, { status: 502 });
  }
  return Response.json({ status: "reviewed" });
}
