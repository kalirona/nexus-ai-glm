# Task 12-ui — Fix AI Infrastructure Providers & Models tabs

**Agent:** 12-ui (ai-infra fix agent)
**Scope:** Fix the broken Providers and Models tabs in `src/features/ai-infra/ai-infra-view.tsx`. The Providers tab had no inline API-key input (forcing a hop to Credentials); the Models tab still used the deprecated `fetchProviderModels` flow and old `enabledModels`/`defaultModel` settings instead of the Phase 2.8 three-layer registry.

## What I changed

### 1. New types added (after `TestResult` interface)
- `AiModel` — 30+ fields matching the Prisma `AiModel` model (providerId, modelId, displayName, owner, category, contextWindow, maxOutputTokens, inputCostPerM, outputCostPerM, 8 supportsX flags, verificationStatus, enabled, approved, isDefault, defaultCapability, healthStatus, avgLatencyMs, lastHealthCheck, lastSyncAt, lastVerifiedAt, createdAt, updatedAt).
- `RegistryCounts { catalog, verified, approved, healthy }` and `RegistryResponse { models, counts }` for `GET /api/admin/models/registry`.
- `SyncReport` matching `POST /api/admin/models/sync/:providerId` (providerId, providerName, catalogModels, verified, approved, newModels, updatedModels, unavailable, deprecated, removed, duration, error?).
- `VerifyResult { verified, latencyMs, error? }` for `POST /api/admin/models/registry/:id/verify`.

### 2. Providers tab — inline API key + base URL + test (`ProvidersSection`, new `ProviderCard`, `ProviderConfigForm`)
- `ProvidersSection` now also pulls `GET /api/admin/settings` so each card can resolve its existing key (masked) without a Credentials-tab hop.
- Extracted the per-card JSX into a new **`ProviderCard`** component so each card can own its local state (`apiKeyInput`, `showKey`, `baseUrlInput`, `saving`) — initialised once from the provider/settings props via lazy `useState`, no syncing effect.
- Each card now shows:
  - **Base URL** — read-only for providers with a fixed `baseUrl` in `AI_PROVIDERS`; **editable Input** for `custom` / `azure` / `bedrock` (those without a fixed `def.baseUrl`).
  - **API key input** (password field with show/hide eye toggle). Placeholder shows `Saved: <maskedKey> — type to replace` when a key exists, or the provider's `keyPlaceholder` otherwise. The current masked key (from `settings.apiKeys[]`) is shown below the input in emerald when present and no edit is in flight.
  - A **"Save & Test" button** appears (above the Test/Models/Switch row) only when the user has typed something into the key input.
  - The **Test button** is enabled whenever a key is available — saved (`hasKey`) OR freshly typed (`hasInput`) — instead of being disabled waiting for the Credentials tab.
- **"Save & Test" flow** (in `ProviderCard.saveAndTest`):
  1. Reads current `apiKeys[]` from settings, removes any existing entry for this provider, appends a new entry `{ id: "key-<providerId>", label: "<ProviderName> Key", role: "all", provider, baseUrl: <baseUrlInput or provider.baseUrl>, apiKey: <trimmed input>, apiKeyMasked: "", isDefault: true, createdAt: now }`.
  2. `PATCH /api/admin/settings` with `{ apiKeys: next }` — backend masks the key, preserves raw key for any entry where the incoming `apiKey` is empty, and enforces one-default-per-role.
  3. `await qc.invalidateQueries({ queryKey: ["ai-settings"] })` so the masked key is re-fetched.
  4. `POST /api/admin/providers/:id/test` — on success: `Key saved · Connection OK · <n> models · <latency>`; on failure: `Key saved but test failed: <error>`.
  5. Invalidates `["ai-providers"]` so the card status refreshes; clears the key input.
- `ProviderConfigDialog` now passes `settings` through. `ProviderConfigForm` keeps the existing org/project/region/timeout/retry fields and adds:
  - **API key section** at the top (with a "Current: <maskedKey>" emerald pill when a key is saved, a password Input with show/hide eye, and a **"Save key" button** that runs the same `apiKeys[]` replace flow as the card — but without the test step, since the dialog is for config tuning).
  - **Base URL field** (shown only for custom providers) — saved via the existing `PATCH /api/admin/providers` body when the user clicks "Save config".
  - `statusBadge` was promoted to a module-scope helper so both `ProviderCard` and the rest of the file can share it.

