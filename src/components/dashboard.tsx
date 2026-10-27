"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, Bell, BookOpen, BriefcaseBusiness, CalendarDays,
  CheckCircle2, ChevronDown, Clock3, ExternalLink, FileText, Filter,
  FolderOpen, GraduationCap, LayoutDashboard, ListTodo, LockKeyhole, LogOut,
  Mail, Plus, RefreshCw, Search, Settings, ShieldCheck, Sparkles, Target, Telescope, X
} from "lucide-react";
import type { Opportunity } from "@/lib/opportunities";
import { categoryLabel } from "@/lib/opportunities";
import { createClient } from "@/lib/supabase/client";
import { LearnerWorkspace } from "@/components/learner-workspace";
import { SettingsWorkspace } from "@/components/settings-workspace";
import { PlannerWorkspace } from "@/components/planner-workspace";
import { EssentialInformationWorkspace } from "@/components/essential-information-workspace";
import { TrackOpportunityButton } from "@/components/track-opportunity-button";
import { CalendarWorkspace } from "@/components/calendar-workspace";

type Category = "all" | "application" | "scholarship_fellowship" | "writing" | "call_for_papers" | "jobs_internships" | "special_focus";
type Module = "overview" | "calendar" | "planner" | "learner" | "research" | "essential" | "settings" | Category;

