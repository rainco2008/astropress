import type { APIRoute } from "astro";
import { wpOptions } from "@astropress/core/schema";
import { eq } from "drizzle-orm";

function uid() { return Math.random().toString(36).slice(2, 12); }
const key = (id: string) => `astropress_form_entries_${id}`;

async function getForms(db: any): Promise<any[]> {
  const [row] = await db.select({ value: wpOptions.optionValue }).from(wpOptions)
    .where(eq(wpOptions.optionName, "astropress_forms")).limit(1);
  return row?.value ? JSON.parse(row.value) : [];
}

async function getEntries(db: any, formId: string): Promise<any[]> {
  const [row] = await db.select({ value: wpOptions.optionValue }).from(wpOptions)
    .where(eq(wpOptions.optionName, key(formId))).limit(1);
  return row?.value ? JSON.parse(row.value) : [];
}

async function saveEntries(db: any, formId: string, entries: any[]) {
  await db.insert(wpOptions)
    .values({ optionName: key(formId), optionValue: JSON.stringify(entries) })
    .onConflictDoUpdate({ target: wpOptions.optionName, set: { optionValue: JSON.stringify(entries) } });
}

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const db = locals.db;
  if (!db) return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { "Content-Type": "application/json" } });

  const body = await request.json() as { formId: string; fields: Record<string, any>; pageUrl?: string };
  const { formId, fields } = body;

  if (!formId) return new Response(JSON.stringify({ error: "Missing formId" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const forms = await getForms(db);
  const form = forms.find(f => f.id === formId);
  if (!form) return new Response(JSON.stringify({ error: "Form not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

  // Honeypot
  if (form.settings?.honeypot && fields["__hp"]) {
    return new Response(JSON.stringify({ ok: true, confirmation: form.confirmations?.[0] }), { headers: { "Content-Type": "application/json" } });
  }

  // Entry limit
  if (form.settings?.limitEntries) {
    const entries = await getEntries(db, formId);
    const active = entries.filter((e: any) => e.status !== "trash");
    if (active.length >= Number(form.settings.limitEntriesCount ?? 0)) {
      return new Response(JSON.stringify({ error: form.settings.limitEntriesMessage ?? "Form is closed." }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
  }

  // Schedule
  if (form.settings?.scheduleForm) {
    const now = new Date();
    if (form.settings.scheduleStart && new Date(form.settings.scheduleStart) > now) {
      return new Response(JSON.stringify({ error: form.settings.scheduleClosedMessage ?? "Form is not yet open." }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    if (form.settings.scheduleEnd && new Date(form.settings.scheduleEnd) < now) {
      return new Response(JSON.stringify({ error: form.settings.scheduleClosedMessage ?? "Form is closed." }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
  }

  // Required field validation
  const formFields: any[] = form.fields ?? [];
  for (const field of formFields) {
    if (!field.required) continue;
    if (["page_break", "section_divider", "html", "content", "captcha"].includes(field.type)) continue;
    const val = fields[field.id];
    if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
      return new Response(JSON.stringify({ error: `"${field.label}" is required.` }), { status: 422, headers: { "Content-Type": "application/json" } });
    }
  }

  const entry = {
    id: uid(),
    formId,
    fields,
    date: new Date().toISOString(),
    ip: clientAddress ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "",
    status: "unread",
    pageUrl: body.pageUrl ?? "",
  };

  const entries = await getEntries(db, formId);
  entries.push(entry);
  await saveEntries(db, formId, entries);

  const confirmations: any[] = form.confirmations ?? [];
  const activeConf = confirmations.find((c: any) => c.active) ?? confirmations[0];

  return new Response(JSON.stringify({ ok: true, entryId: entry.id, confirmation: activeConf ?? null }), { headers: { "Content-Type": "application/json" } });
};
