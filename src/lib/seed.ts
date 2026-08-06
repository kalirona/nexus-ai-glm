import { db } from "@/lib/db";
import { TEMPLATES, AGENTS } from "@/lib/constants";

/**
 * Seeds the catalog (templates + agents) and ensures the demo user exists.
 * Idempotent — safe to call on every boot.
 */
export async function seedCatalog() {
  for (const t of TEMPLATES) {
    await db.template.upsert({
      where: { key: t.key },
      update: {
        name: t.name,
        category: t.category,
        description: t.description,
        icon: t.icon,
        kind: t.kind,
        systemPrompt: t.systemPrompt,
        userPromptTpl: t.userPromptTpl,
        fields: JSON.stringify(t.fields),
      },
      create: {
        key: t.key,
        name: t.name,
        category: t.category,
        description: t.description,
        icon: t.icon,
        kind: t.kind,
        systemPrompt: t.systemPrompt,
        userPromptTpl: t.userPromptTpl,
        fields: JSON.stringify(t.fields),
      },
    });
  }

  for (const a of AGENTS) {
    await db.agent.upsert({
      where: { key: a.key },
      update: {
        name: a.name,
        description: a.description,
        systemPrompt: a.systemPrompt,
        icon: a.icon,
        category: a.category,
        capabilities: JSON.stringify(a.capabilities),
      },
      create: {
        key: a.key,
        name: a.name,
        description: a.description,
        systemPrompt: a.systemPrompt,
        icon: a.icon,
        category: a.category,
        capabilities: JSON.stringify(a.capabilities),
      },
    });
  }

  await seedDemoUsers();
}

const DEMO_USERS = [
  { email: "sarah@acme.co", name: "Sarah Chen", plan: "pro", credits: 14200, status: "active" },
  { email: "marcus@brightstudio.io", name: "Marcus Reid", plan: "agency", credits: 87600, status: "active" },
  { email: "lena@designhub.com", name: "Lena Park", plan: "starter", credits: 3200, status: "active" },
  { email: "james@freelance.dev", name: "James Okafor", plan: "free", credits: 180, status: "active" },
  { email: "priya@growthlab.in", name: "Priya Nair", plan: "pro", credits: 9800, status: "active" },
  { email: "tom@spammer.xyz", name: "Tom Wright", plan: "free", credits: 0, status: "banned" },
  { email: "yuki@tokyocreative.jp", name: "Yuki Tanaka", plan: "agency", credits: 95100, status: "active" },
  { email: "diego@agenciacreativa.mx", name: "Diego Morales", plan: "pro", credits: 5400, status: "suspended" },
];

/** Seeds demo users so the super-admin panel has data to show. Idempotent. */
async function seedDemoUsers() {
  for (const u of DEMO_USERS) {
    const existing = await db.user.findUnique({ where: { email: u.email } });
    if (existing) {
      // Keep existing users' admin/credits; only ensure status/plan are sane
      if (existing.status !== u.status || existing.plan !== u.plan) {
        await db.user.update({
          where: { id: existing.id },
          data: { status: u.status, plan: u.plan },
        });
      }
      continue;
    }
    await db.user.create({
      data: {
        email: u.email,
        name: u.name,
        plan: u.plan,
        credits: u.credits,
        status: u.status,
        creditsResetAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
      },
    });
  }
}
