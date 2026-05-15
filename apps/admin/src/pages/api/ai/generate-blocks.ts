import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { wpOptions } from "@astropress/core/schema";

const BLOCK_TYPES_DOC = `
Available block types (use these in order of preference — prefer structured types over html):

1. hero      — Full-width banner. props: { heading, subtext, buttonText, buttonUrl, bgColor (hex), textColor (hex), align ("left"|"center"|"right"), height (px number) }
2. text      — Rich text section. props: { content (HTML string), align ("left"|"center"|"right") }
3. cta       — Call-to-action band. props: { heading, text, buttonText, buttonUrl, bgColor (hex), textColor (hex) }
4. features  — Feature grid. props: { heading, subtext, cols (2|3|4), items: [{ icon (emoji/symbol), title, text }] }
5. columns   — Two-column layout. props: { leftContent (HTML), rightContent (HTML), gap ("2rem") }
6. image     — Image with caption. props: { src (URL or ""), alt, caption, align ("left"|"center"|"right"), width ("normal"|"wide"|"full") }
7. spacer    — Vertical gap. props: { height (px number) }
8. divider   — Horizontal rule. props: { style ("solid"|"dashed"|"dotted"), color (hex), thickness (px number) }
9. html      — Custom HTML (LAST RESORT only, when no structured type can satisfy the request). props: { content (raw HTML) }

DO NOT use "html" if any of the above types (1–8) can represent the content.
`;

const SYSTEM_PROMPT = `You are a web page block generator for AstroPress CMS.
${BLOCK_TYPES_DOC}
Each block object must have exactly: { "id": "<8 random hex chars>", "type": "<block type>", "props": { ... } }

Rules:
- Return ONLY a valid JSON array. No markdown fences, no explanation, no text outside the array.
- Generate 3–8 blocks that logically fit the prompt (unless told to generate one).
- Use realistic, compelling copy — never use placeholder text like "Lorem ipsum".
- Choose colours that match the requested brand or style.
- Landing pages should start with a hero block.`;

const SINGLE_BLOCK_ADDENDUM = `
IMPORTANT: Generate EXACTLY ONE block — the single block that best satisfies the request.
Return a JSON array with exactly one element. Pick the most appropriate structured type; use "html" only if no other type fits.`;

export const POST: APIRoute = async ({ locals, request }) => {
  const db = locals.db;
  if (!db || !locals.user) return new Response("Unauthorized", { status: 401 });

  const { prompt, currentBlocks, singleBlock } = await request.json();
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = singleBlock ? SYSTEM_PROMPT + SINGLE_BLOCK_ADDENDUM : SYSTEM_PROMPT;

  const [settingsRow] = await db
    .select({ value: wpOptions.optionValue })
    .from(wpOptions)
    .where(eq(wpOptions.optionName, "astropress_ai_settings"))
    .limit(1);

  if (!settingsRow?.value) {
    return new Response(
      JSON.stringify({ error: "No AI provider configured. Go to Settings → AI." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const settings = JSON.parse(settingsRow.value);
  const provider: string = settings.activeProvider ?? "anthropic";
  const cfg = settings.providers?.[provider];

  if (!cfg?.apiKey || cfg.enabled === false) {
    return new Response(
      JSON.stringify({ error: `Provider "${provider}" is not configured or disabled. Visit Settings → AI.` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userMessage = currentBlocks?.length > 0
    ? `Current page has ${currentBlocks.length} block(s). ${prompt}`
    : prompt;

  const messages = [{ role: "user" as const, content: userMessage }];

  try {
    let raw: string;

    if (provider === "anthropic") {
      raw = await callAnthropic(cfg.apiKey, cfg.defaultModel ?? "claude-sonnet-4-6", systemPrompt, messages);
    } else if (provider === "openai") {
      raw = await callOpenAI(cfg.apiKey, cfg.defaultModel ?? "gpt-4o", systemPrompt, messages);
    } else if (provider === "gemini") {
      raw = await callGemini(cfg.apiKey, cfg.defaultModel ?? "gemini-flash-latest", systemPrompt, messages);
    } else if (provider === "mistral") {
      raw = await callMistral(cfg.apiKey, cfg.defaultModel ?? "mistral-large-latest", systemPrompt, messages);
    } else if (provider === "groq") {
      raw = await callGroq(cfg.apiKey, cfg.defaultModel ?? "llama-3.3-70b-versatile", systemPrompt, messages);
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown provider: ${provider}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in AI response");
    const blocks = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ blocks }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// ─── Provider implementations (mirrors chat.ts exactly) ───────────────────────

interface Msg { role: "user" | "assistant"; content: string; }

async function callAnthropic(apiKey: string, model: string, system: string, messages: Msg[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: messages.map(m => ({ role: m.role, content: m.content })) }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.content[0].text as string;
}

async function callOpenAI(apiKey: string, model: string, system: string, messages: Msg[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))] }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}

async function callGemini(apiKey: string, model: string, system: string, messages: Msg[]): Promise<string> {
  const contents = messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 4096 } }),
    }
  );
  if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.candidates[0].content.parts[0].text as string;
}

async function callMistral(apiKey: string, model: string, system: string, messages: Msg[]): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))] }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Mistral ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}

async function callGroq(apiKey: string, model: string, system: string, messages: Msg[]): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))] }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Groq ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}