### 3. Models tab — three-layer registry (`ModelsSection`, new `VerificationBadge`, `HealthBadge`)
- **Removed** the old `fetchTrigger` / `LiveModel` / `enabledModels` / `defaultModel` flow entirely.
- **Sync button** — replaced "Fetch models" with **"Sync from provider"** that calls `POST /api/admin/models/sync/:providerId`. On success shows a toast with the sync report: `Synced <catalogModels> models · <newModels> new · <updatedModels> updated · <duration>`. On `report.error` shows the error. Invalidates `["ai-models-registry"]`.
- **Layer filter** — three-button segmented control (`Catalog` / `Verified` / `Approved`) backed by a local `layer` state (`"catalog" | "verified" | "approved"`).
- **Registry query** — `useQuery(["ai-models-registry", effectiveProvider, layer, search])` calls `GET /api/admin/models/registry?provider=<id>&layer=<layer>&q=<search>`. Enabled only when `effectiveProvider` is non-empty.
- **Counts strip** — four cards showing `catalog` / `verified` / `approved` / `healthy` from `registry.counts` (color-coded emerald/amber/teal).
- **Model table** columns: Model (displayName + modelId mono + providerName + Crown when isDefault), Context (contextWindow), Input $/M (inputCostPerM), Output $/M (outputCostPerM), Caps (icons for vision/function-calling/reasoning/streaming/images/audio/embeddings), Status (VerificationBadge + HealthBadge stacked), Actions (Verify button + Approve star + Set-default Crown + Enable switch).
- **Verify button** — `POST /api/admin/models/registry/:id/verify` — toast `Verified · <latency>` on success or `Verification failed: <error>`.
- **Approve (star)** — `PATCH /api/admin/models/registry/:id` with `{ approved: !m.approved }`. Filled amber star when approved.
- **Set default (Crown)** — `PATCH /api/admin/models/registry/:id` with `{ isDefault: !m.isDefault, defaultCapability: "chat" }`. The backend auto-unsets any other default for the `chat` capability. Filled amber Crown when isDefault.
- **Enable toggle** — `Switch` mapped to `PATCH ... { enabled: v }`.
- **`VerificationBadge`** — covers all 7 verificationStatus values (`verified`/`unverified`/`unavailable`/`deprecated`/`preview`/`private`/`disabled-by-provider`) with color-coded outlines.
- **`HealthBadge`** — covers all 5 healthStatus values (`healthy`/`slow`/`degraded`/`offline`/`unknown`).
- Empty state now directs the user to "Sync from provider" instead of "Fetch models".

## Lint / type compliance
- `bun run lint` → **0 errors, 0 warnings**.
- `bunx tsc --noEmit` → no errors in `ai-infra-view.tsx`, `lib/settings.ts`, `lib/api-client.ts`, `lib/constants.ts`, `lib/sync-engine.ts` (the only remaining TS errors in the repo are pre-existing ones in `paywall-modal.tsx`, `billing-view.tsx`, `chat-view.tsx` — outside this task's scope).
- **No `useEffect` with `setState`** — every draft is either a lazy `useState` initializer or a derived value computed inline on each render (the project's `react-hooks/set-state-in-effect` rule is satisfied).
- **Edits-overlay pattern preserved** — the `ProviderCard` and `ProviderConfigForm` read base values from props, layer local edits, and merge on save.
- `"use client"` directive intact; `export function AIInfraView` unchanged.

## Files touched
- `src/features/ai-infra/ai-infra-view.tsx` — added new types, `ProviderCard`, `VerificationBadge`, `HealthBadge`, `statusBadge` (module scope); rewrote `ProvidersSection`, `ProviderConfigDialog`, `ProviderConfigForm`, `ModelsSection`. File grew from 2,637 → 3,090 lines.

## Verification
- Dev server (`bun run dev`) recompiled cleanly after edits — no errors in `dev.log`; the three endpoints the UI depends on (`/api/admin/providers`, `/api/admin/settings`, `/api/admin/models/registry`) all return 200.
- Did NOT touch Defaults, Usage, Routing, Credentials, Limits, Logs, or Health tabs — only Providers + Models per the task scope.
- Kept all existing imports; added no new imports (all icons used — `Microscope`, `Crown`, `Star`, `Boxes`, `ImageIcon`, `AudioLines`, `Lock`, `Eye`, `EyeOff`, `RefreshCw`, etc. — were already in the file).
