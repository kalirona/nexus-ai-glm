/**
 * NexusAI domain constants & catalog.
 * Single source of truth for models, templates, agents and image presets.
 */

export const AI_MODELS = [
  {
    id: "auto",
    name: "Nexus Auto",
    description: "Auto-selects the best model for the task",
    badge: "Smart",
    context: "∞",
    speed: "fast",
  },
  {
    id: "glm-4.6",
    name: "GLM-4.6",
    description: "Balanced flagship for everyday business reasoning",
    badge: "Default",
    context: "128K",
    speed: "balanced",
  },
  {
    id: "glm-4.5",
    name: "GLM-4.5",
    description: "Fast, cost-efficient general purpose model",
    badge: "Fast",
    context: "128K",
    speed: "fast",
  },
  {
    id: "glm-4.5v",
    name: "GLM-4.5 Vision",
    description: "Multimodal — understands images & documents",
    badge: "Vision",
    context: "64K",
    speed: "balanced",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    description: "Deep reasoning for complex analysis & code",
    badge: "Reasoning",
    context: "64K",
    speed: "thorough",
  },
] as const;

export type AIModel = (typeof AI_MODELS)[number];

export const IMAGE_SIZES = [
  { id: "1024x1024", label: "Square", ratio: "1:1", use: "Logos · Avatars · Social" },
  { id: "1344x768", label: "Landscape", ratio: "16:9", use: "Blogs · Headers · Ads" },
  { id: "1440x720", label: "Wide", ratio: "2:1", use: "Hero · Banners · Covers" },
  { id: "768x1344", label: "Portrait", ratio: "9:16", use: "Stories · Reels · Posters" },
  { id: "1152x864", label: "Classic", ratio: "4:3", use: "Presentations · Docs" },
  { id: "864x1152", label: "Tall", ratio: "3:4", use: "Flyers · Cards" },
] as const;

export const IMAGE_PRESETS = [
  { id: "graphic", label: "Business Graphic", icon: "Image", hint: "Clean vector-style illustration for business decks" },
  { id: "logo", label: "Logo / Mark", icon: "Hexagon", hint: "Minimal, scalable brand mark" },
  { id: "ad", label: "Ad Creative", icon: "Megaphone", hint: "High-conversion social ad" },
  { id: "social", label: "Social Post", icon: "Share2", hint: "Engaging social media visual" },
  { id: "thumbnail", label: "YT Thumbnail", icon: "Youtube", hint: "Click-worthy YouTube thumbnail" },
  { id: "hero", label: "Hero Image", icon: "Panorama", hint: "Website hero / banner" },
] as const;

export interface TemplateDef {
  key: string;
  name: string;
  category: string;
  icon: string;
  kind: string;
  description: string;
  systemPrompt: string;
  userPromptTpl: string;
  fields: { key: string; label: string; placeholder: string; type?: "text" | "textarea"; default?: string }[];
}

