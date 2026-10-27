"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ExternalLink, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type EventRow = { id: string; title: string; description: string | null; starts_at: string; ends_at: string; source: string; sync_status: string; metadata: Record<string, unknown> };
export function CalendarWorkspace() {
 const client = useMemo(() => createClient(), []);
 const [events,setEvents] = useState<EventRow[]>([]);
 const [loading,setLoading] = useState(true);
 const [notice,setNotice] = useState("");
 const load = useCallback(async () => {
  if (!client) { setLoading(false); return; }
  const {data:auth}=await client.auth.getUser();
  if(!auth.user){setEvents([]);setLoading(false);return;}
  const {data,error}=await client.from("calendar_events").select("id,title,description,starts_at,ends_at,source,sync_status,metadata").order("starts_at",{ascending:true}).limit(300);
  if(error)setNotice("Could not load calendar: "+error.message); else {setEvents((data??[]) as EventRow[]);setNotice("");}
  setLoading(false);
 },[client]);
 useEffect(()=>{void load();},[load]);
 const fmt=(s:string)=>new Date(s).toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
 return <section className="calendar-workspace"><div className="calendar-hero"><div><div className="eyebrow"><span className="eyebrow-line"/> YOUR SCHEDULE</div><h2>Calendar</h2><p>Preparation windows, tasks and scheduled work saved in your planner.</p></div><button className="outline-button" onClick={()=>{setLoading(true);void load();}} disabled={loading}><RefreshCw size={14}/>{loading?"Loading…":"Refresh"}</button></div>
 {notice&&<div className="learner-notice">{notice}</div>}
 {loading?<div className="empty-state">Loading calendar events…</div>:!events.length?<div className="empty-state"><CalendarDays size={24}/><strong>No calendar events yet</strong><p>Star an application, fellowship or job and choose starting and ending dates to create a preparation window.</p></div>:<div className="calendar-event-list">{events.map(e=><article key={e.id} className="calendar-event-card"><div className="calendar-event-date"><CalendarDays size={17}/><span>{new Date(e.starts_at).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span></div><div className="calendar-event-main"><strong>{e.title}</strong><p>{fmt(e.starts_at)} — {fmt(e.ends_at)}</p>{e.description&&<small>{e.description}</small>}<div className="calendar-event-meta"><span>{e.source.replaceAll("_"," ")}</span><span>{e.sync_status==="synced"?"Externally synced":"Planner calendar"}</span></div></div>{typeof e.metadata?.official_url==="string"&&<a href={e.metadata.official_url} target="_blank" rel="noreferrer" aria-label="Open official source"><ExternalLink size={15}/></a>}</article>)}</div>}
 <p className="calendar-sync-note">These events are saved in your planner calendar. Google Calendar two-way sync is not enabled yet; connect it in Settings when that integration is implemented.</p>
 </section>;
}
