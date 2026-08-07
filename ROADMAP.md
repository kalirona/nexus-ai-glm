# NexusAI — Product & Profitability Roadmap

> Living document. Each phase has a clear objective, concrete deliverables, exit
> criteria, and a profit/utility impact estimate. Update the `Status` line as we ship.
> Decision principle: **every feature must save time, increase revenue, automate work, or
> simplify operations.** If it doesn't, it doesn't ship.

---

## North-Star Metrics

| Metric | Target (12 months) | Why it matters |
|--------|--------------------|----------------|
| Monthly Recurring Revenue (MRR) | $50k | Primary profitability signal |
| Active subscriptions | 1,500 paid | Validates willingness to pay |
| Free → Paid conversion | 4–6% | Healthy SaaS benchmark |
| Net Revenue Retention | >110% | Expansion + low churn beats new acquisition |
| Daily Active Users (DAU/MAU) | >35% | Stickiness of the "one workspace" thesis |
| Credits consumed / user / month | >3,000 | Usage depth = retention |

---

## Current State — Phase 1 ✅ (Shipped)

**Status:** Complete and browser-verified.

- Dashboard with usage analytics & credit metering
- AI Chat: streaming, multi-model, folders, export, agent personas
- AI Documents: 6 templates, version history, markdown export
- AI Images: generation, gallery, presets, download
- AI Agents: 8 specialists with chat handoff
- Billing: plans, credit packs, transactions
- Architecture: feature-based, provider abstraction, Prisma, audit logs, credit engine

**What's missing for profitability:** real auth, real payments, the 3 remaining workspaces (SEO/Marketing/YouTube), website builder, file/vision AI, teams.

---

## Phase 2 — Monetization & Retention Foundation
**Goal:** Turn the product into something people can actually pay for and come back to.
**Profit impact:** Enables revenue. Without this, nothing else is monetizable.
**Status:** Not started · Estimated effort: 2 weeks

### Deliverables
1. **Real authentication**
   - Email/password + Google OAuth via Better Auth (or NextAuth v4 already in deps)
   - Session management, password reset, email verification
   - Migrate the lazy demo user to real per-user records (schema already supports it)
2. **Payments — LemonSqueezy (primary) + Stripe fallback**
   - Subscription checkout (Free → Starter → Pro → Agency)
   - One-time credit-pack purchases
   - Webhook handler for `subscription.created`, `subscription.cancelled`, `payment.succeeded`
   - Entitlement checks on every credit-charging API
3. **Usage-based billing engine**
   - Per-model credit costs (reasoning models cost more)
   - Overage protection — soft cap + upsell prompt at 80%/95%/100%
   - Monthly credit reset cron + credit expiry for top-up packs
4. **Onboarding & lifecycle emails**
   - Welcome, first-value, low-credit warning, win-back (drip over 14 days)
   - Transactional: receipt, invoice, cancellation
5. **Pro-feature gating**
   - Free tier: 3 projects, 200 daily credits, watermarked image export
   - Paywall modal with plan comparison + one-click upgrade
6. **Projects & folders**
   - Folder tree in Chat + Documents sidebars (schema already has `Folder`)
   - Per-project context (brand voice, audience, assets)

### Exit Criteria
- A new visitor can sign up, subscribe to Pro, generate content, and receive an email receipt.
- Credits reset monthly; webhook updates entitlement within 60s.
- Conversion tracking event fires on every paywall view.

### Profit Levers
- Subscriptions go live → first MRR.
- Soft caps + upsell prompts typically lift free→paid conversion 1.5–2x.

---

## Phase 3 — The "10-in-1" Value Expansion
**Goal:** Deliver the core thesis — replace 10 tools with one.
**Profit impact:** Reduces churn by making NexusAI indispensable; justifies Pro pricing.
**Status:** Not started · Estimated effort: 3 weeks

### Deliverables
1. **SEO Workspace**
   - AI site audit (paste URL → crawler report)
   - Keyword research with intent + difficulty
   - Topic cluster builder
   - Schema generator (JSON-LD)
   - On-page content optimizer (score vs target keyword)
   - Competitor gap analysis
2. **Marketing Workspace**
   - Facebook & Google Ad copy generator (per campaign objective)
   - Email sequence builder (welcome / nurture / win-back)
   - Landing page & funnel copy
   - Product description batch generator
   - Brand voice profile (reusable across all modules)
3. **YouTube Workspace**
   - High-CTR title generator (batch of 10, scored)
   - Script writer with retention hooks every 30s
   - Description + tags + timestamp generator
   - Thumbnail concept prompts (→ AI Images)
   - Long-form → Shorts repurposer