export const TEMPLATES: TemplateDef[] = [
  {
    key: "business-plan",
    name: "Business Plan",
    category: "Strategy",
    icon: "Target",
    kind: "business-plan",
    description: "Investor-ready one-pager with market, model & projections.",
    systemPrompt:
      "You are a senior business strategist and ex-McKinsey consultant. Produce a crisp, investor-ready business plan in clean Markdown. Use clear H2 sections, bullet points, and concrete numbers. Be pragmatic, avoid fluff.",
    userPromptTpl:
      "Write a business plan for: {idea}. Target audience / market: {market}. Founding stage: {stage}. Include: Problem, Solution, Market Size, Business Model, GTM Strategy, Competitive Edge, 12-month Financial Projection, Risks.",
    fields: [
      { key: "idea", label: "Business idea", placeholder: "AI-powered accounting for freelancers", type: "textarea", default: "AI-powered accounting platform for freelancers and small agencies" },
      { key: "market", label: "Target market", placeholder: "Freelancers in North America & EU", default: "Freelancers and micro-agencies globally" },
      { key: "stage", label: "Founding stage", placeholder: "Pre-seed / MVP", default: "Pre-seed, MVP shipping" },
    ],
  },
  {
    key: "sales-copy",
    name: "Sales Copy",
    category: "Marketing",
    icon: "Megaphone",
    kind: "sales-copy",
    description: "High-conversion long-form sales page copy.",
    systemPrompt:
      "You are a direct-response copywriter trained on the classics. Write persuasive, benefit-driven long-form sales copy in Markdown. Use proven frameworks (PAS, AIDA). Include a headline, sub-headline, story, bullet benefits, FAQ, guarantee and a clear CTA.",
    userPromptTpl:
      "Write sales copy for: {product}. Audience: {audience}. Key benefit: {benefit}. Price: {price}. Brand voice: {voice}.",
    fields: [
      { key: "product", label: "Product / service", placeholder: "NexusAI all-in-one workspace", default: "NexusAI — the AI Business Operating System" },
      { key: "audience", label: "Audience", placeholder: "Solo founders & agencies", default: "Agencies, freelancers and small business owners" },
      { key: "benefit", label: "Key benefit", placeholder: "Replace 10 SaaS tools with one", default: "Replace 10 SaaS subscriptions with one workspace" },
      { key: "price", label: "Price", placeholder: "$29/mo", default: "$29/mo Pro" },
      { key: "voice", label: "Brand voice", placeholder: "Bold, friendly, confident", default: "Bold, confident, slightly playful" },
    ],
  },
  {
    key: "cold-email",
    name: "Cold Email",
    category: "Outreach",
    icon: "Mail",
    kind: "email",
    description: "Personalised cold email with a hook & soft CTA.",
    systemPrompt:
      "You are a B2B sales SDR. Write concise, personalised cold emails. Max 120 words. One clear CTA. Friendly, specific, no spammy language. Output only the email body in Markdown.",
    userPromptTpl:
      "Write a cold email to {prospect} at {company}. Sender: {sender} from {sendercompany}. Value proposition: {value}. Goal: {goal}.",
    fields: [
      { key: "prospect", label: "Prospect name / role", placeholder: "Sarah, Head of Growth", default: "Sarah, Head of Growth" },
      { key: "company", label: "Prospect company", placeholder: "Acme Inc.", default: "Acme Inc." },
      { key: "sender", label: "Your name", placeholder: "Alex", default: "Alex" },
      { key: "sendercompany", label: "Your company", placeholder: "NexusAI", default: "NexusAI" },
      { key: "value", label: "Value proposition", placeholder: "Cut tool spend by 60%", default: "Consolidate 10 AI tools into one workspace, cut SaaS spend ~60%" },
      { key: "goal", label: "Goal of the email", placeholder: "Book a 15-min demo", default: "Book a 15-minute demo" },
    ],
  },
  {
    key: "blog-post",
    name: "Blog Post",
    category: "Content",
    icon: "FileText",
    kind: "blog",
    description: "SEO-structured long-form article with H2/H3.",
    systemPrompt:
      "You are an expert content marketer and SEO writer. Write a comprehensive, well-structured blog post in Markdown. Include an engaging intro, H2/H3 sections, bullet lists, a FAQ, and a conclusion. Naturally weave the target keyword.",
    userPromptTpl:
      "Write a {wordcount}-word blog post about: {topic}. Target keyword: {keyword}. Audience: {audience}. Tone: {tone}.",
    fields: [
      { key: "topic", label: "Topic", placeholder: "How AI is changing small business ops", type: "textarea", default: "How AI is changing small business operations in 2025" },
      { key: "keyword", label: "Target keyword", placeholder: "ai for small business", default: "ai for small business" },
      { key: "audience", label: "Audience", placeholder: "Small business owners", default: "Small business owners and operators" },
      { key: "tone", label: "Tone", placeholder: "Practical, authoritative", default: "Practical, authoritative, encouraging" },
      { key: "wordcount", label: "Word count", placeholder: "1200", default: "1200" },
    ],
  },
  {
    key: "contract",
    name: "Service Contract",
    category: "Legal",
    icon: "Scale",
    kind: "contract",
    description: "Plain-English freelance service agreement.",
    systemPrompt:
      "You are a legal drafter specialising in plain-English contracts for freelancers and small agencies. Produce a balanced service agreement in Markdown with numbered clauses. Include placeholders in [BRACKETS] for jurisdiction-specific signatures. Add a disclaimer that this is a template, not legal advice.",
    userPromptTpl:
      "Draft a freelance service agreement. Client: {client}. Provider: {provider}. Scope of work: {scope}. Total fee: {fee}. Delivery timeline: {timeline}.",
    fields: [
      { key: "client", label: "Client name", placeholder: "Acme Inc.", default: "Acme Inc." },
      { key: "provider", label: "Provider (you)", placeholder: "Jane Doe Studio", default: "Jane Doe Studio" },
      { key: "scope", label: "Scope of work", placeholder: "Brand identity + landing page", type: "textarea", default: "Brand identity design and a single-page landing website" },
      { key: "fee", label: "Total fee", placeholder: "$4,500", default: "$4,500 USD" },
      { key: "timeline", label: "Timeline", placeholder: "4 weeks", default: "4 weeks from kickoff" },
    ],
  },
  {
    key: "weekly-report",
    name: "Weekly Report",
    category: "Ops",
    icon: "BarChart3",
    kind: "report",
    description: "Executive weekly status report.",
    systemPrompt:
      "You are a chief of staff. Write a concise weekly executive report in Markdown. Sections: Highlights, Key Metrics, Blockers, Next Week's Priorities. Be specific and quantitative where possible.",
    userPromptTpl:
      "Write a weekly report. Team: {team}. Wins this week: {wins}. Key metrics: {metrics}. Blockers: {blockers}.",
    fields: [
      { key: "team", label: "Team / function", placeholder: "Growth", default: "Growth team" },
      { key: "wins", label: "Wins this week", placeholder: "Shipped v2 onboarding, +12% signups", type: "textarea", default: "Shipped v2 onboarding flow, signups +12% WoW" },
      { key: "metrics", label: "Key metrics", placeholder: "MRR $42k, churn 1.8%", type: "textarea", default: "MRR $42k, churn 1.8%, NPS 58" },
      { key: "blockers", label: "Blockers", placeholder: "Payment provider review pending", type: "textarea", default: "Payment provider review pending, blocking EU launch" },
    ],
  },
];

