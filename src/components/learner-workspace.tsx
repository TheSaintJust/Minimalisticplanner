"use client";

import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Check, ChevronDown, FileText, Film, GraduationCap, ImagePlus, Link2, LoaderCircle, Plus, Search, Sparkles, UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ResourceType = "mooc" | "youtube_playlist" | "university_lecture" | "url" | "pdf" | "screenshot" | "note";
type Resource = {
  id: string; title: string; resource_type: ResourceType; url: string | null;
  description: string | null; source_name: string | null; storage_path: string | null;
  mime_type: string | null; file_size_bytes: number | null; ai_summary: string | null;
  learning_goals: string[]; processing_status: string; created_at: string;
};
const resourceTypes: { value: ResourceType; label: string; icon: typeof BookOpen }[] = [
  { value: "mooc", label: "MOOC / online course", icon: GraduationCap },
  { value: "youtube_playlist", label: "YouTube playlist", icon: Film },
  { value: "university_lecture", label: "University lecture", icon: BookOpen },
  { value: "url", label: "Web resource", icon: Link2 },
  { value: "pdf", label: "PDF document", icon: FileText },
  { value: "screenshot", label: "Screenshot", icon: ImagePlus },
  { value: "note", label: "Research note", icon: FileText },
];
const typeLabel = (t: string) => resourceTypes.find(x => x.value === t)?.label ?? t;
const isVideo = (url: string | null) => Boolean(url && /(youtube\.com|youtu\.be|vimeo\.com)/i.test(url));
const typeColor = (t: string) => t === "mooc" ? "learn-lilac" : t === "youtube_playlist" ? "learn-red" : t === "university_lecture" ? "learn-blue" : t === "pdf" ? "learn-amber" : t === "screenshot" ? "learn-green" : "learn-slate";

