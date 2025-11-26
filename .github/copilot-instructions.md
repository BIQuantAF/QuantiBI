# QuantiBI — Copilot / AI agent instructions (concise)

These notes are targeted at AI coding agents that will make edits, run tests, or implement features in this repo.

Core intent: QuantiBI is a monorepo BI app — a React + TypeScript frontend and an Express/Mongo backend that turns natural-language chart requests into SQL/queries and visualizations.

Quick map (where to start):
- natural language chart flow: `quantibi-backend/src/routes/charts.js` -> calls services in `quantibi-backend/src/services/` (notably `bigquery.js`) -> persists/reads `quantibi-backend/src/models/Chart.js` and `Dataset.js`.
- frontend integration points: `quantibi-frontend/src/components/charts/AIChat.tsx` (UI for NL input), `quantibi-frontend/src/components/charts/CreateChart.tsx`, and renderer `ChartRenderer.tsx`.
- auth + API wiring: frontend `quantibi-frontend/src/contexts/AuthContext.tsx`, frontend API wrapper `quantibi-frontend/src/services/api.ts`, backend middleware `quantibi-backend/src/middleware/auth.js` (Firebase Admin).

Run & dev commands (concrete):
- Use the provided installer: `install.bat` (Windows) to bootstrap deps.
- Or manually:
	- `cd quantibi-frontend; npm install; npm start` (frontend runs on :3000)
	- `cd quantibi-backend; npm install; npm run dev` (backend typically runs on :5000 with nodemon)
- Frontend type-check: `npm run type-check` in `quantibi-frontend`.

Env & secrets (important):
- Frontend example: `quantibi-frontend/env.example` (REACT_APP_* variables).
- Backend environment must provide Firebase Admin credentials and `MONGODB_URI` — see `quantibi-backend/.env` expectations and `FIREBASE_SETUP.md`.

Patterns & conventions to follow (practical, repo-specific):
- Route design: APIs are workspace-scoped under `/api/workspaces/:workspaceId/...` — always include workspaceId when adding routes.
- Auth: All protected routes use `quantibi-backend/src/middleware/auth.js`. When modifying backend routes, ensure the middleware still extracts the user from Firebase token and enforces workspace roles (owner/member/viewer).
- Data models: Mongoose models live in `quantibi-backend/src/models/`. Use these existing models for persistence rather than inventing new schemas.
- AI pipeline: Keep the NL→SQL→Chart transformation inside `src/routes/charts.js` and `src/services/*` (BigQuery helper). New data-source integrations should follow the same service pattern (service module + database config in `Database` model).

Contract (what changes should do):
- Inputs: code changes accept repo-local imports, environment variables per `env.example`.
- Outputs: API behavior must maintain workspace scoping and return consistent Chart/Dashboard JSON shapes matching `src/models/Chart.js`.
- Errors: backend should continue using `http-errors`-style responses (400/401/403/500) and not leak secrets.

Common gotchas and edge cases:
- Firebase Admin credentials missing: locally tests will fail — verify `FIREBASE` env vars before running backend.
- BigQuery credentials: `Database` model stores connection info; service constructs clients dynamically — when testing, prefer sandbox datasets or mocks.
- Frontend token flow: axios interceptors in `quantibi-frontend/src/services/api.ts` expect a valid bearer token; unit tests that call API should stub the interceptor or start a local backend.

Where to look for examples:
- NL→chart flow: `quantibi-backend/src/routes/charts.js` (core pipeline).
- BigQuery implementation: `quantibi-backend/src/services/bigquery.js` (dynamic client, connection checks).
- Auth wiring: `quantibi-backend/src/middleware/auth.js` and frontend `quantibi-frontend/src/contexts/AuthContext.tsx`.

If you modify runtime behavior, update or add a minimal test/example in the matching folder (e.g., route unit test or a small script under `quantibi-backend/`), and note changes in this file.

Questions for you (quick feedback request):
- Do you want the agents to also open PRs with changelog-style summaries? If yes, specify preferred PR title/body format.
- Any files or directories you want treated as read-only (deploy artifacts in `/build`, or `uploads/`)?

End of instruction — ask for clarifications or extra conventions to add.

## Agent PR template (use when creating a PR)
Title: [area] Short summary (e.g. backend/charts: fix BigQuery validation error)

Body:
- What I changed: one-line summary
- Why: short reason (bugfix, feature, refactor)
- Files touched: list of key files edited (e.g. `quantibi-backend/src/routes/charts.js`, `quantibi-backend/src/services/bigquery.js`)
- How I tested: local steps (start frontend/backend, sample request) or unit test added
- Notes/risks: environment variables required or backward-incompatible changes

Keep PRs small and workspace-scoped. If changes touch auth, call out required Firebase env vars in the PR body.

## Concrete examples & quick references
- NL→SQL→Chart contract (in `quantibi-backend/src/routes/charts.js`): OpenAI is asked to return a strict JSON object with fields `dataQuery`, `chartType`, and `explanation`. Validate the JSON before using it — see the parsing and validation blocks in that file.
- BigQuery helper (`quantibi-backend/src/services/bigquery.js`): Create clients with `createBigQueryClient(projectId, credentialsJson)` and use `validateDatasetAndTable` before querying. Use `executeQuery(projectId, credentialsJson, sql)` for SQL runs.
- Auth flow: frontend gets tokens via Firebase `auth.currentUser.getIdToken()` in `quantibi-frontend/src/services/api.ts` (axios request interceptor). Backend expects Bearer tokens and initializes Firebase Admin using `FIREBASE_*` env vars in `quantibi-backend/src/middleware/auth.js`.
- Frontend AI UI: `quantibi-frontend/src/components/charts/AIChat.tsx` sends AI requests via `apiService.generateChartWithAI(workspaceId, { query, dataset })` and expects `aiResponse.data` in Chart.js-compatible format (`labels` + `datasets`).
- Reports feature (AI-generated insights):
  - Backend: `quantibi-backend/src/routes/reports.js` (CRUD + async OpenAI integration), `quantibi-backend/src/models/Report.js` (schema with title, description, chartIds, summary, insights, status).
  - API endpoints: `GET /api/workspaces/:workspaceId/reports` (list), `POST /api/workspaces/:workspaceId/reports` (create, gated by `usageService.tryConsume(uid, 'reports')`), `GET .../reports/:reportId` (detail), `DELETE .../reports/:reportId` (delete).
  - Report creation: API returns 201 immediately with `status: 'draft'`. Backend async helper `generateReportSummary()` calls OpenAI GPT-4 with chart context → updates report status to 'completed' or 'failed'.
  - Frontend: `quantibi-frontend/src/components/reports/Reports.tsx` (list + detail + create modal), `quantibi-frontend/src/services/api.ts` (getReports, getReport, createReport, deleteReport methods).
  - UX: Reports page accessible from navigation; "Generate Report" button on Charts page opens modal to select charts → paywall blocks free users at 1 report limit.
  - Status polling: `ReportDetailModal` polls every 3s to show completion state (Processing → Completed/Failed).
  - Paywall: Free users limited to 1 report; pro users unlimited (set by Stripe webhook when `checkout.session.completed` fires).

If you'd like different PR title/body conventions or more examples (for tests or CI), tell me how you prefer PRs formatted and I'll add them.