export interface AgentDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  color: string;
  systemPrompt: string;
  capabilities: string[];
}

export const AGENTS: AgentDef[] = [
  {
    key: "business-consultant",
    name: "Business Consultant",
    description: "Strategy, pricing, positioning & growth advice.",
    icon: "Briefcase",
    category: "Strategy",
    color: "emerald",
    systemPrompt:
      "You are NexusAI's Business Consultant — a seasoned ex-McKinsey advisor for small businesses and startups. Ask clarifying questions when context is missing. Give specific, prioritised, ROI-aware advice. Use frameworks (ICE, RICE, Porter). Always end with 3 concrete next actions.",
    capabilities: ["Strategy", "Pricing", "Positioning", "Growth", "Market sizing"],
  },
  {
    key: "marketing-agent",
    name: "Marketing Agent",
    description: "Campaign plans, ad copy, funnels & brand voice.",
    icon: "Megaphone",
    category: "Marketing",
    color: "rose",
    systemPrompt:
      "You are NexusAI's Marketing Agent — a senior growth marketer. Produce channel-specific, conversion-focused plans and copy. Reference real benchmarks. Provide a measurable success metric for every recommendation.",
    capabilities: ["Campaigns", "Ad copy", "Funnels", "Email", "Brand voice"],
  },
  {
    key: "seo-agent",
    name: "SEO Agent",
    description: "Keyword research, topic clusters & on-page SEO.",
    icon: "Search",
    category: "Growth",
    color: "amber",
    systemPrompt:
      "You are NexusAI's SEO Agent. Provide keyword clusters with intent, estimated difficulty, and a content brief. Cite realistic ranges. Output structured Markdown tables.",
    capabilities: ["Keyword research", "Topic clusters", "On-page SEO", "Schema", "Audits"],
  },
  {
    key: "research-agent",
    name: "Research Agent",
    description: "Deep research, summaries & competitor analysis.",
    icon: "Microscope",
    category: "Research",
    color: "cyan",
    systemPrompt:
      "You are NexusAI's Research Agent. Synthesise information with sources, highlight uncertainty, and produce structured executive briefs. Distinguish facts from assumptions.",
    capabilities: ["Market research", "Competitor analysis", "Summaries", "Briefs"],
  },
  {
    key: "coding-agent",
    name: "Coding Agent",
    description: "Architecture, code review, debugging & scaffolding.",
    icon: "Code2",
    category: "Engineering",
    color: "violet",
    systemPrompt:
      "You are NexusAI's Coding Agent — a staff engineer. Write clean, typed, production-grade code. Explain trade-offs. Prefer simplicity and existing ecosystem libraries. Include brief comments only where intent isn't obvious.",
    capabilities: ["Code review", "Debugging", "Architecture", "Scaffolding"],
  },
  {
    key: "support-agent",
    name: "Customer Support",
    description: "Empathetic replies, macros & escalation paths.",
    icon: "Headset",
    category: "Support",
    color: "sky",
    systemPrompt:
      "You are NexusAI's Customer Support Agent. Be empathetic, concise and solution-first. Never invent policy. Escalate legal/billing edge cases. Always confirm the customer's core issue before answering.",
    capabilities: ["Ticket replies", "Macros", "Escalation", "Tone"],
  },
  {
    key: "wordpress-agent",
    name: "WordPress Agent",
    description: "Site structure, plugins, SEO & custom code snippets.",
    icon: "Globe",
    category: "Web",
    color: "teal",
    systemPrompt:
      "You are NexusAI's WordPress Agent. Recommend lightweight, maintainable approaches. Prefer core/block editor and reputable plugins over custom code. Provide exact hooks/filters and version-safe snippets.",
    capabilities: ["Site structure", "Plugins", "Custom code", "Performance"],
  },
  {
    key: "youtube-agent",
    name: "YouTube Agent",
    description: "Titles, scripts, hooks & retention tactics.",
    icon: "Youtube",
    category: "Content",
    color: "red",
    systemPrompt:
      "You are NexusAI's YouTube Agent. Produce scroll-stopping titles, tight scripts with retention hooks every 30s, and SEO-optimised descriptions. Give a predicted click-through rationale.",
    capabilities: ["Titles", "Scripts", "Hooks", "SEO", "Thumbnails ideas"],
  },
];

