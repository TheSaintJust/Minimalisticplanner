"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, FileText, FolderTree, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type InfoItem = { id: string; parent_id: string | null; title: string; slug: string | null; item_type: string; summary: string | null; body_md: string | null; structured_data: Record<string, unknown>; source_url: string | null; source_title: string | null; confidence: string; tags: string[]; review_due_at: string | null };
export function EssentialInformationWorkspace() {
  const client = useMemo(() => createClient(), []);
  const [items, setItems] = useState<InfoItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!client) { setLoading(false); return; }
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) { setItems([]); setLoading(false); return; }
    const { data, error } = await client.from("essential_info_items").select("id,parent_id,title,slug,item_type,summary,body_md,structured_data,source_url,source_title,confidence,tags,review_due_at").order("sort_order").order("title");
    if (error) setError("Could not load essential information: " + error.message);
    else { const rows = (data ?? []) as InfoItem[]; setItems(rows); setSelected(prev => prev && rows.some(x => x.id === prev) ? prev : rows[0]?.id ?? null); setError(""); }
    setLoading(false);
  }, [client]);
  useEffect(() => { void load(); }, [load]);
  const filtered = items.filter(i => [i.title, i.summary, i.body_md, ...(i.tags ?? [])].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()));
  const current = items.find(i => i.id === selected) ?? filtered[0] ?? null;
  const children = current ? items.filter(i => i.parent_id === current.id) : [];
  const parents = current ? items.filter(i => i.parent_id === current.parent_id && i.id !== current.id) : [];
  return <section className="essential-page">
    <div className="essential-hero"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR PERSONAL REFERENCE LIBRARY</div><h2>Essential information</h2><p>Structured, source-linked knowledge you can revisit and expand by topic.</p></div><span className="essential-count"><FolderTree size={16}/>{items.length} records</span></div>
    <div className="essential-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search topics, checklists, documents and facts…"/></div>
    {error && <div className="learner-notice">{error}</div>}
    {loading ? <div className="empty-state">Loading your reference library…</div> : !items.length ? <div className="empty-state"><BookOpen size={22}/><strong>No reference records available</strong><p>Sign in to load shared essential information.</p></div> : <div className="essential-layout">
      <div className="essential-tree"><div className="section-kicker">TOPICS</div>{filtered.map(item => <button key={item.id} className={"essential-tree-item " + (current?.id === item.id ? "active" : "")} style={{ paddingLeft: item.parent_id ? 27 : 12 }} onClick={() => setSelected(item.id)}><span className="essential-tree-icon">{item.parent_id ? <FileText size={15}/> : <FolderTree size={16}/>}</span><span>{item.title}</span>{items.some(x => x.parent_id === item.id) && <ChevronDown size={13}/>}</button>)}</div>
      <article className="essential-detail">{current ? <><div className="essential-detail-top"><span className="category-label">{current.item_type.replaceAll("_"," ")}</span><span className="essential-confidence"><ShieldCheck size={13}/>{current.confidence.replaceAll("_"," ")}</span></div><h2>{current.title}</h2>{current.summary && <p className="essential-summary">{current.summary}</p>}{current.body_md && <div className="essential-body">{current.body_md.split("\n").map((line, i) => <p key={i}>{line.startsWith("- ") ? "• " + line.slice(2) : line.startsWith("## ") ? line.slice(3) : line}</p>)}</div>}
      {Object.keys(current.structured_data ?? {}).length > 0 && <div className="essential-facts"><h3>Structured details</h3>{Object.entries(current.structured_data).map(([key,value]) => <div key={key}><span>{key.replaceAll("_"," ")}</span><strong>{typeof value === "object" ? JSON.stringify(value) : String(value)}</strong></div>)}</div>}
      {children.length > 0 && <div className="essential-related"><h3>Inside this topic</h3>{children.map(c => <button key={c.id} onClick={() => setSelected(c.id)}><FileText size={16}/><span><strong>{c.title}</strong><small>{c.summary}</small></span><ExternalLink size={14}/></button>)}</div>}
      {parents.length > 0 && <div className="essential-related"><h3>Related in this section</h3>{parents.map(c => <button key={c.id} onClick={() => setSelected(c.id)}><FileText size={16}/><span><strong>{c.title}</strong><small>{c.item_type}</small></span></button>)}</div>}
      {current.source_url && <a className="outline-button essential-source" href={current.source_url} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Open source: {current.source_title || current.source_url}</a>}
      {current.review_due_at && <p className="essential-review">Review due {new Date(current.review_due_at).toLocaleDateString()}</p>}
      </> : <p>No matching records.</p>}</article>
    </div>}
  </section>;
}
