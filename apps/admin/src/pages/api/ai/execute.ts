import type { APIRoute } from "astro";
// Import to register all built-in actions
import "../../../lib/ai-actions";
import { getAIAction } from "../../../lib/ai-registry";

interface ActionRequest {
  type: string;
  [key: string]: any;
}

export const POST: APIRoute = async ({ locals, request }) => {
  const db = locals.db;
  if (!db || !locals.user)
    return new Response("Unauthorized", { status: 401 });

  let actions: ActionRequest[];

  try {
    const body = await request.json();
    // Accept either { action: {...} } or { actions: [...] }
    actions = Array.isArray(body.actions) ? body.actions : [body.action];
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = [];

  for (const action of actions) {
    if (!action?.type) {
      results.push({ success: false, message: "Missing action type" });
      continue;
    }

    const def = getAIAction(action.type);

    if (!def) {
      results.push({ success: false, message: `Unknown action: ${action.type}` });
      continue;
    }

    if (!def.serverSide || !def.handler) {
      results.push({ success: false, message: `Action "${action.type}" is client-side only` });
      continue;
    }

    try {
      const result = await def.handler(action, db, locals.user.id);
      results.push(result);
    } catch (err: any) {
      results.push({
        success: false,
        message: err?.message ?? `Action "${action.type}" failed`,
      });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
};