export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 200,
    cadence: "daily",
    tagline: "For trying the platform",
    features: ["200 daily credits", "All AI modules", "3 projects", "Community support"],
    cta: "Current plan",
  },
  {
    id: "starter",
    name: "Starter",
    price: 19,
    credits: 5000,
    cadence: "monthly",
    tagline: "For solo creators",
    features: ["5,000 credits / mo", "All modules", "Unlimited projects", "Priority models", "Email support"],
    cta: "Upgrade",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    credits: 20000,
    cadence: "monthly",
    tagline: "For power users & freelancers",
    features: ["20,000 credits / mo", "Everything in Starter", "AI Agents", "Brand voice", "Export PDF/DOCX", "API access"],
    cta: "Upgrade",
    popular: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: 149,
    credits: 100000,
    cadence: "monthly",
    tagline: "For teams & agencies",
    features: ["100,000 credits / mo", "Everything in Pro", "5 team seats", "White-label", "Workspaces", "Dedicated support"],
    cta: "Talk to sales",
  },
] as const;

export const CREDIT_COSTS = {
  chat: 1,
  image: 8,
  document: 5,
} as const;

export const FOLDER_COLORS = [
  { id: "emerald", label: "Emerald", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  { id: "amber", label: "Amber", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { id: "rose", label: "Rose", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { id: "teal", label: "Teal", dot: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
  { id: "violet", label: "Violet", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
  { id: "sky", label: "Sky", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
  { id: "slate", label: "Slate", dot: "bg-slate-500", text: "text-slate-600 dark:text-slate-400" },
] as const;

/** Per-model credit cost overrides (chat). Default falls back to CREDIT_COSTS.chat. */
export const MODEL_CREDIT_COST: Record<string, number> = {
  auto: 1,
  "glm-4.6": 1,
  "glm-4.5": 1,
  "glm-4.5v": 2,
  "deepseek-v3": 3,
};

/** Plan feature flags for client-side gating. */
export const PLAN_FEATURES = {
  free: {
    maxChats: 50,
    maxProjects: 1,
    brandVoices: 0,
    proModels: false,
    exports: false,
    apiAccess: false,
    watermarked: true,
  },
  starter: {
    maxChats: 500,
    maxProjects: 5,
    brandVoices: 1,
    proModels: false,
    exports: false,
    apiAccess: false,
    watermarked: false,
  },
  pro: {
    maxChats: Infinity,
    maxProjects: Infinity,
    brandVoices: 10,
    proModels: true,
    exports: true,
    apiAccess: true,
    watermarked: false,
  },
  agency: {
    maxChats: Infinity,
    maxProjects: Infinity,
    brandVoices: Infinity,
    proModels: true,
    exports: true,
    apiAccess: true,
    watermarked: false,
  },
} as const;

export type PlanId = keyof typeof PLAN_FEATURES;

