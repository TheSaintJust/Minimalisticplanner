"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, Clock3, ListTodo, LoaderCircle, Plus, Sparkles, Target, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = { id: string; title: string; description: string | null; status: string; start_date: string | null; deadline_date: string | null; source_type: string; };
type Task = { id: string; project_id: string; title: string; description: string | null; status: string; priority: string; start_at: string | null; due_at: string | null; estimated_minutes: number | null; };

function dateText(value: string | null) {
  if (!value) return "No date";
  const d = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isNaN(d.getTime()) ? "No date" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function PlannerWorkspace() {
  const client = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskEstimate, setTaskEstimate] = useState("60");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!client) { setLoading(false); return; }
    const { data: auth } = await client.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);
    if (!uid) { setProjects([]); setTasks([]); setLoading(false); return; }
    const [p, t] = await Promise.all([
      client.from("planner_projects").select("id,title,description,status,start_date,deadline_date,source_type").order("deadline_date", { ascending: true, nullsFirst: false }).limit(100),
      client.from("planner_tasks").select("id,project_id,title,description,status,priority,start_at,due_at,estimated_minutes").order("due_at", { ascending: true, nullsFirst: false }).limit(500),
    ]);
    if (p.error || t.error) setNotice("Could not load planner: " + (p.error?.message ?? t.error?.message));
    else {
      setProjects((p.data ?? []) as Project[]);
      setTasks((t.data ?? []) as Task[]);
      if (!selectedProject && p.data?.[0]?.id) setSelectedProject(p.data[0].id);
    }
    setLoading(false);
  }, [client, selectedProject]);

  useEffect(() => { void load(); }, [load]);

  const activeProject = projects.find(p => p.id === selectedProject) ?? projects[0] ?? null;
  const projectTasks = tasks.filter(t => t.project_id === activeProject?.id);
  const doneCount = projectTasks.filter(t => t.status === "done").length;
  const progress = projectTasks.length ? Math.round(doneCount / projectTasks.length * 100) : 0;
  const totalMinutes = projectTasks.filter(t => t.status !== "done").reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);

  async function createProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client || !userId) { setNotice("Sign in to save a project."); return; }
    if (startDate && deadlineDate && startDate > deadlineDate) { setNotice("The preparation start must be on or before the deadline."); return; }
    setBusy(true); setNotice("");
    const { data, error } = await client.from("planner_projects").insert({
      user_id: userId, title: projectTitle.trim(), description: projectDescription.trim() || null,
      start_date: startDate || null, deadline_date: deadlineDate || null, source_type: "manual",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    }).select("id,title,description,status,start_date,deadline_date,source_type").single();
    if (error) setNotice("Could not create project: " + error.message);
    else {
      setProjects(prev => [...prev, data as Project]);
      setSelectedProject(data.id);
      setProjectTitle(""); setProjectDescription(""); setStartDate(""); setDeadlineDate(""); setShowProjectForm(false);
      setNotice("Project created.");
    }
    setBusy(false);
  }

  async function createTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client || !userId || !activeProject) return;
    setBusy(true); setNotice("");
    const dueAt = taskDue ? new Date(taskDue + "T17:00:00").toISOString() : null;
    const startAt = activeProject.start_date ? new Date(activeProject.start_date + "T09:00:00").toISOString() : null;
    const { data, error } = await client.from("planner_tasks").insert({
      user_id: userId, project_id: activeProject.id, title: taskTitle.trim(), due_at: dueAt, start_at: startAt,
      estimated_minutes: Number(taskEstimate) || null, priority: taskPriority, status: "todo",
      ai_generated: false, order_index: projectTasks.length,
    }).select("id,project_id,title,description,status,priority,start_at,due_at,estimated_minutes").single();
    if (error) setNotice("Could not add task: " + error.message);
    else {
      setTasks(prev => [...prev, data as Task]);
      setTaskTitle(""); setTaskDue(""); setShowTaskForm(false); setNotice("Task added.");
    }
    setBusy(false);
  }

  async function toggleTask(task: Task) {
    if (!client) return;
    const next = task.status === "done" ? "todo" : "done";
    const { error } = await client.from("planner_tasks").update({ status: next, completed_at: next === "done" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", task.id);
    if (error) setNotice("Could not update task: " + error.message);
    else setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
  }

  return <div className="planner-page">
    <section className="planner-hero"><div><div className="eyebrow"><span className="eyebrow-line"/> FROM INTENTION TO EXECUTION</div><h2>Make progress visible.</h2><p>Turn an opportunity or goal into a project, then break it into clear tasks with dates, effort and priorities.</p></div><button className="primary-button" onClick={() => setShowProjectForm(v => !v)}><Plus size={16}/>{showProjectForm ? "Close" : "New project"}</button></section>
    {notice && <div className="learner-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15}/></button></div>}
    {showProjectForm && <form className="planner-form" onSubmit={createProject}><div className="resource-form-head"><div><strong>Create a planning project</strong><p>Set the preparation start and final deadline. AI-generated plans can use this same structure later.</p></div><button type="button" className="icon-button" onClick={() => setShowProjectForm(false)} aria-label="Close"><X size={17}/></button></div><div className="planner-form-grid"><label><span>Project title</span><input required value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="HSE Linguistics Conference"/></label><label><span>Preparation start</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}/></label><label><span>Deadline</span><input type="date" value={deadlineDate} min={startDate || undefined} onChange={e => setDeadlineDate(e.target.value)}/></label><label className="planner-description"><span>Description</span><textarea rows={2} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} placeholder="What outcome are you working toward?"/></label></div><div className="resource-form-foot"><span><Target size={14}/> Personal project</span><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Create project"}</button></div></form>}
    {!userId && !loading ? <div className="learner-empty"><div className="learner-empty-icon"><ListTodo size={24}/></div><strong>Sign in to use your planner</strong><p>Projects and tasks are private to your account.</p></div> : loading ? <div className="learner-empty"><LoaderCircle className="spin" size={24}/><strong>Loading your planner…</strong></div> : !projects.length ? <div className="planner-empty"><div className="planner-empty-icon"><CalendarDays size={25}/></div><h3>Start with one goal</h3><p>Create a project with a start date and deadline. Later, Telegram and AI research can propose a schedule and tasks for your review.</p><button className="primary-button" onClick={() => setShowProjectForm(true)}><Plus size={16}/> Create your first project</button></div> :
    <div className="planner-layout"><aside className="planner-project-list"><div className="planner-list-head"><span>YOUR PROJECTS</span><button onClick={() => setShowProjectForm(true)} aria-label="Add project"><Plus size={15}/></button></div>{projects.map(p => <button key={p.id} className={"planner-project-item " + (p.id === (activeProject?.id) ? "selected" : "")} onClick={() => setSelectedProject(p.id)}><span className="project-item-icon"><Target size={16}/></span><span className="project-item-copy"><strong>{p.title}</strong><small>{p.deadline_date ? "Due " + dateText(p.deadline_date) : "No deadline"}</small></span><ArrowRight size={14}/></button>)}</aside>
      {activeProject && <section className="planner-project-detail"><div className="planner-project-title-row"><div><div className="section-kicker">PROJECT OVERVIEW</div><h3>{activeProject.title}</h3><p>{activeProject.description || "A focused project in your personal planner."}</p></div><span className={"project-status status-" + activeProject.status}>{activeProject.status}</span></div>
        <div className="project-date-row"><div><span><CalendarDays size={14}/> START</span><strong>{dateText(activeProject.start_date)}</strong></div><div><span><Target size={14}/> DEADLINE</span><strong>{dateText(activeProject.deadline_date)}</strong></div><div><span><CheckCircle2 size={14}/> PROGRESS</span><strong>{progress}% complete</strong></div></div>
        <div className="project-progress"><span style={{ width: progress + "%" }}/></div>
        <div className="task-list-heading"><div><h4>Tasks & milestones</h4><p>{doneCount} of {projectTasks.length} completed · {Math.ceil(totalMinutes / 60)} hours estimated remaining</p></div><button className="outline-button" onClick={() => setShowTaskForm(v => !v)}><Plus size={15}/>{showTaskForm ? "Cancel" : "Add task"}</button></div>
        {showTaskForm && <form className="planner-task-form" onSubmit={createTask}><label><span>Task</span><input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Research official conference requirements"/></label><label><span>Due date</span><input type="date" min={activeProject.start_date || undefined} max={activeProject.deadline_date || undefined} value={taskDue} onChange={e => setTaskDue(e.target.value)}/></label><label><span>Effort (minutes)</span><input type="number" min="0" step="15" value={taskEstimate} onChange={e => setTaskEstimate(e.target.value)}/></label><label><span>Priority</span><select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save task"}</button></form>}
        <div className="planner-task-list">{projectTasks.map((task, index) => <article key={task.id} className={"planner-task-row " + (task.status === "done" ? "task-complete" : "")}><button className="task-check" onClick={() => void toggleTask(task)} aria-label={task.status === "done" ? "Mark task incomplete" : "Complete task"}>{task.status === "done" ? <CheckCircle2 size={19}/> : <Circle size={19}/>}</button><span className="task-order">{String(index + 1).padStart(2, "0")}</span><div className="task-row-copy"><strong>{task.title}</strong><span>{task.estimated_minutes ? Math.round(task.estimated_minutes / 15) / 4 + "h effort" : "Effort not estimated"}{task.priority !== "medium" ? " · " + task.priority + " priority" : ""}</span></div><span className="task-due"><Clock3 size={13}/>{dateText(task.due_at)}</span><span className={"task-priority priority-" + task.priority}>{task.priority}</span></article>)}{!projectTasks.length && <div className="planner-no-tasks"><Sparkles size={19}/><strong>No tasks yet</strong><span>Add tasks manually now; AI-assisted research and plan proposals will be layered onto this workflow next.</span></div>}</div>
      </section>}
    </div>}
  </div>;
}
