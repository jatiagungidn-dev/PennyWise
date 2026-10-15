import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import "./App.css";

type AuthMode = "signin" | "signup";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mouted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mouted) return;

      if (error) setError(error.message);
      setSession(data.session);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });

    return () => {
      mouted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) throw error;

        if (!data.session) {
          setMessage(
            "Registration successful. Please check your email for confirmation",
          );
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed sign out");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="page">
        <p className="muted">Checking account session...</p>
      </main>
    );
  }

  if (session) {
    return (
      <main className="page">
        <section className="auth-card">
          <div className="brand-mark" aria-hidden="true">
            P
          </div>
          <p className="eyeb">PENNYWISE</p>
          <h1>Welcome</h1>
          <p className="muted">You are logged in as</p>
          <p className="account-email">{session.user.email}</p>
          <p className="notice">
            Account is connected. We are creating your transactions
          </p>
          {error && <p className="error">{error}</p>}
          <button
            className="primary-button"
            type="button"
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading ? "Processing..." : "Exit"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="auth-card">
        <div className="brand-mark" aria-hidden="true">
          P
        </div>

        <p className="eyebrow">PENNYWISE</p>
        <h1>
          {mode === "signin" ? "Manage your pennies" : "Start your journey"}
        </h1>
        <p className="muted">
          {mode === "signin"
            ? "Sign in to continue"
            : "Create account to start manage your pennies"}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "signin" ? "tab active" : "tab"}
            onClick={() => {
              setMode("signin");
              setMessage("");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "signup" ? "tab active" : "tab"}
            onClick={() => {
              setMode("signup");
              setMessage("");
              setError("");
            }}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8 characters"
            minLength={8}
            required
          />

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading
              ? "Processing..."
              : mode === "signin"
                ? "Sign in"
                : "Sign up"}
          </button>
        </form>

        <p className="footer-note">Manage your pennies and dimmes.</p>
      </section>
    </main>
  );
}

export default App;
