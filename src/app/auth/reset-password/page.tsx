"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [client] = useState(() => createClient());

  useEffect(() => {
    if (!client) return;
    void client.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setRecoveryReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) { setError(true); setMessage("Supabase is not configured yet."); return; }
    setBusy(true); setMessage(""); setError(false);
    const { error: requestError } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setBusy(false);
    if (requestError) { setError(true); setMessage(requestError.message); return; }
    setSent(true);
    setMessage("If an account exists for that address, a password reset link will arrive by email.");
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) { setError(true); setMessage("Supabase is not configured yet."); return; }
    setBusy(true); setMessage(""); setError(false);
    const { error: updateError } = await client.auth.updateUser({ password });
    setBusy(false);
    if (updateError) { setError(true); setMessage(updateError.message); return; }
    setMessage("Password updated. You can return to your workspace and sign in.");
    setPassword("");
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-brand"><span className="auth-brand-mark"><ShieldCheck size={22}/></span><span><strong>Opportunity Tracker</strong><small>ACCOUNT SECURITY</small></span></div>
      <div className="auth-heading-icon"><KeyRound size={22}/></div>
      <h1>Reset your password</h1>
      <p className="auth-description">Recover access to your private workspace securely.</p>
      {message && <div className={`auth-message ${error ? "auth-message-error" : "auth-message-success"}`} role="status">{message}</div>}
      {!recoveryReady ? <form className="auth-form" onSubmit={requestReset}>
        <label htmlFor="reset-email">Email address</label>
        <div className="auth-input"><Mail size={17}/><input id="reset-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></div>
        <button className="auth-primary" disabled={busy}>{busy ? "Sending link…" : "Send reset link"}</button>
      </form> : <form className="auth-form" onSubmit={updatePassword}>
        <label htmlFor="new-password">New password</label>
        <div className="auth-input"><KeyRound size={17}/><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/></div>
        <button className="auth-primary" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
      </form>}
      <Link className="auth-back-link" href="/"><ArrowLeft size={15}/> Back to sign in</Link>
    </section>
  </main>;
}
