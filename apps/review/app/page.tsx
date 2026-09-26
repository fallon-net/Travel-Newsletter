"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
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

  const loadEntries = async () => {
    setIsLoadingEntries(true);
    const result = await supabase
      .from("newsletter_entries")
      .select("id,title,location,captured_at,content_mode,status,error_message,voice_note_duration_seconds,photo_paths,transcript,draft")
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
    setIsLoadingEntries(false);
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
            </article>
          ))}
        </section>
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