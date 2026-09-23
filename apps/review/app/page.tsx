"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

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