4. **Brand Voice engine (cross-module)**
   - Saved voice profiles (tone, vocabulary, forbidden words, sample copy)
   - Auto-applied to every document/chat/email generation
5. **Shared template library**
   - User-created templates (shareable, forkable)
   - "Favorites" + recent

### Exit Criteria
- A user can run a full SEO audit, generate a 5-email nurture sequence, and script a YouTube video without leaving NexusAI.
- Brand voice is applied automatically when a profile is selected.

### Profit Levers
- Each workspace is a **retention moat** — the more a user relies on, the higher switching cost.
- SEO + Marketing workspaces are the #1 reason agencies upgrade to Agency tier.

---

## Phase 4 — AI Website Builder
**Goal:** The single highest-perceived-value feature. Justifies Agency pricing.
**Profit impact:** Differentiator that competitors charge $20–50/mo for alone.
**Status:** Not started · Estimated effort: 4 weeks

### Deliverables
1. **Site generation**
   - Describe business → generate complete multi-section landing page
   - Page types: landing, business site, agency, portfolio, blog
   - Responsive + accessibility-compliant (WCAG AA) output
2. **Visual block editor**
   - Inline editing (click-to-edit text, swap images)
   - Section add/remove/reorder
   - Theme controls (colors, fonts, spacing)
3. **SEO-optimized output**
   - Semantic HTML, meta tags, Open Graph, JSON-LD
   - Lighthouse 90+ target
4. **Export**
   - HTML/CSS zip
   - WordPress theme export
   - Publish to subdomain (`yoursite.nexusai.app`)
5. **Asset integration**
   - Pull images from AI Images gallery
   - Pull copy from AI Documents

### Exit Criteria
- User generates, edits, and exports a publishable landing page in under 10 minutes.
- Lighthouse score ≥ 90 on a generated page.

### Profit Levers
- Website builders alone command $20–50/mo. Bundled, they make Pro ($49) feel like a steal.
- WordPress export unlocks the huge WP developer audience.

---

## Phase 5 — Advanced AI & Files
**Goal:** Match ChatGPT/Claude feature parity so users never need to leave.
**Profit impact:** Removes the "I still need ChatGPT for X" objection.
**Status:** Not started · Estimated effort: 3 weeks

### Deliverables
1. **Vision & multimodal**
   - Upload images into chat for analysis (GLM-4.5V)
   - "Describe this → regenerate" loop for images
2. **File upload + RAG**
   - PDF/DOCX/TXT upload, chunked + embedded
   - "Chat with your document" with citations
   - Knowledge base per project
3. **Image editing**
   - Inpaint / outpaint (edit by prompt + mask)
   - Upscaling (2x, 4x)
   - Background removal
   - Variations
4. **Conversation power features**
   - Branch / fork a conversation from any message
   - Artifacts panel (code, tables, diagrams rendered side-by-side)
   - Pinned messages, search across all chats
5. **Memory**
   - Long-term user memory ("remember that my agency is called…")
   - Per-project context window

### Exit Criteria
- User uploads a 40-page PDF and chats with it cited.
- User edits a generated image by masking + prompt.

### Profit Levers
- File/RAG + image editing are the top reasons users keep a second AI subscription. Removing them = consolidation = retention.

---

## Phase 6 — Teams & White-Label
**Goal:** Unlock agency revenue (the highest-LTV segment).
**Profit impact:** Agency tier ($149) with seats is the path to $50k MRR.
**Status:** Not started · Estimated effort: 4 weeks

### Deliverables
1. **Organizations & seats**
   - Multi-user workspaces, role-based access (Owner/Admin/Member/Viewer)
   - Seat management + billing per seat
2. **Shared resources**
   - Team projects, shared chat history, shared brand voices
   - Credit pooling or per-seat allocation
3. **Client portal**
   - Invite clients to view (not edit) specific deliverables
   - Branded login page per org
4. **White-label**
   - Custom domain (`app.theiragency.com`)
   - Custom logo, colors, email from-domain
   - Remove NexusAI branding
5. **Admin & audit**
   - Audit log dashboard (filterable, exportable)
   - Usage analytics per member
   - API key management with scopes

### Exit Criteria
- An agency owner invites 4 teammates, shares a project, and a client views a deliverable via branded portal.

### Profit Levers
- Agency tier at $149 with 5 seats → ~3x revenue per account vs Pro.
- White-label typically adds 30–50% price premium.

---

