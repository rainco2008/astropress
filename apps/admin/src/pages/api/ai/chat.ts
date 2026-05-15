import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { wpOptions } from "@astropress/core/schema";
// Register all built-in actions so the system prompt is complete
import "../../../lib/ai-actions";
import { getAllAIActions } from "../../../lib/ai-registry";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const POST: APIRoute = async ({ locals, request }) => {
  const db = locals.db;
  if (!db || !locals.user)
    return new Response("Unauthorized", { status: 401 });

  let messages: ChatMessage[];
  let context: Record<string, any>;

  try {
    ({ messages, context } = await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const row = await db
    .select()
    .from(wpOptions)
    .where(eq(wpOptions.optionName, "astropress_ai_settings"))
    .get();

  if (!row?.optionValue) {
    return new Response(
      JSON.stringify({ error: "No AI provider configured. Go to Settings → AI to add an API key." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const settings = JSON.parse(row.optionValue);
  const provider: string = settings.activeProvider ?? "anthropic";
  const cfg = settings.providers?.[provider];

  if (!cfg?.apiKey || cfg.enabled === false) {
    return new Response(
      JSON.stringify({ error: `Provider "${provider}" is not configured or is disabled. Visit Settings → AI.` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const siteContext: string = settings.systemContext?.trim() ?? "";
  const system = buildSystemPrompt(context, siteContext);

  try {
    let reply: string;

    if (provider === "anthropic") {
      reply = await callAnthropic(cfg.apiKey, cfg.defaultModel ?? "claude-sonnet-4-6", system, messages);
    } else if (provider === "openai") {
      reply = await callOpenAI(cfg.apiKey, cfg.defaultModel ?? "gpt-4o", system, messages);
    } else if (provider === "gemini") {
      reply = await callGemini(cfg.apiKey, cfg.defaultModel ?? "gemini-flash-latest", system, messages);
    } else if (provider === "mistral") {
      reply = await callMistral(cfg.apiKey, cfg.defaultModel ?? "mistral-large-latest", system, messages);
    } else if (provider === "groq") {
      reply = await callGroq(cfg.apiKey, cfg.defaultModel ?? "llama-3.3-70b-versatile", system, messages);
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown provider: ${provider}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "AI request failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(context: Record<string, any>, siteContext = ""): string {
  const contextStr = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");

  const actions = getAllAIActions();
  const serverActions = actions.filter((a) => a.serverSide);
  const clientActions = actions.filter((a) => !a.serverSide);

  const serverActionDocs = serverActions
    .map((a) => `- **${a.type}**: ${a.description}\n  Example: \`${a.example}\``)
    .join("\n");

  const clientActionDocs = clientActions
    .map((a) => `- **${a.type}**: ${a.description}\n  Example: \`${a.example}\``)
    .join("\n");

  return `You are AstroPress AI — a fully autonomous CMS assistant with complete control over this WordPress-compatible CMS. You act immediately; you never give instructions for the user to follow themselves.
${siteContext ? `\n## Site Instructions & Context\n${siteContext}\n` : ""}
## Current Page Context
${contextStr || "(none)"}

## Behaviour Rules
1. When the user asks you to do something, DO IT — emit the correct action block(s) immediately.
2. Never say "you can", "you should", "click", "go to", "navigate to", or give manual instructions.
3. Keep your reply to one short sentence confirming what you did (e.g. "Created Job Application post type with Job Type and Location taxonomies.").
4. For multi-step tasks emit ALL action blocks in one response — actions execute sequentially in the order you emit them.
5. Write complete, high-quality content — never placeholders.
6. Use **server-side actions** for create/update/delete operations — they work from any page.
7. Use **client-side actions** only when already on the relevant editor page.

## Action Ordering & Dependencies
- **Always order by dependency**: if action B depends on action A (e.g. a taxonomy references a post type), emit A first.
- **Post type → Taxonomy**: always create the post type before creating taxonomies that attach to it.
- **No intermediate navigation**: do NOT emit a navigate action between other actions. Navigation only happens after ALL actions complete (the last navigate in the chain is used).
- If creating multiple related things (post type + taxonomies), emit all in one response in dependency order.

## Server-Side Actions
These execute via the API and work from any page:
${serverActionDocs}

## Client-Side Actions
These manipulate the current editor page DOM directly:
${clientActionDocs}

## Action Block Format
Emit one JSON action per fenced block at the END of your response, in dependency order:

\`\`\`action
{"type":"createPost","postType":"page","title":"Pricing","content":"<h2>Plans</h2><p>...</p>","status":"draft"}
\`\`\`

\`\`\`action
{"type":"setTitle","value":"Updated Title"}
\`\`\`

## Content Format
- Post content: clean semantic HTML (<h2>, <p>, <ul>, <strong>, <blockquote>)
- Titles: plain text, no HTML
- Excerpts: plain text, 1–2 sentences
- Form field types: text, email, textarea, select, checkbox, number, tel, url
- Taxonomy keys: lowercase, underscores only, max 32 chars (e.g. job_type, location)
- Post type keys: lowercase, underscores only, max 20 chars (e.g. job_application)

## Examples

User: "create a pricing page with 3 tiers"
→ "Created a draft pricing page with Starter, Pro, and Enterprise plans."
→ \`\`\`action\n{"type":"createPost","postType":"page","title":"Pricing","content":"<h2>Pricing Plans</h2>...","status":"draft"}\n\`\`\`

User: "create a contact form"
→ "Created a contact form with Name, Email, and Message fields."
→ \`\`\`action\n{"type":"createForm","name":"Contact Us","fields":[{"label":"Name","type":"text","required":true},{"label":"Email","type":"email","required":true},{"label":"Message","type":"textarea","required":true}]}\n\`\`\`

User: "create a job application post type with job type and location taxonomies"
→ "Created Job Applications post type with Job Type and Location taxonomies."
→ \`\`\`action\n{"type":"createPostType","name":"Job Applications","key":"job_application","singular":"Job Application","icon":"folder","description":"Job application listings"}\n\`\`\`
→ \`\`\`action\n{"type":"createTaxonomy","name":"Job Types","key":"job_type","singular":"Job Type","postTypes":["job_application"],"hierarchical":true}\n\`\`\`
→ \`\`\`action\n{"type":"createTaxonomy","name":"Locations","key":"location","singular":"Location","postTypes":["job_application"],"hierarchical":false}\n\`\`\`
→ \`\`\`action\n{"type":"navigate","url":"/admin/cpt/job_application"}\n\`\`\`

User: "create a products post type with brand and category taxonomies"
→ "Created Products post type with Brand and Category taxonomies."
→ \`\`\`action\n{"type":"createPostType","name":"Products","key":"product","singular":"Product","icon":"tag"}\n\`\`\`
→ \`\`\`action\n{"type":"createTaxonomy","name":"Brands","key":"brand","singular":"Brand","postTypes":["product"],"hierarchical":false}\n\`\`\`
→ \`\`\`action\n{"type":"createTaxonomy","name":"Product Categories","key":"product_category","singular":"Product Category","postTypes":["product"],"hierarchical":true}\n\`\`\`
→ \`\`\`action\n{"type":"navigate","url":"/admin/cpt/product"}\n\`\`\`

User: "change the site title to Acme Corp"
→ "Updated site title to Acme Corp."
→ \`\`\`action\n{"type":"updateSettings","settings":{"blogname":"Acme Corp"}}\n\`\`\`

User: "write the intro for this post" (on editor page)
→ "Written an engaging introduction."
→ \`\`\`action\n{"type":"setContent","html":"<p>...</p>"}\n\`\`\`

User: "publish this post" (on editor page)
→ "Published."
→ \`\`\`action\n{"type":"setStatus","value":"publish"}\n\`\`\`\`\`\`action\n{"type":"savePost","status":"publish"}\n\`\`\``;
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function callAnthropic(apiKey: string, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.content[0].text as string;
}

async function callOpenAI(apiKey: string, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}

async function callGemini(apiKey: string, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 4096 },
      }),
    }
  );
  if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.candidates[0].content.parts[0].text as string;
}

async function callMistral(apiKey: string, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Mistral ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}

async function callGroq(apiKey: string, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}