const nav = [
  { key: "overview" as Module, label: "Overview", icon: LayoutDashboard },
  { key: "calendar" as Module, label: "Calendar", icon: CalendarDays },
  { key: "planner" as Module, label: "Planner", icon: ListTodo },
  { key: "learner" as Module, label: "Learner", icon: GraduationCap },
  { key: "research" as Module, label: "Research workspace", icon: BookOpen },
  { key: "essential" as Module, label: "Essential information", icon: FolderOpen },
];
const cats = [
  { key: "application" as Category, label: "Applications", icon: FileText },
  { key: "scholarship_fellowship" as Category, label: "Scholarships & fellowships", icon: GraduationCap },
  { key: "writing" as Category, label: "Writing opportunities", icon: BookOpen },
  { key: "call_for_papers" as Category, label: "Calls for papers", icon: FolderOpen },
  { key: "jobs_internships" as Category, label: "Jobs & internships", icon: BriefcaseBusiness },
  { key: "special_focus" as Category, label: "Special Focus", icon: Telescope },
];
const preview: Opportunity[] = [
  { id: "preview-1", canonical_name: "Research and policy opportunities", organizer: "Preview record", description: "Connect Supabase to load the saved opportunity directory.", primary_category: "application", opportunity_type: null, official_url: null, country: null, delivery_mode: null, eligibility: {}, funding: {}, topics: ["research"], lifecycle_status: "unverified", verification_status: "unverified", last_verified_at: null },
  { id: "preview-2", canonical_name: "Fellowship discovery", organizer: "Preview record", description: "Crawl linked pages to find additional fellowships and calls.", primary_category: "scholarship_fellowship", opportunity_type: null, official_url: null, country: null, delivery_mode: null, eligibility: {}, funding: {}, topics: ["fellowship"], lifecycle_status: "unverified", verification_status: "unverified", last_verified_at: null },
  { id: "preview-3", canonical_name: "Calls for papers and publications", organizer: "Preview record", description: "Store submission links, source evidence and deadlines.", primary_category: "call_for_papers", opportunity_type: null, official_url: null, country: null, delivery_mode: null, eligibility: {}, funding: {}, topics: ["writing"], lifecycle_status: "unverified", verification_status: "unverified", last_verified_at: null }
];
function prettyStatus(s: string) { return s.replaceAll("_", " "); }
function statusClass(s: string) {
  if (s === "verified" || s === "open") return "status-positive";
  if (s === "needs_review" || s === "disputed") return "status-warning";
  if (s === "closed" || s === "archived") return "status-muted";
  return "status-neutral";
}
function dateLabel(s: string | null) {
  if (!s) return "Not checked";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "Not checked" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Dashboard() {
  const [module, setModule] = useState<Module>("overview");
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Opportunity[]>([]);
  const [emailValue, setEmailValue] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: string; message: string } | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const client = useMemo(() => createClient(), []);

  const loadData = useCallback(async () => {
    if (!client) { setLoading(false); return; }
    const { data: auth } = await client.auth.getSession();
    setUserEmail(auth.session?.user.email ?? null);
    if (auth.session) {
      const { data, error } = await client.from("opportunities")
        .select("id,canonical_name,organizer,description,primary_category,opportunity_type,official_url,country,delivery_mode,eligibility,funding,topics,lifecycle_status,verification_status,last_verified_at")
        .order("canonical_name", { ascending: true }).limit(500);
      if (error) setNotice({ kind: "error", message: "Could not load opportunities: " + error.message });
      else { setItems((data ?? []) as Opportunity[]); setNotice(null); }
    } else setItems([]);
    setLoading(false);
  }, [client]);

  useEffect(() => {
    void loadData();
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      if (!session) setItems([]);
      window.setTimeout(() => { void loadData(); }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [client, loadData]);

  async function submitAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client) return;
    setBusy(true); setNotice(null);
    try {
      const result = mode === "signin"
        ? await client.auth.signInWithPassword({ email: emailValue, password })
        : await client.auth.signUp({
            email: emailValue,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) setNotice({ kind: "success", message: "Account created. Check your email to confirm it, then sign in." });
      else setNotice({ kind: "success", message: "Signed in. Loading your saved opportunities." });
      await loadData();
    } catch (err) {
      setNotice({ kind: "error", message: err instanceof Error ? err.message : "Authentication failed." });
    } finally { setBusy(false); }
  }
  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    setUserEmail(null); setItems([]);
    setNotice({ kind: "info", message: "You have signed out." });
  }
  function navigate(key: Module) {
    setModule(key);
    if (cats.some((c) => c.key === key)) setCategory(key as Category);
    else if (key === "overview") setCategory("all");
  }

  const allItems = items.length ? items : (!configured ? preview : []);
  const filtered = allItems.filter((o) => {
    const matchesCategory = category === "all" || o.primary_category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [o.canonical_name, o.organizer, o.description, o.country, ...(o.topics ?? [])].some((s) => String(s ?? "").toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });
  const verifiedCount = items.filter((o) => o.verification_status === "verified").length;
  const openCount = items.filter((o) => o.lifecycle_status === "open").length;
  const reviewCount = items.filter((o) => o.verification_status === "needs_review" || o.verification_status === "unverified").length;
  const title = module === "overview" ? "Your workspace" : module === "settings" ? "Settings & connections" : nav.find((n) => n.key === module)?.label ?? cats.find((c) => c.key === module)?.label ?? "Your workspace";
  const opportunityView = module === "overview" || cats.some((c) => c.key === module);

  return <div className="app-frame">
    <aside className="sidebar">
      <a href="/" className="brand-lockup" onClick={(e) => { e.preventDefault(); navigate("overview"); }}>
        <span className="brand-mark"><Target size={21}/></span><span className="brand-type"><strong>Opportunity</strong><small>TRACKER</small></span>
      </a>
      <div className="workspace-chip"><span className="workspace-avatar">S</span><span><strong>Personal workspace</strong><small>{userEmail ? "Synced account" : "Your research hub"}</small></span><span className="workspace-chevron">⌄</span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="primary-nav">{nav.map((n) => { const Icon = n.icon; return <button key={n.key} onClick={() => navigate(n.key)} className={"nav-item " + (module === n.key ? "active" : "")}><Icon size={18}/><span>{n.label}</span>{n.key === "planner" && <em className="nav-soon">NEXT</em>}</button>; })}</nav>
      <div className="nav-label opportunity-nav-label">OPPORTUNITY WINDOWS <button className="tiny-icon-btn" title="Show all opportunities" onClick={() => navigate("overview")}><Filter size={14}/></button></div>
      <nav className="primary-nav">{cats.map((c) => { const Icon = c.icon; const count = items.filter((o) => o.primary_category === c.key).length; return <button key={c.key} onClick={() => navigate(c.key)} className={"nav-item " + (category === c.key ? "active" : "")}><Icon size={18}/><span>{c.label}</span>{userEmail && <span className="nav-count">{count}</span>}</button>; })}</nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-tip"><span className="tip-icon"><Sparkles size={17}/></span><strong>Find your next move</strong><p>Discover opportunities and connect them to your goals.</p><button onClick={() => { navigate("research"); setNotice({ kind: "info", message: "AI research and scheduled crawling are the next research milestone. The first link crawler is deployed but has not been run." }); }}>Explore research <ArrowRight size={14}/></button></div>
      <button className={"nav-item settings-item " + (module === "settings" ? "active" : "")} onClick={() => navigate("settings")}><Settings size={18}/><span>Settings & connections</span></button>
      <div className="sidebar-foot"><span className="online-dot"/><span>{configured ? "Supabase configured" : "Database not connected"}</span><span className="sidebar-version">v0.1</span></div>
    </aside>

    <main className="main-panel">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div><div className="topbar-actions">
        <div className={"connection-pill " + (userEmail ? "connected" : "")}><span className="connection-dot"/>{userEmail ? "Connected" : configured ? "Sign in to sync" : "Preview mode"}</div>
        <button className="icon-button" aria-label="Notifications" onClick={() => setNotice({ kind: "info", message: "Deadline notifications will be added with the planner." })}><Bell size={18}/></button>
        {userEmail ? <button className="user-menu" title="Sign out" onClick={() => void signOut()}><span className="user-avatar">{userEmail.charAt(0).toUpperCase()}</span><span className="user-email">{userEmail}</span><LogOut size={15}/></button> : <button className="outline-button top-sign-in" onClick={() => document.getElementById("account-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })}><LockKeyhole size={15}/> Sign in</button>}
      </div></header>

      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR CAREER & RESEARCH COMMAND CENTRE</div><h1>{module === "overview" ? "Make your next move." : title}</h1><p className="welcome-subtitle">{module === "overview" ? "One place to discover opportunities, organize your work, and build momentum." : module === "calendar" ? "Deadlines and scheduled work will come together here." : module === "planner" ? "Turn an opportunity into a clear plan with tasks and milestones." : module === "learner" ? "Build a learning path around the work you want to do." : module === "research" ? "Explore organizations, people, publications and source pages." : "Keep opportunities, evidence, and next steps close together."}</p></div><div className="welcome-actions"><button className="outline-button" onClick={() => void loadData()} disabled={loading}><RefreshCw size={15}/>{loading ? "Loading…" : "Refresh data"}</button><button className="primary-button" onClick={() => setNotice({ kind: "info", message: "Create and edit actions are the next opportunity-management milestone." })}><Plus size={17}/> Add opportunity</button></div></section>

        {notice && <div className={"notice notice-" + notice.kind} role="status"><div><strong>{notice.kind === "error" ? "Something needs attention" : notice.kind === "success" ? "Done" : "Note"}</strong><p>{notice.message}</p></div><button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={16}/></button></div>}

        {!configured && showSetup && <section className="setup-banner"><div className="setup-icon"><ShieldCheck size={21}/></div><div className="setup-copy"><strong>Connect your existing Supabase database</strong><p>This dashboard shell is ready. Add the project URL and publishable/anon key to <code>.env.local</code>, then restart the dev server to load the saved opportunity records.</p><button className="text-action" onClick={() => setShowSetup(false)}>Hide setup note <ArrowRight size={14}/></button></div><button className="banner-close" onClick={() => setShowSetup(false)} aria-label="Hide note"><X size={16}/></button></section>}

        {configured && !userEmail && <section className="account-card" id="account-panel"><div className="account-intro"><div className="account-lock"><LockKeyhole size={20}/></div><div><h2>Sign in to your workspace</h2><p>Your directory is protected by Supabase authentication.</p></div></div><form className="account-form" onSubmit={submitAuth}><label><span>Email address</span><div className="input-wrap"><Mail size={16}/><input type="email" autoComplete="email" required value={emailValue} onChange={(e) => setEmailValue(e.target.value)} placeholder="you@example.com"/></div></label><label><span>Password</span><div className="input-wrap"><LockKeyhole size={16}/><input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"/></div></label><button className="primary-button account-submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"} <ArrowRight size={16}/></button></form>{mode === "signin" && <div className="auth-forgot-row"><a href="/auth/reset-password">Forgot password?</a></div>}<div className="auth-switch">{mode === "signin" ? "New here?" : "Already registered?"}<button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setNotice(null); }}>{mode === "signin" ? "Create an account" : "Sign in instead"}</button></div></section>}

        {module === "overview" && <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Total opportunities</span><span className="stat-icon icon-blue"><FolderOpen size={18}/></span></div><div className="stat-number">{userEmail ? items.length : configured ? "—" : "85"}</div><div className="stat-foot"><span>{userEmail ? "In your directory" : configured ? "Sign in to load records" : "Existing database records"}</span><Activity size={14}/></div></article><article className="stat-card"><div className="stat-top"><span>Verified</span><span className="stat-icon icon-green"><CheckCircle2 size={18}/></span></div><div className="stat-number">{userEmail ? verifiedCount : "—"}</div><div className="stat-foot"><span>Evidence-backed records</span><ShieldCheck size={14}/></div></article><article className="stat-card"><div className="stat-top"><span>Marked open</span><span className="stat-icon icon-amber"><Clock3 size={18}/></span></div><div className="stat-number">{userEmail ? openCount : "—"}</div><div className="stat-foot"><span>Require fresh deadline checks</span><Clock3 size={14}/></div></article><article className="stat-card"><div className="stat-top"><span>Needs review</span><span className="stat-icon icon-purple"><Telescope size={18}/></span></div><div className="stat-number">{userEmail ? reviewCount : "—"}</div><div className="stat-foot"><span>Unverified or flagged</span><ShieldCheck size={14}/></div></article></section>}

        {opportunityView ? <section className="opportunities-panel"><div className="panel-heading"><div><div className="section-kicker">{module === "overview" ? "YOUR DIRECTORY" : "OPPORTUNITY WINDOW"}</div><h2>{module === "overview" ? "Opportunity directory" : title}</h2><p>Track the source, verification status and next move.</p></div><button className="small-select" onClick={() => setCategory(category === "all" ? "application" : "all")}><Filter size={14}/>{category === "all" ? "All categories" : categoryLabel(category)}<ChevronDown size={14}/></button></div>
          <div className="directory-toolbar"><div className="search-field"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search opportunities, organizations, topics…"/>{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15}/></button>}<kbd>⌘ K</kbd></div><div className="toolbar-count">{loading ? "Loading…" : filtered.length + (filtered.length === 1 ? " result" : " results")}</div></div>
          <div className="category-chips"><button className={"chip " + (category === "all" ? "selected" : "")} onClick={() => { setCategory("all"); setModule("overview"); }}>All</button>{cats.map((c) => <button key={c.key} className={"chip " + (category === c.key ? "selected" : "")} onClick={() => { setCategory(c.key); setModule(c.key); }}>{c.label}</button>)}</div>
          <div className="opportunity-table-wrap"><table className="opportunity-table"><thead><tr><th>OPPORTUNITY</th><th>CATEGORY</th><th>VERIFICATION</th><th>LAST VERIFIED</th><th><span className="sr-only">Star</span></th><th><span className="sr-only">Link</span></th></tr></thead><tbody>
            {filtered.map((o) => <tr key={o.id}><td><div className="opportunity-title-cell"><span className="opportunity-icon"><FileText size={17}/></span><div><strong>{o.canonical_name}</strong><span>{o.organizer || o.country || "Organization not specified"}</span></div></div></td><td><span className="category-label">{categoryLabel(o.primary_category)}</span></td><td><span className={"status-pill " + statusClass(o.verification_status)}><i/>{prettyStatus(o.verification_status)}</span></td><td><span className="last-verified">{dateLabel(o.last_verified_at)}</span></td><td>{userEmail && !o.id.startsWith("preview-") ? <TrackOpportunityButton opportunityId={o.id} title={o.canonical_name} description={o.description} officialUrl={o.official_url}/> : <span className="no-link">—</span>}</td><td>{o.official_url ? <a className="open-link" href={o.official_url} target="_blank" rel="noreferrer" title="Open official page"><ExternalLink size={16}/></a> : <span className="no-link">—</span>}</td></tr>)}
            {!filtered.length && <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon"><Search size={20}/></div><strong>{loading ? "Loading directory…" : userEmail ? "No matching opportunities" : configured ? "Sign in to view your saved opportunities" : "Connect Supabase to load records"}</strong><p>{loading ? "Fetching the latest records." : userEmail ? "Try another search term or category." : configured ? "Use the sign-in form above to access your database." : "Preview mode is active. Configure the environment variables to connect."}</p></div></td></tr>}
          </tbody></table></div><div className="table-footer"><span>Showing {filtered.length} of {userEmail ? items.length : configured ? 0 : preview.length} {configured ? "loaded" : "preview"} items</span><span><ShieldCheck size={14}/> Unverified records are not presented as open</span></div>
        </section> : module === "planner" ? <PlannerWorkspace /> : module === "learner" ? <LearnerWorkspace /> : module === "settings" ? <SettingsWorkspace /> : <section className="module-placeholder"><div className="module-placeholder-icon">{module === "calendar" ? <CalendarDays size={25}/> : <BookOpen size={25}/>}</div><div className="section-kicker">NEXT BUILD MILESTONE</div><h2>{title}</h2><p>{module === "calendar" ? "The calendar will show deadlines, work sessions and conflicts once the planner and task model are connected." : "Inspect organizations, follow linked pages, find opportunities, and gather recent work and contact routes."}</p><div className="placeholder-steps"><div><span>01</span><div><strong>{module === "research" ? "Source-page research" : "Data model"}</strong><small>{module === "research" ? "Follow relevant subpages and capture evidence." : "Define tasks, events, resources and personal tracking."}</small></div></div><div><span>02</span><div><strong>{module === "research" ? "Extraction and review" : "Interactive workspace"}</strong><small>{module === "research" ? "Extract deadlines, eligibility and direct links." : "Build create, edit, search and progress controls."}</small></div></div><div><span>03</span><div><strong>{module === "research" ? "Approved discoveries" : "Connect the workflow"}</strong><small>{module === "research" ? "Only reviewed findings move into your directory." : "Turn saved opportunities into tasks and calendar plans."}</small></div></div></div><button className="outline-button" onClick={() => navigate("overview")}><ArrowRight size={15}/> Back to overview</button></section>}

        <footer className="page-footer"><span>Opportunity Tracker <b>·</b> Built for focused research and action</span><span><i/> Your data stays in your Supabase project</span></footer>
      </div>
    </main>
  </div>;
}
