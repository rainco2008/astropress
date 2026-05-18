import type { APIRoute } from "astro";
import { DEFAULT_LOOP_TEMPLATES } from "../../../../../lib/loopTemplates";

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return new Response("Unauthorized", { status: 401 });
  const { id } = params;
  const tmpl = DEFAULT_LOOP_TEMPLATES.find(t => t.id === id);
  if (!tmpl) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify({ blocks: tmpl.blocks }), { headers: { "Content-Type": "application/json" } });
};
