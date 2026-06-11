import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isConfigured } from "../lib/supabase";

type Props = {
  children: (session: Session) => React.ReactNode;
};

// On localhost we pre-fill the email field so we don't have to retype it
// every time the dev server restarts. This is a dev-only convenience —
// the deployed site still shows an empty field.
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");
const devEmail = isLocalhost ? "regitzesydendal@gmail.com" : "";

export function AuthGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(devEmail);
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    // onAuthStateChange fires "INITIAL_SESSION" once the client has settled.
    // Waiting for it (instead of resolving getSession() eagerly) avoids the
    // brief flash of the login screen on page load when a session exists.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSending(false);
    if (error) {
      // Map Supabase's English messages to plain Danish for the end user.
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setError("Forkert email eller adgangskode.");
      } else {
        setError(error.message);
      }
    }
    // On success, onAuthStateChange swaps in the app — no further work here.
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Næsten klar</h1>
          <p className="text-sm text-neutral-600">
            Supabase er ikke konfigureret endnu. Opret en{" "}
            <code className="px-1 bg-neutral-100 rounded">.env.local</code> fil i
            projektets rod med:
          </p>
          <pre className="mt-4 text-left text-xs bg-neutral-900 text-neutral-100 p-3 rounded overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
          </pre>
          <p className="text-xs text-neutral-500 mt-3">Genstart bagefter `npm run dev`.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
        Indlæser…
      </div>
    );
  }

  if (session) {
    return <>{children(session)}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
        <h1 className="text-xl font-semibold mb-1">Samlertracker</h1>
        <p className="text-sm text-neutral-500 mb-5">
          Log ind med din email og adgangskode.
        </p>

        <form onSubmit={handleSignIn} className="space-y-3">
          <label className="block">
            <div className="text-xs font-medium text-neutral-600 mb-1">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="dig@eksempel.com"
              required
              autoFocus
            />
          </label>
          <label className="block">
            <div className="text-xs font-medium text-neutral-600 mb-1">Adgangskode</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </label>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={sending}
            className="w-full px-3 py-2 text-sm rounded bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {sending ? "Logger ind…" : "Log ind"}
          </button>
        </form>
      </div>
    </div>
  );
}
