# Integrations, AI routing, and learner knowledge base

## Product behavior

### Google Calendar
- A user chooses **Connect Google Calendar** and completes Google OAuth consent.
- Request only the Calendar scopes required for the selected sync direction.
- Store OAuth refresh tokens only on the server in an encrypted secret store; never in browser storage or ordinary readable user tables.
- Keep a private connection status row in `user_integration_connections`.
- Support a user-selected calendar, preview before first sync, stable app event IDs, idempotent upserts, cancellation handling, conflict detection, and disconnect/revoke.
- Do not silently overwrite external calendar events. Keep task planning canonical in this app unless the user chooses otherwise.

### Telegram natural-language capture
- Each user pairs Telegram with their account using a one-time, expiring, single-use code.
- A webhook validates Telegram's webhook secret, maps the Telegram sender to a paired account, rate-limits requests, and does not trust chat text as authorization.
- The AI parses an informal request into a proposed event/opportunity and plan, then performs online research and returns evidence and a preview.
- Example input: `HSE linguistic conference 20 Dec 7 Dec`.
- If the context indicates the conference deadline is 20 December and preparation should begin 7 December, propose:
  - Event/deadline: 20 December (year must be resolved; if ambiguous, ask or clearly show the inferred year).
  - Preparation start: 7 December.
  - Planning window: 13 calendar days between the two dates, not an assumed 13 full workdays.
  - Research: search official conference sources for the real date, application/submission deadline, eligibility, location/format, and source links.
  - Plan: create a draft with research, eligibility review, abstract/topic choice, outline, drafting, revision and submission-check tasks; estimate durations based on the opportunity type and days available.
- Return a proposed plan and ask the user to confirm before writing tasks or calendar events. Vague dates, year, timezone, event date versus deadline, and conflicting source dates must be surfaced.
- Commands should support later edits such as “move start to Monday”, “add a reminder two days before”, and “mark abstract finished”.

### User-selected AI API
- Store a user's selected provider/model preference separately from provider credentials.
- Initial provider choices: OpenAI, Anthropic, Google Gemini, OpenRouter and a custom OpenAI-compatible endpoint.
- Store keys only in a server-side encrypted secret store. The browser may submit a key once to an authenticated server endpoint, but the endpoint must never echo it, log it, or put it into a normal profile table. Provide delete/rotate actions.
- Validate provider and model against an allowlist, set request timeouts and per-user budgets, and log usage metadata without prompts or secrets by default.
- Use an internal provider adapter so Telegram, research and planning workflows can use the user's selected model without embedding provider-specific code in each feature.
- API credentials and integration tokens must never be exposed via `NEXT_PUBLIC_*` variables.

## Learner knowledge base

The `public.learner_resources` table supports a user's private resource collection:
- MOOC / online course
- YouTube playlist
- University lecture
- Web resource
- PDF
- Screenshot
- Research note

The private `learner-resources` Storage bucket holds PDFs and image uploads. Storage paths start with the authenticated user's UUID and RLS policies restrict access to that owner. The UI can save links and files and open uploaded files through short-lived signed URLs.

### Next processing pipeline
1. Validate the URL/file and record provenance.
2. Extract metadata and text from web pages and PDFs; use OCR for screenshots where supported.
3. For YouTube playlists, collect permitted public metadata/transcripts where available; respect platform access and copyright constraints.
4. Create a source summary, topic map, prerequisite map, estimated effort and learning outcomes.
5. Link resources to user goals and existing opportunity plans.
6. Let the user correct extracted metadata and approve AI-generated learning plans before tasks are created.

Do not claim the current save/upload path performs OCR, PDF parsing, transcript extraction or AI planning yet; those are separate processing stages.

## Implemented in this milestone
- More polished dashboard styling and a dedicated Learner workspace.
- Authenticated CRUD foundation for adding resource metadata and uploading private PDFs/images to Supabase Storage.
- User-selectable AI provider/model preference saved to `user_ai_preferences`.
- Integration status UI and explicit setup checklists for Google Calendar and Telegram.
- RLS-protected connection status table.

## Not yet implemented
- Google OAuth consent and refresh-token encryption.
- Telegram bot/webhook, account pairing and message handling.
- Encrypted user API-key vault and provider adapters.
- Online research, OCR/PDF parsing, YouTube transcript extraction, AI summaries and task-plan generation.
- Calendar sync conflict resolution and recurring sync jobs.

The UI must always distinguish a real connected integration from a setup checklist. Never display “Connected” until a successful authenticated handshake and token validation have completed.