## Phase 7 — Growth Engine
**Goal:** Compound acquisition without ad spend.
**Profit impact:** Lowers CAC, opens API-revenue channel.
**Status:** Not started · Estimated effort: 3 weeks

### Deliverables
1. **Referral & affiliate**
   - "Give 1,000 credits, get 1,000" referral
   - Affiliate dashboard with 30% recurring commission
   - Payouts via LemonSqueezy
2. **Public API**
   - REST API (chat, documents, images) with scoped API keys
   - Rate limiting per plan
   - Developer docs + Postman collection
3. **Marketplace**
   - Publish/fork templates & agent personas
   - Revenue share for creators
4. **Automation / workflow builder**
   - Trigger → AI step → action (e.g., "new form submission → generate reply → send email")
   - Integrations: Zapier, Make, n8n webhooks

### Exit Criteria
- An affiliate refers 10 paying users and sees recurring commission in their dashboard.
- A developer calls the public API with their key and gets a streamed chat response.

### Profit Levers
- Affiliate channel can drive 20–30% of new MRR at near-zero CAC.
- API access is a Pro+ feature and an upsell to power users.

---

## Prioritization Rationale

| Phase | Revenue impact | Retention impact | Effort | Priority |
|-------|---------------|------------------|-------|----------|
| 2 — Monetization | **Critical** | High | Medium | **1st** |
| 3 — 10-in-1 Expansion | High | **Critical** | High | **2nd** |
| 5 — Advanced AI & Files | Medium | High | Medium | **3rd** |
| 4 — Website Builder | High | Medium | High | **4th** |
| 6 — Teams & White-Label | **Critical (agency)** | High | High | **5th** |
| 7 — Growth Engine | High (long-term) | Medium | Medium | **6th** |

> Phase 2 ships first because **nothing is profitable until people can pay**.
> Phase 3 ships second because retention is cheaper than acquisition — and the
> "10-in-1" thesis is our entire positioning.
> Phase 5 before 4 because file/vision AI removes the biggest objection
> ("I still need ChatGPT for PDFs"); the website builder is a bigger build and
> can land once retention is locked in.

---

## Suggested Next Prompts (copy-paste into chat)

> **Prompt A — Phase 2 kickoff**
> *"Implement Phase 2 of the NexusAI roadmap (ROADMAP.md). Start with real
> authentication using Better Auth — email/password + Google OAuth, session
> management, and migrate the lazy demo user to real per-user records. Follow the
> feature-based architecture and provider abstraction already in place. Read
> /home/z/my-project/worklog.md first, then ship and verify with agent-browser."*

> **Prompt B — Payments**
> *"Implement LemonSqueezy subscription checkout + credit-pack purchases for
> NexusAI (Phase 2, item 2 of ROADMAP.md). Include webhook handlers,
> entitlement checks on credit-charging APIs, and a paywall modal with one-click
> upgrade. Verify the full upgrade flow with agent-browser."*

> **Prompt C — SEO Workspace**
> *"Build the SEO Workspace for NexusAI (Phase 3, item 1 of ROADMAP.md): AI site
> audit, keyword research with intent/difficulty, topic cluster builder, and
> JSON-LD schema generator. Reuse the existing AI provider abstraction. Replace
> the 'coming soon' placeholder with the full module. Verify with agent-browser."*

> **Prompt D — Brand Voice engine**
> *"Build a cross-module Brand Voice engine for NexusAI (Phase 3, item 4 of
> ROADMAP.md): saved voice profiles (tone, vocabulary, forbidden words, sample
> copy) that auto-apply to every document/chat/email generation. Store in
> Prisma, integrate into the documents/generate and chat APIs."*

> **Prompt E — File upload + RAG**
> *"Implement file upload + RAG for NexusAI (Phase 5, item 2 of ROADMAP.md):
> PDF/DOCX/TXT upload, chunking, embedding, and 'chat with your document' with
> citations. Add a Knowledge Base per project. Verify end-to-end with
> agent-browser."*

---

## Engineering Principles (non-negotiable, every phase)

- Feature-based architecture · clean separation · provider abstraction
- Never hardcode provider calls outside `src/lib/ai.ts`
- Every credit-charging API checks entitlement + logs audit
- Every phase ships browser-verified, lint-clean, no dead code
- Update `/home/z/my-project/worklog.md` after each phase
- Security: input validation, rate limiting, RBAC, audit logs — every phase
- Profitability lens: if a feature doesn't save time / raise revenue / automate /
  simplify, it doesn't ship

---

*Last updated: Phase 1 complete. Phase 2 is the next priority.*
