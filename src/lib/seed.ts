import { db } from "@/lib/db";
import { TEMPLATES, AGENTS } from "@/lib/constants";

/**
 * Seeds the catalog (templates + agents).
 * Idempotent — safe to call on every boot.
 *
 * NOTE: Demo users are NO LONGER seeded. The admin panel shows real
 * PostgreSQL data only. If you need to create an admin user, do so
 * via the database or the admin API.
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
}
