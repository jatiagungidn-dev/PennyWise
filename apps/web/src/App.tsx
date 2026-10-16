import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { apiRequest } from "./lib/api";
import "./App.css";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amountMinor: string;
  currency: string;
  description: string | null;
  occurredAt: string;
};

// Matches the current API response from GET /api/transactions.
type TransactionListResponse = {
  transaction: Transaction[];
};

type AuthMode = "sign-in" | "sign-up";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return dateFormatter.format(date);
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [transactionMessage, setTransactionMessage] = useState("");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      // Avoid synchronous setState calls inside the effect which can cause
      // cascading renders; schedule state resets on the next tick.
      const t = setTimeout(() => {
        setTransactions([]);
        setLoadingTransactions(false);
        setTransactionError("");
        setTransactionMessage("");
      }, 0);

      return () => clearTimeout(t);
    }

    let active = true;

    async function loadTransactions() {
      setLoadingTransactions(true);
      setTransactionError("");

      try {
        const result =
          await apiRequest<TransactionListResponse>("/transactions");

        if (active) {
          setTransactions(result.transaction);
        }
      } catch (err: unknown) {
        if (active) {
          setTransactionError(
            err instanceof Error
              ? err.message
              : "Failed to load transactions. Please try again.",
          );
        }
      } finally {
        if (active) {
          setLoadingTransactions(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      active = false;
    };
  }, [session]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    setAuthError("");

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (!data.session) {
          setAuthMessage(
            "Registration successful. Check your email to confirm your account.",
          );
        }
      }
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
    setAuthError("");
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Failed to sign out. Please try again.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleAddExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // This form accepts whole rupiah amounts, such as 25000 for IDR 25,000.
    const amountNumber = Number(amount);

    setTransactionError("");
    setTransactionMessage("");

    if (!Number.isSafeInteger(amountNumber) || amountNumber <= 0) {
      setTransactionError("Enter a valid positive amount in rupiah.");
      return;
    }

    setSavingTransaction(true);

    try {
      const created = await apiRequest<Transaction>("/transactions", {
        method: "POST",
        body: JSON.stringify({
          type: "expense",
          amountMinor: amountNumber,
          description: description.trim() || undefined,
        }),
      });

      setTransactions((current) => [created, ...current]);
      setAmount("");
      setDescription("");
      setTransactionMessage("Expense saved successfully.");
    } catch (err: unknown) {
      setTransactionError(
        err instanceof Error
          ? err.message
          : "Failed to save the expense. Please try again.",
      );
    } finally {
      setSavingTransaction(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="page">
        <p className="muted">Checking your session...</p>
      </main>
    );
  }

  if (session) {
    const totalExpenses = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce(
        (total, transaction) => total + Number(transaction.amountMinor),
        0,
      );

    return (
      <main className="page">
        <section className="auth-card dashboard">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">PENNYWISE</p>
              <h1>Your finances at a glance</h1>
              <p className="muted">{session.user.email}</p>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={handleSignOut}
              disabled={authLoading}
            >
              {authLoading ? "Signing out..." : "Sign out"}
            </button>
          </header>

          {authError && (
            <p className="error" role="alert">
              {authError}
            </p>
          )}

          <section className="balance-card">
            <p>Total expenses in loaded transactions</p>
            <h2>{currencyFormatter.format(totalExpenses)}</h2>
            <p className="balance-caption">
              Based on the latest transactions returned by the API.
            </p>
          </section>

          <section className="transaction-section">
            <h2>Add an expense</h2>

            <form className="auth-form" onSubmit={handleAddExpense}>
              <label htmlFor="amount">Amount (IDR)</label>
              <input
                id="amount"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="25000"
                required
              />

              <label htmlFor="description">Description</label>
              <input
                id="description"
                type="text"
                maxLength={200}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. Lunch"
              />

              {transactionError && (
                <p className="error" role="alert">
                  {transactionError}
                </p>
              )}

              {transactionMessage && (
                <p className="notice" role="status">
                  {transactionMessage}
                </p>
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={savingTransaction}
              >
                {savingTransaction ? "Saving..." : "Save expense"}
              </button>
            </form>
          </section>

          <section className="transaction-section">
            <h2>Recent transactions</h2>

            {loadingTransactions && (
              <p className="muted">Loading transactions...</p>
            )}

            {!loadingTransactions &&
              !transactionError &&
              transactions.length === 0 && (
                <p className="muted">
                  No transactions yet. Add your first expense to get started.
                </p>
              )}

            <ul className="transaction-list">
              {transactions.map((transaction) => (
                <li className="transaction-item" key={transaction.id}>
                  <div className="transaction-details">
                    <strong>
                      {transaction.description?.trim() ||
                        "Untitled transaction"}
                    </strong>
                    <span>{formatDate(transaction.occurredAt)}</span>
                  </div>

                  <strong
                    className={
                      transaction.type === "expense"
                        ? "expense-amount"
                        : "income-amount"
                    }
                  >
                    {transaction.type === "expense" ? "−" : "+"}
                    {currencyFormatter.format(Number(transaction.amountMinor))}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
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
          {mode === "sign-in"
            ? "Make every rupiah count."
            : "Start your journey."}
        </h1>
        <p className="muted">
          {mode === "sign-in"
            ? "Sign in to manage your personal finances."
            : "Create an account to start tracking your finances."}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "sign-in" ? "tab active" : "tab"}
            onClick={() => {
              setMode("sign-in");
              setAuthMessage("");
              setAuthError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "sign-up" ? "tab active" : "tab"}
            onClick={() => {
              setMode("sign-up");
              setAuthMessage("");
              setAuthError("");
            }}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleAuthSubmit}>
          <label htmlFor="email">Email address</label>
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
              mode === "sign-in" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />

          {authError && (
            <p className="error" role="alert">
              {authError}
            </p>
          )}

          {authMessage && (
            <p className="notice" role="status">
              {authMessage}
            </p>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={authLoading}
          >
            {authLoading
              ? "Please wait..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="footer-note">
          Make informed decisions, one rupiah at a time.
        </p>
      </section>
    </main>
  );
}

export default App;
