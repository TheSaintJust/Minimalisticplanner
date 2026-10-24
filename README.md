# Opportunity Tracker

A Next.js workspace for opportunity discovery, planning, learning and research. It uses the existing Supabase project and keeps opportunity verification explicit.

## Current milestone

- Responsive dashboard with six opportunity windows, including a distinct Jobs & Internships section.
- Supabase Auth email/password sign-in and authenticated opportunity directory.
- Dedicated Learner workspace with resource search, type filters, MOOC / YouTube playlist / university lecture / URL / PDF / screenshot / note resource types, and private PDF/image uploads.
- Settings workspace with saved AI provider/model preferences and honest setup checklists for Google Calendar and Telegram.
- RLS-protected tables for learner resources, integration status, AI preferences, planner projects, planner tasks, calendar events and Telegram/web assistant command drafts.
- Private `learner-resources` Storage bucket with user-folder policies and short-lived signed links for opening uploaded files.
- GitHub Actions production build check.

The Learner UI currently saves and retrieves resources and private files. PDF text extraction, screenshot OCR, YouTube transcript processing, AI summaries and AI-generated learning paths are not implemented yet.

Google Calendar OAuth and two-way sync, Telegram bot pairing/webhook, encrypted personal API-key storage, provider adapters, online research and task-plan generation still require implementation and credentials. The Settings page intentionally does not report either integration as connected before a real handshake succeeds.

## Requirements

- Node.js 20.9 or later (Node.js 22 LTS recommended)
- npm
- Git
- Access to the existing Supabase project

## Run locally (Windows PowerShell)

1. Install Node.js from https://nodejs.org/ and VS Code from https://code.visualstudio.com/.
2. Clone the repository:

   ```powershell
   git clone https://github.com/TheSaintJust/Minimalisticplanner.git
   cd Minimalisticplanner
   ```

3. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. In `.env.local`, keep the provided Supabase project URL and add the project's **Publishable key** (or legacy anon public key) after `NEXT_PUBLIC_SUPABASE_ANON_KEY=`. Find it in Supabase Project Settings → API Keys.

   **Never put a service-role key, database password, Google OAuth secret, Telegram bot token or provider API key in a `NEXT_PUBLIC_*` variable or commit it to GitHub.**

5. Install dependencies and run the app:

   ```powershell
   npm install
   npm run dev
   ```

6. Open http://localhost:3000 and sign in.

## Data access and privacy

- Opportunity data is read under Supabase Row Level Security.
- Learner resources and uploaded files are private to their owner.
- Uploaded files are limited to PDF, PNG, JPEG or WebP, with a 50 MB cap.
- Integration status and AI preferences are user-scoped.
- Provider preferences do not imply API credentials are configured.
- OAuth tokens and user-supplied API keys must be stored only in a server-side encrypted secret store. Do not store raw keys in readable profile tables or browser local storage.
- Telegram-originated plans must be researched and shown as a draft for confirmation before tasks/calendar events are created.
- Opportunity URLs do not prove an opportunity is open; verification and deadlines must be checked against source evidence.

## Schema additions

The Supabase project now includes:
- `learner_resources`
- `user_integration_connections`
- `user_ai_preferences`
- `planner_projects`
- `planner_tasks`
- `calendar_events`
- `assistant_command_runs`

See [integrations and learner roadmap](docs/integrations-and-learning-roadmap.md) for behavior, security requirements and the remaining integration work.

## Development checks

```powershell
npm run build
npm run lint
```

GitHub Actions runs a production build on pushes and pull requests to `main`.