export function LearnerWorkspace() {
  const client = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ResourceType>("mooc");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadResources = useCallback(async () => {
    if (!client) { setLoading(false); return; }
    const { data: auth } = await client.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);
    if (!uid) { setResources([]); setLoading(false); return; }
    const { data, error } = await client.from("learner_resources").select("*").order("updated_at", { ascending: false }).limit(200);
    if (error) setNotice("Could not load your learning library: " + error.message);
    else setResources((data ?? []) as Resource[]);
    setLoading(false);
  }, [client]);

  useEffect(() => { void loadResources(); }, [loadResources]);

  const filtered = resources.filter(r => {
    const matchesType = filter === "all" || r.resource_type === filter;
    const q = search.toLowerCase().trim();
    return matchesType && (!q || [r.title, r.description, r.source_name, r.url, ...r.learning_goals].some(v => String(v ?? "").toLowerCase().includes(q)));
  });
  const fileCount = resources.filter(r => r.storage_path).length;
  const courseCount = resources.filter(r => ["mooc", "youtube_playlist", "university_lecture"].includes(r.resource_type)).length;

  function resetForm() {
    setTitle(""); setKind("mooc"); setUrl(""); setDescription(""); setGoals(""); setFile(null); setShowForm(false);
  }
  function acceptFile(f: File | null) {
    if (!f) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      setNotice("Use a PDF, PNG, JPEG or WebP file.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setNotice("Files must be 50 MB or smaller.");
      return;
    }
    setFile(f);
    setKind(f.type === "application/pdf" ? "pdf" : "screenshot");
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
    setNotice("");
  }
  function onFileInput(e: ChangeEvent<HTMLInputElement>) { acceptFile(e.target.files?.[0] ?? null); }
  function onDrop(e: DragEvent<HTMLLabelElement>) { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files?.[0] ?? null); }

  async function addResource(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client || !userId) { setNotice("Sign in first to save resources to your private library."); return; }
    if (!title.trim()) { setNotice("Give this resource a title."); return; }
    if (!url.trim() && !file && kind !== "note") { setNotice("Add a source URL or attach a PDF/screenshot."); return; }
    setSaving(true); setNotice("");
    try {
      let storagePath: string | null = null;
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
        storagePath = userId + "/" + crypto.randomUUID() + "-" + safeName;
        const { error: uploadError } = await client.storage.from("learner-resources").upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      const { error } = await client.from("learner_resources").insert({
        user_id: userId,
        title: title.trim(),
        resource_type: kind,
        url: url.trim() || null,
        description: description.trim() || null,
        source_name: url.trim() ? (() => { try { return new URL(url.trim()).hostname.replace(/^www\./, ""); } catch { return null; } })() : null,
        storage_path: storagePath,
        mime_type: file?.type ?? null,
        file_size_bytes: file?.size ?? null,
        learning_goals: goals.split(",").map(s => s.trim()).filter(Boolean),
        processing_status: file || url.trim() ? "pending" : "not_applicable",
        metadata: { added_from: "learner_workspace" },
      });
      if (error) throw error;
      resetForm();
      setNotice("Resource saved to your private learning library. AI extraction is the next processing step.");
      await loadResources();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save this resource.");
    } finally { setSaving(false); }
  }

  async function openFile(resource: Resource) {
    if (!client || !resource.storage_path) return;
    setBusyId(resource.id);
    const { data, error } = await client.storage.from("learner-resources").createSignedUrl(resource.storage_path, 60);
    if (error) setNotice("Could not open file: " + error.message);
    else if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setBusyId(null);
  }

  return <div className="learner-page">
    <section className="learner-hero">
      <div className="learner-hero-copy"><div className="eyebrow"><span className="eyebrow-line"/> PERSONAL KNOWLEDGE SYSTEM</div><h2>Your learning library.</h2><p>Collect courses, lecture series, playlists, papers and screenshots. Give AI the context it needs to build a better learning plan.</p><div className="learner-hero-tags"><span><BookOpen size={13}/> One searchable library</span><span><Sparkles size={13}/> AI-ready source material</span></div></div>
      <div className="learner-hero-art" aria-hidden="true"><div className="learn-orbit learn-orbit-one"/><div className="learn-orbit learn-orbit-two"/><div className="learn-float-card learn-float-top"><Film size={17}/><span>Video lessons</span></div><div className="learn-book"><BookOpen size={40}/><span>LEARN</span></div><div className="learn-float-card learn-float-bottom"><FileText size={17}/><span>Reading notes</span></div></div>
    </section>

    <section className="learner-stats">
      <div className="learner-stat"><span className="learner-stat-icon learn-blue"><BookOpen size={17}/></span><div><strong>{resources.length}</strong><small>Library resources</small></div></div>
      <div className="learner-stat"><span className="learner-stat-icon learn-lilac"><GraduationCap size={17}/></span><div><strong>{courseCount}</strong><small>Courses & playlists</small></div></div>
      <div className="learner-stat"><span className="learner-stat-icon learn-amber"><FileText size={17}/></span><div><strong>{fileCount}</strong><small>Uploaded files</small></div></div>
      <div className="learner-stat"><span className="learner-stat-icon learn-green"><Sparkles size={17}/></span><div><strong>{resources.filter(r => r.processing_status === "ready").length}</strong><small>AI-processed sources</small></div></div>
    </section>

    {notice && <div className="learner-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}

    <section className="learner-library">
      <div className="learner-library-head"><div><div className="section-kicker">YOUR KNOWLEDGE BASE</div><h3>Resource library</h3><p>A Notion-like home for the material behind your goals.</p></div><button className="primary-button" onClick={() => setShowForm(v => !v)}><Plus size={16}/>{showForm ? "Close form" : "Add resource"}</button></div>

      {showForm && <form className="resource-form" onSubmit={addResource}>
        <div className="resource-form-head"><div><strong>Add to your library</strong><p>Save a source link or attach material for later AI analysis.</p></div><button type="button" className="icon-button" onClick={resetForm} aria-label="Close"><X size={17}/></button></div>
        <div className="resource-type-grid">{resourceTypes.slice(0,5).map(t => { const Icon = t.icon; return <button type="button" key={t.value} className={"resource-type-option " + (kind === t.value ? "chosen" : "")} onClick={() => setKind(t.value)}><Icon size={16}/><span>{t.label}</span></button>; })}</div>
        <div className="resource-form-fields"><label><span>Title</span><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. HSE Linguistics — introductory course"/></label><label><span>Source URL</span><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"/></label><label className="resource-description-field"><span>What do you want to learn from it?</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Key topics, course level, why it matters…" rows={2}/></label><label><span>Learning goals (comma separated)</span><input value={goals} onChange={e => setGoals(e.target.value)} placeholder="linguistics, Russian, research methods"/></label></div>
        <label className={"resource-dropzone " + (dragging ? "is-dragging" : "")} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
          <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={onFileInput}/>
          <span className="dropzone-icon"><UploadCloud size={22}/></span><strong>{file ? file.name : "Drop a PDF or screenshot here"}</strong><span>{file ? (file.size / 1024 / 1024).toFixed(1) + " MB · ready to upload" : "or click to browse · PDF, PNG, JPEG, WebP · max 50 MB"}</span>
          {file && <button type="button" className="dropzone-clear" onClick={e => { e.preventDefault(); setFile(null); }}><X size={14}/> Remove file</button>}
        </label>
        <div className="resource-form-foot"><span><Check size={14}/> Private to your account</span><button className="primary-button" disabled={saving}>{saving ? <><LoaderCircle size={15} className="spin"/> Saving…</> : <><Plus size={15}/> Save resource</>}</button></div>
      </form>}

      <div className="learner-toolbar"><div className="search-field"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles, goals and source notes…"/>{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14}/></button>}</div><div className="learner-filter"><span>Type</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All resources</option>{resourceTypes.map(t => <option value={t.value} key={t.value}>{t.label}</option>)}</select><ChevronDown size={14}/></div></div>

      {!userId && !loading ? <div className="learner-empty"><div className="learner-empty-icon"><BookOpen size={24}/></div><strong>Sign in to start your library</strong><p>Your courses, PDFs, screenshots and learning notes are private to your account.</p></div> : loading ? <div className="learner-empty"><LoaderCircle className="spin" size={24}/><strong>Loading your library…</strong></div> : !filtered.length ? <div className="learner-empty"><div className="learner-empty-icon"><UploadCloud size={24}/></div><strong>{resources.length ? "No resources match this filter" : "Your knowledge base starts here"}</strong><p>Add a MOOC, YouTube playlist, university lecture, source URL, PDF or screenshot. Your saved material will appear here.</p><button className="outline-button" onClick={() => setShowForm(true)}><Plus size={15}/> Add your first resource</button></div> :
      <div className="resource-grid">{filtered.map(resource => { const type = resourceTypes.find(t => t.value === resource.resource_type) ?? resourceTypes[3]; const Icon = type.icon; return <article className="resource-card" key={resource.id}><div className={"resource-card-cover " + typeColor(resource.resource_type)}><span className="resource-card-type"><Icon size={13}/>{type.label}</span><span className="resource-card-cover-icon"><Icon size={30}/></span>{resource.storage_path && <span className="resource-file-badge">{resource.mime_type === "application/pdf" ? "PDF" : "IMAGE"}</span>}</div><div className="resource-card-body"><div className="resource-card-source">{resource.source_name || "PERSONAL LIBRARY"}<span className={"processing-dot processing-" + resource.processing_status}/></div><h4>{resource.title}</h4><p>{resource.description || (resource.url ? "Source saved for future learning-plan analysis." : "Uploaded material saved to your private library.")}</p>{resource.learning_goals?.length > 0 && <div className="resource-goals">{resource.learning_goals.slice(0,3).map(g => <span key={g}>{g}</span>)}</div>}<div className="resource-card-foot"><span>{resource.processing_status === "ready" ? "AI analyzed" : resource.processing_status === "failed" ? "Analysis failed" : resource.processing_status === "pending" ? "Awaiting AI analysis" : "Saved"}</span>{resource.storage_path ? <button onClick={() => void openFile(resource)} disabled={busyId === resource.id}>{busyId === resource.id ? <LoaderCircle size={14} className="spin"/> : <ArrowUpRight size={15}/>} Open file</button> : resource.url ? <a href={resource.url} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={15}/></a> : <span><Check size={14}/> In library</span>}</div></div></article>; })}</div>}
      <div className="learner-library-foot"><span>{filtered.length} of {resources.length} resources</span><span><Sparkles size={13}/> AI ingestion and knowledge linking are the next milestone</span></div>
    </section>
  </div>;
}
