"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { newsletterDraftSchema, type NewsletterDraft } from "@travel-newsletter/shared";
import { supabase } from "../lib/supabase";

type Entry = {
  id: string;
  title: string | null;
  location: string | null;
  captured_at: string;
  content_mode: string;
  status: string;
  error_message: string | null;
  voice_note_duration_seconds: number;
  photo_paths: string[];
  transcript: string | null;
  draft: Record<string, unknown> | null;
  location_confirmed: boolean;
  human_reviewed: boolean;
};

type EntryWithUrls = Entry & { photoUrls: string[] };

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState<EntryWithUrls[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewsletterDraft | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);

  const loadEntries = async () => {
    setIsLoadingEntries(true);
    const result = await supabase
      .from("newsletter_entries")
      .select("id,title,location,captured_at,content_mode,status,error_message,voice_note_duration_seconds,photo_paths,transcript,draft,location_confirmed,human_reviewed")
      .order("created_at", { ascending: false });

    if (result.error) {
      setMessage(`Could not load entries: ${result.error.message}`);
      setIsLoadingEntries(false);
      return;
    }

    const entriesWithUrls = await Promise.all(
      (result.data as Entry[]).map(async (entry) => {
        const signedPhotos = await Promise.all(
          entry.photo_paths.map(async (path) => {
            const signedUrl = await supabase.storage.from("travel-media").createSignedUrl(path, 3600);
            return signedUrl.data?.signedUrl ?? "";
          })
        );
        return { ...entry, photoUrls: signedPhotos.filter(Boolean) };
      })
    );
    setEntries(entriesWithUrls);
    if (selectedEntryId) {
      const refreshedEntry = entriesWithUrls.find((entry) => entry.id === selectedEntryId);
      if (refreshedEntry) {
        selectEntry(refreshedEntry);
      }
    }
    setIsLoadingEntries(false);
  };

  const selectEntry = (entry: EntryWithUrls) => {
    setSelectedEntryId(entry.id);
    setLocationConfirmed(entry.location_confirmed);
    const parsedDraft = newsletterDraftSchema.safeParse(entry.draft);
    setDraft(parsedDraft.success ? parsedDraft.data : null);
  };

  const updateDraft = <Key extends keyof NewsletterDraft>(key: Key, value: NewsletterDraft[Key]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const saveReview = async () => {
    const selectedEntry = entries.find((entry) => entry.id === selectedEntryId);
    if (!selectedEntry || !draft) {
      setMessage("Select a generated draft before saving review changes.");
      return;
    }
    if (!locationConfirmed) {
      setMessage("Confirm the location before completing human review.");
      return;
    }
    const parsedDraft = newsletterDraftSchema.safeParse(draft);
    if (!parsedDraft.success) {
      setMessage("The draft must pass validation before review can be completed.");
      return;
    }

    setIsSavingReview(true);
    const result = await supabase
      .from("newsletter_entries")
      .update({
        draft: parsedDraft.data,
        location_confirmed: true,
        human_reviewed: true,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", selectedEntry.id);
    setIsSavingReview(false);
    setMessage(result.error ? `Could not save review: ${result.error.message}` : "Review saved. Export remains gated until the next step.");
    if (!result.error) {
      await loadEntries();
    }
  };

  const downloadText = (filename: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportNewsletter = () => {
    const selectedEntry = entries.find((entry) => entry.id === selectedEntryId);
    if (!selectedEntry || !draft || !selectedEntry.human_reviewed || !selectedEntry.location_confirmed) {
      setMessage("Complete location confirmation and human review before exporting.");
      return;
    }

    downloadText(
      `${draft.title || "travel-newsletter"}.html`,
      `<!doctype html><html><head><meta charset="utf-8"><title>${draft.title}</title></head><body><h1>${draft.title}</h1><p>${draft.previewText}</p><p>${draft.openingParagraph}</p><p>${draft.body.replace(/\n/g, "</p><p>")}</p><h2>Continue the journey</h2><p>${draft.callToAction}</p></body></html>`,
      "text/html"
    );
  };

  const exportSocial = () => {
    const selectedEntry = entries.find((entry) => entry.id === selectedEntryId);
    if (!selectedEntry || !draft || !selectedEntry.human_reviewed || !selectedEntry.location_confirmed) {
      setMessage("Complete location confirmation and human review before exporting.");
      return;
    }
    downloadText("travel-newsletter-social.txt", `${draft.socialCaption}\n\n${draft.hashtags.join(" ")}`, "text/plain");
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      void loadEntries();
    } else {
      setEntries([]);
    }
  }, [user]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    setMessage(isSignUp ? "Account created. Check your email if confirmation is enabled." : "Signed in.");
  };

  if (user) {
    return (
      <main>
        <p className="eyebrow">TRAVEL NEWSLETTER</p>
        <h1>Review your drafts</h1>
        <p>Signed in as {user.email}.</p>
        <button type="button" onClick={() => void loadEntries()} disabled={isLoadingEntries}>
          {isLoadingEntries ? "Loading entries..." : "Refresh entries"}
        </button>
        <section className="entryList" aria-label="Saved newsletter entries">
          {entries.length === 0 && !isLoadingEntries ? <p>No entries have been uploaded yet.</p> : null}
          {entries.map((entry) => (
            <article className="entry" key={entry.id}>
              <p className="eyebrow">{entry.status}</p>
              <h2>{entry.title || "Untitled travel story"}</h2>
              <p>{entry.location || "Location to confirm"} · {new Date(entry.captured_at).toLocaleDateString()}</p>
              <p>{entry.photo_paths.length} photos · {entry.voice_note_duration_seconds}s voice note · {entry.content_mode}</p>
              {entry.photoUrls.length > 0 ? (
                <div className="photoRow">
                  {entry.photoUrls.map((url) => <img key={url} src={url} alt="Travel entry" />)}
                </div>
              ) : null}
              {entry.transcript ? <p><strong>Transcript:</strong> {entry.transcript}</p> : <p>Transcript pending.</p>}
              {entry.error_message ? <p role="alert">{entry.error_message}</p> : null}
              <button type="button" onClick={() => selectEntry(entry)} disabled={!entry.draft}>
                {entry.draft ? "Open review" : "Draft pending"}
              </button>
            </article>
          ))}
        </section>
        {selectedEntryId && draft ? (
          <section className="reviewPanel" aria-label="Newsletter draft review">
            <p className="eyebrow">EDITABLE DRAFT</p>
            <label>Title<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
            <label>Subject lines<textarea value={draft.subjectLines.join("\n")} onChange={(event) => updateDraft("subjectLines", event.target.value.split("\n").filter(Boolean))} /></label>
            <label>Preview text<textarea value={draft.previewText} onChange={(event) => updateDraft("previewText", event.target.value)} /></label>
            <label>Opening paragraph<textarea value={draft.openingParagraph} onChange={(event) => updateDraft("openingParagraph", event.target.value)} /></label>
            <label>Body<textarea className="bodyInput" value={draft.body} onChange={(event) => updateDraft("body", event.target.value)} /></label>
            <label>Photo captions<textarea value={draft.photoCaptions.join("\n")} onChange={(event) => updateDraft("photoCaptions", event.target.value.split("\n"))} /></label>
            <label>Call to action<input value={draft.callToAction} onChange={(event) => updateDraft("callToAction", event.target.value)} /></label>
            <label>Prayer request<textarea value={draft.prayerRequest ?? ""} onChange={(event) => updateDraft("prayerRequest", event.target.value || null)} /></label>
            <label>Social caption<textarea value={draft.socialCaption} onChange={(event) => updateDraft("socialCaption", event.target.value)} /></label>
            <label>Hashtags<textarea value={draft.hashtags.join("\n")} onChange={(event) => updateDraft("hashtags", event.target.value.split("\n").filter(Boolean))} /></label>
            {draft.reviewFlags.length > 0 ? <div className="flags" role="alert"><strong>Review flags</strong><ul>{draft.reviewFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul></div> : null}
            <label className="checkLabel"><input type="checkbox" checked={locationConfirmed} onChange={(event) => setLocationConfirmed(event.target.checked)} /> I confirm the location is correct.</label>
            <button type="button" onClick={() => void saveReview()} disabled={isSavingReview}>{isSavingReview ? "Saving review..." : "Save reviewed draft"}</button>
            {entries.find((entry) => entry.id === selectedEntryId)?.human_reviewed ? (
              <div className="exportActions">
                <button type="button" onClick={exportNewsletter}>Export newsletter</button>
                <button type="button" onClick={exportSocial}>Export social caption</button>
              </div>
            ) : null}
          </section>
        ) : null}
        <button type="button" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main>
      <p className="eyebrow">TRAVEL NEWSLETTER</p>
      <h1>{isSignUp ? "Create your account" : "Review your drafts"}</h1>
      <p>Sign in to keep newsletter drafts and private travel media protected.</p>
      <form onSubmit={submitAuth}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
        </label>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>
      <button type="button" className="textButton" onClick={() => setIsSignUp((value) => !value)}>
        {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
      {message ? <p role="status">{message}</p> : null}
    </main>
  );
}