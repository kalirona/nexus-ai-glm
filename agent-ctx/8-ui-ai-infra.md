# Task 8-ui — AI Infrastructure Center (UI)

**Agent:** 8-ui (ai-infra feature agent)
**Scope:** Build `src/features/ai-infra/ai-infra-view.tsx` — a comprehensive AI Infrastructure Center with 9 tabs.

## What I built

### Backend additions (minimal, required for the UI to persist)
- `src/lib/settings.ts` — added 4 new fields to `DEFAULT_SETTINGS`: `defaultModels` (Record<useCase, modelId>), `routingRules` (Record<useCase, {primary, fallback}>), `aiLimits` (8-field budget/rate object), `defaultModel` (string). Type `PlatformSettings` now includes them.
- `src/app/api/admin/settings/route.ts` — GET returns the 4 new fields; PATCH handles each (object check for the three record/object fields, string check for `defaultModel`). All persisted via the existing key-value `setSetting` store.

### UI — `src/features/ai-infra/ai-infra-view.tsx` (2,636 lines)
Named export `AIInfraView()`, `"use client"`. Header + amber Super-Admin warning banner + 9-tab grid (3 cols mobile → 9 cols desktop) + AnimatePresence transitions.

**Tab 1 · Providers** — Grid of all 18 provider cards (from `AI_PROVIDERS`). Each card: name, description, status badge (Active=emerald / Inactive=amber / Unconfigured=muted), mono base URL, capability icon chips (streaming/vision/embedding/audio/image/video/reasoning/functionCalling), last-test result badge + time-ago. Buttons: "Test" (POST `/api/admin/providers/:id/test`), "Models" (jumps to Models tab pre-selected), active/inactive Switch. Clicking the provider name opens a `ProviderConfigDialog` (split into a keyed `ProviderConfigForm` so opening a different provider remounts + re-initialises — no syncing effect) with org/project/region/timeout/retry fields shown only for providers that support them.

**Tab 2 · Models** — Provider selector at top (auto-picks first provider with a key). "Fetch models" button triggers `GET /api/admin/providers/:id/models`. Live model table: name + id, context window, input/output $/M, capability chips (vision/function/reasoning/streaming), enable/disable Switch (toggles `enabledModels` in settings), "Set default" Star (writes `defaultModel` in settings). Search + capability filter + Refresh. Skeleton while loading; red error card if fetch fails; amber notice when provider doesn't support model listing.

**Tab 3 · Defaults** — 13 use-case cards (Chat, Reasoning, Coding, Writing, Research, Vision, Image Gen, Video Gen, Audio, Embeddings, Moderation, AI Employees, Workflows) each with a model dropdown sourced from enabled models. "Save defaults" merges the local edits overlay into `defaultModels` and PATCHes settings. Unsaved-change counter on the save button.

**Tab 4 · Usage** — 6 stat cards (Total Requests, Requests Today, Total Tokens, Total Cost, Error Rate, Avg Latency) from `GET /api/admin/usage`. 7-day requests-vs-errors bar chart (recharts `BarChart` + `ResponsiveContainer` + `Cell` colouring). Provider breakdown table + top-10 model breakdown table. All numbers `tabular-nums`.

**Tab 5 · Routing** — Table with 6 use cases (Chat, Research, Coding, Reasoning, Images, Video) × primary + fallback dropdowns. Live "flow" preview column (model → model). "Save routing" merges edits into `routingRules` and PATCHes settings.

**Tab 6 · Credentials** — Emerald "Encrypted at rest" banner. List of API keys (label, role badge colour-coded all= violet / chat= emerald / image= rose, provider badge, masked key, default star, edit/delete). "Add key" opens `ApiKeyForm` dialog: label, role, provider dropdown (auto-fills base URL), base URL, API key (password + show/hide eye), default toggle, optional expiration date. Enforces one default per role scope on save.

**Tab 7 · Limits** — Approaching-limit amber banner (fires when any simulated metric ≥ 80% of its cap). Simulated-usage card with 4 progress bars (monthly $, daily $, concurrent, requests today) colour-coded green/amber/rose. 8 number-input cards: Monthly Budget, Daily Budget, Max Tokens/Request, Max Requests/Day, Max Concurrent, Per-User/Per-Project/Per-Agent Daily. "Save limits" writes `aiLimits`.

**Tab 8 · Logs** — Filter bar (provider dropdown, type dropdown, success/fail dropdown, free-text search, Export CSV). Full log table: timestamp, provider, model, type (+streaming badge), tokens, cost, duration, status badge, error (truncated). "Load more" increments the limit by 100. CSV export builds a Blob + anchor download.

**Tab 9 · Health** — Per-provider health grid derived from `recent` usage logs (uptime %, avg latency, last success/failure time-ago, consecutive-failure streak) + the provider's last-test fields. Colour dot green/amber/red. Per-card "Check" + global "Check all" (runs the test endpoint for every configured provider). 7-day health timeline bar chart (requests vs errors).

## Implementation notes
- All server state via `useQuery` / `useMutation` from `@tanstack/react-query`; mutations invalidate the right query keys.
- All API calls via `api()` from `@/lib/api-client`.
- Toasts via `sonner`; conditional classes via `cn()`.
- Animations via `motion` + `AnimatePresence` (mode="wait", keyed by active tab).
- shadcn components used: Card, Button, Input, Label, Badge, Switch, Separator, Select, Dialog (+ Header/Title/Footer), recharts (BarChart/Bar/XAxis/YAxis/CartesianGrid/Tooltip/ResponsiveContainer/Cell).
- **No `useEffect` with `setState`** — the project's `react-hooks/set-state-in-effect` lint rule forbids it. Drafts that previously synced from settings were refactored to an "edits overlay" pattern (read base from settings, layer local edits, merge on save, clear edits after save). The provider-config form was split into a keyed inner component that re-initialises via a lazy `useState` initializer when the provider changes.
- Cross-tab wiring: `AIInfraView` holds `activeTab` + `modelsProviderId`; Providers and Health tabs call `onOpenModels(id)` to jump to the Models tab with a pre-selected provider.
- TypeScript interfaces declared for every API response (ConfiguredProvider, LiveModel, AiUsageLog, UsageResponse, PlatformSettings, ApiKeyConfig, AiLimits, TestResult).
- Responsive mobile-first throughout; `tabular-nums` on all numeric cells.

## Verification
- `bun run lint` → clean (0 errors, 0 warnings).
- `bunx tsc --noEmit` → no errors in `ai-infra-view.tsx`, `lib/settings.ts`, or `api/admin/settings/route.ts`. (One pre-existing error in `topbar.tsx` about a missing `'ai-infra'` ModuleKey map entry — that's a wiring concern for the integration agent, not this file.)
- API smoke tests: `GET /api/admin/settings` now returns `defaultModels`, `routingRules`, `aiLimits`, `defaultModel`; `GET /api/admin/providers` returns all 18 providers with configured state.

## Files touched
- `src/features/ai-infra/ai-infra-view.tsx` (new, 2,636 lines)
- `src/lib/settings.ts` (+14 lines: 4 new DEFAULT_SETTINGS fields)
- `src/app/api/admin/settings/route.ts` (+18 lines: GET returns + PATCH handles the 4 new fields)
