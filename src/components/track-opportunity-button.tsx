"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TrackOpportunityButton({ opportunityId, title, description, officialUrl }: { opportunityId: string; title: string; description: string | null; officialUrl: string | null }) {
  const client = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!client) return;
      const { data: auth } = await client.auth.getUser();
      if (!active || !auth.user) return;
      setUserId(auth.user.id);
      const { data } = await client.from("tracked_opportunities").select("id,preparation_start,end_date,calendar_event_id").eq("user_id", auth.user.id).eq("opportunity_id", opportunityId).maybeSingle();
      if (!active) return;
      if (data) { setSaved(true); setRecordId(data.id); setEventId(data.calendar_event_id); setStartDate(data.preparation_start ?? ""); setEndDate(data.end_date ?? ""); }
    }
    void load();
    return () => { active = false; };
  }, [client, opportunityId]);

  async function save() {
    if (!client || !userId) { setNotice("Sign in to save opportunities and calendar windows."); return; }
    if (startDate && endDate && startDate > endDate) { setNotice("Starting date must be on or before the ending date."); return; }
    setBusy(true); setNotice("");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    const { data: existing } = await client.from("tracked_opportunities").select("id,calendar_event_id").eq("user_id", userId).eq("opportunity_id", opportunityId).maybeSingle();
    let calendarId = existing?.calendar_event_id ?? eventId;
    if (startDate && endDate) {
      const startsAt = new Date(startDate + "T09:00:00").toISOString();
      const endsAt = new Date(endDate + "T23:59:00").toISOString();
      const eventPayload = { user_id: userId, title: "Preparation window: " + title, description: [description, officialUrl ? "Official page: " + officialUrl : null].filter(Boolean).join("\n\n"), starts_at: startsAt, ends_at: endsAt, timezone, source: "opportunity_tracker", sync_status: "local_only", metadata: { opportunity_id: opportunityId, preparation_start: startDate, deadline: endDate, all_day_window: true } };
      if (calendarId) {
        const { error } = await client.from("calendar_events").update({ ...eventPayload, updated_at: new Date().toISOString() }).eq("id", calendarId).eq("user_id", userId);
        if (error) { setNotice("Could not update calendar event: " + error.message); setBusy(false); return; }
      } else {
        const { data: event, error } = await client.from("calendar_events").insert(eventPayload).select("id").single();
        if (error) { setNotice("Could not create calendar event: " + error.message); setBusy(false); return; }
        calendarId = event.id;
      }
    }
    const payload = { user_id: userId, opportunity_id: opportunityId, preparation_start: startDate || null, end_date: endDate || null, calendar_event_id: calendarId, updated_at: new Date().toISOString() };
    const { data, error } = await client.from("tracked_opportunities").upsert(payload, { onConflict: "user_id,opportunity_id" }).select("id").single();
    if (error) { setNotice("Could not save opportunity: " + error.message); setBusy(false); return; }
    setRecordId(data.id); setEventId(calendarId); setSaved(true); setOpen(false); setNotice(startDate && endDate ? "Starred and saved to your planner calendar." : "Opportunity starred. Add dates any time to create a calendar window."); setBusy(false);
  }

  async function remove() {
    if (!client || !userId) return;
    setBusy(true);
    if (eventId) {
      await client.from("calendar_events").delete().eq("id", eventId).eq("user_id", userId);
    }
    const { error } = await client.from("tracked_opportunities").delete().eq("user_id", userId).eq("opportunity_id", opportunityId);
    if (error) setNotice("Could not remove saved opportunity: " + error.message);
    else { setSaved(false); setRecordId(null); setEventId(null); setStartDate(""); setEndDate(""); setNotice("Removed from starred opportunities and its local calendar window."); }
    setBusy(false);
  }

  return <><button className={"track-star-button " + (saved ? "is-starred" : "")} title={saved ? "Edit dates or unstar" : "Star and plan this opportunity"} aria-label={saved ? "Edit tracked opportunity" : "Star opportunity"} onClick={() => setOpen(true)}><Star size={16} fill={saved ? "currentColor" : "none"}/></button>
  {open && <div className="track-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}><section className="track-modal" role="dialog" aria-modal="true" aria-labelledby={"track-title-" + opportunityId}><button className="track-modal-close" onClick={() => setOpen(false)} aria-label="Close"><X size={17}/></button><div className="section-kicker">SAVE & PLAN</div><h2 id={"track-title-" + opportunityId}>{title}</h2><p>Star this opportunity and optionally set a preparation start date and final deadline. A date window is added to your planner calendar.</p><label>Preparation starting date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label>Ending date / deadline<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label><div className="track-modal-hint"><CalendarDays size={15}/> Calendar window is saved inside your planner. External Google Calendar sync requires connection setup.</div>{notice && <div className="learner-notice">{notice}</div>}<div className="track-modal-actions">{saved && <button className="outline-button" disabled={busy} onClick={() => void remove()}><Star size={14}/> Unstar</button>}<button className="outline-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save & sync calendar"}</button></div></section></div>}</>;
}
