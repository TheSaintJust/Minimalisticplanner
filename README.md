# Opportunity Tracker

A Next.js workspace for opportunity discovery, planning, learning and research. It uses the existing Supabase project and keeps opportunity verification explicit.

## Current milestone

- Responsive dashboard shell with navigation for Overview, Calendar, Planner, Learner and Research.
- Separate opportunity windows for Applications, Scholarships & Fellowships, Writing, Calls for Papers, Jobs & Internships, and Special Focus.
- Email/password sign-in and sign-up with Supabase Auth.
- Authenticated read-only view of records in `public.opportunities`, including category, verification status, last verification date and official source link.
- Search and category filtering.
- CI build workflow.
- Preview mode before environment variables are configured.

Calendar, task CRUD, AI extraction, automated schedules and approval/promote flows are not implemented yet. The Add Opportunity action is intentionally a placeholder until write permissions and the review workflow are built.

## Requirements

- Node.js 20.9 or later (Node.js 22 LTS recommended)
- npm
- Git
- Supabase access to the existing project

## Run locally (Windows PowerShell)

1. Install Node.js from https://nodejs.org/ and VS Code from https://code.visualstudio.com/.
2. Clone this repository and open its folder in VS Code:

   ```powershell
   git clone https://github.com/TheSaintJust/Minimalisticplanner.git
   cd Minimalisticplanner
   ```

3. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Open `.env.local`. The Supabase project URL is already filled in. In the Supabase dashboard for project `megamcwcakaizafywdac`, open Project Settings and find the **Publishable key** (or legacy anon public key). Put it after `NEXT_PUBLIC_SUPABASE_ANON_KEY=`.

   Use only the publishable/anon key in this variable. **Never put the service-role key or a database password in a `NEXT_PUBLIC_` variable or commit them to GitHub.**

5. Install dependencies and start the development server:

   ```powershell
   npm install
   npm run dev
   ```

6. Open http://localhost:3000.

## Authentication and data access

The app signs users in through Supabase Auth. New users may need to confirm their email, depending on the project's Auth settings. After signing in, the app reads up to 500 rows from `public.opportunities`. Access is enforced by Supabase Row Level Security, not by hiding controls in the frontend.

If sign-in works but the opportunity list is empty or returns a permission error, check that:
- Email authentication is enabled in Supabase Auth.
- The signed-in account is authenticated.
- The existing `opportunities` table's authenticated SELECT policy is enabled.
- `.env.local` has the correct project URL and publishable/anon key.

## Data integrity

Records with `unverified` or `needs_review` status are shown as such. A URL existing does not mean an opportunity is open. Newly discovered links should remain pending until source evidence, deadlines and eligibility are checked.

The source crawler is deployed as the Supabase Edge Function `crawl-opportunity-sources`, but it is not scheduled and has not been run/validated end to end yet. It must not be described as an automated daily discovery system until a tested run and scheduler are in place.

## Development checks

```powershell
npm run build
npm run lint
```

A GitHub Actions workflow runs a production build on pushes and pull requests to `main`.

## Next milestones

1. Run and fix the first production build.
2. Connect authentication and verify the existing opportunity records load.
3. Add opportunity detail/edit and user-specific save/track actions.
4. Finish crawler tests and implement robust page-content extraction and manual approval.
5. Add plans, tasks and calendar events before building AI planning and schedule automation.
