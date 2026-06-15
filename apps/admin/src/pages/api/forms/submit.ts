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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export const OPTIONS: APIRoute = async () =>
  new Response(null, { status: 204, headers: CORS });

export const POST: APIRoute = async ({ request, locals }) => {
  const db = locals.db;
  if (!db) return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: CORS });

  // Read IP from headers — clientAddress throws on Cloudflare Pages without explicit header config
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

  const body = await request.json() as { formId: string; fields: Record<string, any>; pageUrl?: string };
  const { formId, fields } = body;

  if (!formId) return new Response(JSON.stringify({ error: "Missing formId" }), { status: 400, headers: CORS });

  // Load form to validate
  const forms = await getForms(db);
  const form = forms.find((f: any) => f.id === formId);
  if (!form) return new Response(JSON.stringify({ error: "Form not found" }), { status: 404, headers: CORS });

  // Honeypot check
  if (form.settings?.honeypot && fields["__hp"]) {
    return new Response(JSON.stringify({ ok: true, confirmation: form.confirmations?.[0] }), { headers: CORS });
  }

  // Check entry limit
  if (form.settings?.limitEntries) {
    const entries = await getEntries(db, formId);
    const active = entries.filter((e: any) => e.status !== "trash");
    if (active.length >= Number(form.settings.limitEntriesCount ?? 0)) {
      return new Response(JSON.stringify({ error: form.settings.limitEntriesMessage ?? "Form is closed." }), { status: 403, headers: CORS });
    }
  }

  // Check schedule
  if (form.settings?.scheduleForm) {
    const now = new Date();
    if (form.settings.scheduleStart && new Date(form.settings.scheduleStart) > now) {
      return new Response(JSON.stringify({ error: form.settings.scheduleClosedMessage ?? "Form is not yet open." }), { status: 403, headers: CORS });
    }
    if (form.settings.scheduleEnd && new Date(form.settings.scheduleEnd) < now) {
      return new Response(JSON.stringify({ error: form.settings.scheduleClosedMessage ?? "Form is closed." }), { status: 403, headers: CORS });
    }
  }

  // Validate required fields
  const formFields: any[] = form.fields ?? [];
  for (const field of formFields) {
    if (!field.required) continue;
    if (["page_break", "section_divider", "html", "captcha"].includes(field.type)) continue;
    const val = fields[field.id];
    if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
      return new Response(JSON.stringify({ error: `"${field.label}" is required.` }), { status: 422, headers: CORS });
    }
  }

  // Store entry
  const entry = {
    id: uid(),
    formId,
    fields,
    date: new Date().toISOString(),
    ip,
    userAgent: request.headers.get("user-agent") ?? "",
    status: "unread",
    pageUrl: body.pageUrl ?? "",
  };

  const entries = await getEntries(db, formId);
  entries.push(entry);
  await saveEntries(db, formId, entries);

  // Determine confirmation to return
  const confirmations: any[] = form.confirmations ?? [];
  const activeConf = confirmations.find((c: any) => c.active) ?? confirmations[0];

  return new Response(JSON.stringify({ ok: true, entryId: entry.id, confirmation: activeConf ?? null }), { headers: CORS });
};
