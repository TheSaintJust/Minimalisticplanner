"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, CalendarDays, CheckCircle2, CircleAlert, ExternalLink, KeyRound, MessageCircle, Save, ShieldCheck, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Provider = "openai" | "anthropic" | "google_gemini" | "openrouter" | "custom";
type AISettings = { provider: Provider; model: string; custom_base_url: string; use_own_api_key: boolean };
const providers: { value: Provider; name: string; tagline: string; models: string[] }[] = [
  { value: "openai", name: "OpenAI", tagline: "General reasoning, planning and research", models: ["default", "gpt-4.1", "gpt-4.1-mini", "o3"] },
  { value: "anthropic", name: "Anthropic", tagline: "Long-form analysis and document work", models: ["default", "claude-sonnet", "claude-opus", "claude-haiku"] },
  { value: "google_gemini", name: "Google Gemini", tagline: "Multimodal analysis and long context", models: ["default", "gemini-pro", "gemini-flash"] },
  { value: "openrouter", name: "OpenRouter", tagline: "Choose from multiple model providers", models: ["default", "openrouter/auto"] },
  { value: "custom", name: "Custom compatible API", tagline: "Use your own compatible endpoint", models: ["default"] },
];

export function SettingsWorkspace() {
  const client = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AISettings>({ provider: "openai", model: "default", custom_base_url: "", use_own_api_key: false });
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({ google_calendar: "not_connected", telegram: "not_connected" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [setupProvider, setSetupProvider] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!client) { setLoading(false); return; }
    const { data: auth } = await client.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);
    if (!uid) { setLoading(false); return; }
    const [ai, connections] = await Promise.all([
      client.from("user_ai_preferences").select("provider,model,custom_base_url,use_own_api_key").eq("user_id", uid).maybeSingle(),
      client.from("user_integration_connections").select("provider,connection_status").eq("user_id", uid),
    ]);
    if (ai.data) setSettings({ provider: ai.data.provider as Provider, model: ai.data.model, custom_base_url: ai.data.custom_base_url ?? "", use_own_api_key: ai.data.use_own_api_key });
    if (connections.data) setConnectionStatus(Object.fromEntries(connections.data.map(c => [c.provider, c.connection_status])));
    setLoading(false);
  }, [client]);

  useEffect(() => { void load(); }, [load]);

  const currentProvider = providers.find(p => p.value === settings.provider) ?? providers[0];
  async function saveAI() {
    if (!client || !userId) { setNotice("Sign in to save your AI preferences."); return; }
    setSaving(true); setNotice("");
    const { error } = await client.from("user_ai_preferences").upsert({
      user_id: userId,
      provider: settings.provider,
      model: settings.model,
      custom_base_url: settings.custom_base_url.trim() || null,
      use_own_api_key: settings.use_own_api_key,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    setNotice(error ? "Could not save preferences: " + error.message : "AI provider preferences saved. API-key vault setup is still required before requests can use a personal key.");
  }

  const integrationInfo = {
    google_calendar: { title: "Google Calendar", subtitle: "Two-way calendar sync", detail: "Sync planned tasks and deadlines to a calendar you choose, and read busy times to help avoid conflicts.", icon: CalendarDays, steps: ["Add Google OAuth client ID and secret as server-only environment variables.", "Configure the Calendar API and redirect URI in Google Cloud Console.", "Implement OAuth consent, encrypted refresh-token storage and conflict-safe sync."] },
    telegram: { title: "Telegram", subtitle: "Chat-first planning assistant", detail: "Send an informal message such as “HSE linguistics conference, start 7 Dec, deadline 20 Dec” and get a proposed plan with research-backed tasks.", icon: MessageCircle, steps: ["Create a Telegram bot with BotFather and store its token as a server secret.", "Deploy an authenticated webhook and user-to-account pairing flow.", "Add online research, date disambiguation, plan preview and confirmation before tasks are created."] },
  };
  function showConnectionSetup(provider: "google_calendar" | "telegram") {
    setSetupProvider(provider);
    setNotice("");
  }

  return <div className="settings-page">
    <section className="settings-hero"><div className="settings-hero-icon"><ShieldCheck size={23}/></div><div><div className="eyebrow"><span className="eyebrow-line"/> WORKSPACE CONFIGURATION</div><h2>Make the tools work together.</h2><p>Connect your calendar, send ideas from Telegram, and choose the AI provider that powers your research and planning.</p></div></section>
    {notice && <div className="learner-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}

    <section className="settings-section"><div className="settings-section-heading"><div><div className="section-kicker">CONNECTED WORKFLOWS</div><h3>Integrations</h3><p>Connect once; keep your planning workspace in sync.</p></div><span className="settings-soon"><CircleAlert size={13}/> Setup required</span></div>
      <div className="integration-grid">{(["google_calendar", "telegram"] as const).map(key => { const item = integrationInfo[key]; const Icon = item.icon; const connected = connectionStatus[key] === "connected"; return <article className="integration-card" key={key}><div className={"integration-icon " + (key === "google_calendar" ? "integration-google" : "integration-telegram")}><Icon size={22}/></div><div className="integration-card-top"><div><h4>{item.title}</h4><span>{item.subtitle}</span></div><span className={"integration-status " + (connected ? "is-connected" : "")}><i/>{connected ? "Connected" : "Not connected"}</span></div><p>{item.detail}</p><div className="integration-card-foot"><span><ShieldCheck size={14}/> Credentials stay server-side</span><button className="outline-button" onClick={() => showConnectionSetup(key)}>{connected ? "Manage" : "Set up connection"} <ArrowRight size={14}/></button></div></article>; })}</div>
    </section>

    {setupProvider && <section className="connection-setup-panel"><div className="connection-setup-heading"><div><div className="section-kicker">CONNECTION CHECKLIST</div><h3>{integrationInfo[setupProvider as keyof typeof integrationInfo].title} setup</h3></div><button className="icon-button" onClick={() => setSetupProvider(null)} aria-label="Close"><X size={17}/></button></div><p className="connection-setup-intro">The dashboard can display connection status, but the secure OAuth/webhook credentials have not been configured yet. These are the remaining setup steps; the button does not pretend the account is connected.</p><ol>{integrationInfo[setupProvider as keyof typeof integrationInfo].steps.map((step, i) => <li key={step}><span>{String(i + 1).padStart(2, "0")}</span>{step}</li>)}</ol>{setupProvider === "google_calendar" ? <a className="text-action" href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Open Google Cloud Console <ExternalLink size={14}/></a> : <a className="text-action" href="https://t.me/BotFather" target="_blank" rel="noreferrer">Open BotFather <ExternalLink size={14}/></a>}</section>}

    <section className="settings-section ai-settings-section"><div className="settings-section-heading"><div><div className="section-kicker">MODEL PREFERENCES</div><h3>Choose your AI provider</h3><p>Pick the API you want the research and planning workflows to use.</p></div><span className="ai-provider-count"><Sparkles size={14}/> {providers.length} provider options</span></div>
      <div className="provider-grid">{providers.map(p => <button key={p.value} className={"provider-card " + (settings.provider === p.value ? "provider-selected" : "")} onClick={() => setSettings(s => ({ ...s, provider: p.value, model: p.models[0] }))}><span className="provider-radio">{settings.provider === p.value && <i/>}</span><span className="provider-card-copy"><strong>{p.name}</strong><small>{p.tagline}</small></span>{settings.provider === p.value && <CheckCircle2 size={17} className="provider-check"/>}</button>)}</div>
      <div className="ai-config-form"><label><span>Preferred model</span><select value={settings.model} onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}>{currentProvider.models.map(m => <option value={m} key={m}>{m === "default" ? "Provider default (recommended)" : m}</option>)}</select></label>{settings.provider === "custom" && <label><span>API base URL</span><input type="url" value={settings.custom_base_url} onChange={e => setSettings(s => ({ ...s, custom_base_url: e.target.value }))} placeholder="https://your-api.example/v1"/></label>}<div className="api-key-note"><span className="api-key-note-icon"><KeyRound size={17}/></span><div><strong>Use your own API key</strong><p>Personal API-key entry will be enabled through a server-side encrypted vault. Keys will never be placed in browser storage or exposed to other users.</p></div><span className="api-key-coming">Vault setup next</span></div><div className="ai-config-actions"><span>{loading ? "Loading preferences…" : "Preference applies to future AI workflows once API credentials are configured."}</span><button className="primary-button" onClick={() => void saveAI()} disabled={saving || loading || !userId}><Save size={15}/>{saving ? "Saving…" : "Save preferences"}</button></div></div>
    </section>
    <section className="settings-security-note"><ShieldCheck size={18}/><div><strong>Private by design</strong><p>OAuth tokens and provider API keys must be stored server-side, never in public tables or browser local storage. New plans should be reviewed before tasks are created.</p></div></section>
  </div>;
}
