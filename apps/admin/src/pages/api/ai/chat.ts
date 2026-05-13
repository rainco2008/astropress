import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { wpOptions } from "@astropress/core/schema";

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
      JSON.stringify({
        error:
          "No AI provider configured. Go to Settings → AI to add an API key.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const settings = JSON.parse(row.optionValue);
  const provider: string = settings.activeProvider ?? "anthropic";
  const cfg = settings.providers?.[provider];

  if (!cfg?.apiKey || cfg.enabled === false) {
    return new Response(
      JSON.stringify({
        error: `Provider "${provider}" is not configured or is disabled. Visit Settings → AI.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const system = buildSystemPrompt(context);

  try {
    let reply: string;

    if (provider === "anthropic") {
      reply = await callAnthropic(
        cfg.apiKey,
        cfg.defaultModel ?? "claude-sonnet-4-6",
        system,
        messages
      );
    } else if (provider === "openai") {
      reply = await callOpenAI(
        cfg.apiKey,
        cfg.defaultModel ?? "gpt-4o",
        system,
        messages
      );
    } else if (provider === "gemini") {
      reply = await callGemini(
        cfg.apiKey,
        cfg.defaultModel ?? "gemini-flash-latest",
        system,
        messages
      );
    } else if (provider === "mistral") {
      reply = await callMistral(
        cfg.apiKey,
        cfg.defaultModel ?? "mistral-large-latest",
        system,
        messages
      );
    } else if (provider === "groq") {
      reply = await callGroq(
        cfg.apiKey,
        cfg.defaultModel ?? "llama-3.3-70b-versatile",
        system,
        messages
      );
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

function buildSystemPrompt(context: Record<string, any>): string {
  const contextStr = Object.entries(context)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return `You are AstroPress AI — an autonomous CMS assistant. You take action directly; you never give step-by-step instructions for the user to follow themselves.

Current page context:
${contextStr || "(none)"}

AUTONOMOUS BEHAVIOUR RULES:
1. When the user asks you to do something, DO IT — emit the action block(s) immediately.
2. Never say "you can", "you should", "click", "go to", "navigate to", "follow these steps", or give manual instructions.
3. Keep replies short: one sentence confirming what you did, nothing more.
4. If you need to write content, write the full content — not a description of what you will write.
5. For any task that requires multiple actions (e.g. set title + set content + set excerpt), emit ALL action blocks in one response.

ACTIONS — emit at the END of your response, one per block:

\`\`\`action
{"type":"setTitle","value":"Exact Title Here"}
\`\`\`

\`\`\`action
{"type":"setExcerpt","value":"One or two sentence excerpt."}
\`\`\`

\`\`\`action
{"type":"setContent","html":"<p>Full HTML content...</p>"}
\`\`\`

\`\`\`action
{"type":"setStatus","value":"publish"}
\`\`\`

\`\`\`action
{"type":"savePost","status":"draft"}
\`\`\`

\`\`\`action
{"type":"navigate","url":"/admin/posts/new"}
\`\`\`

CONTENT FORMAT:
- Post content: clean semantic HTML (<h2>, <p>, <ul>, <strong> etc.)
- Titles: plain text, no HTML
- Excerpts: plain text, 1–2 sentences

EXAMPLES:
User: "write a post about coffee"
→ Reply: "Created a draft post about coffee." + setTitle + setContent + setExcerpt blocks

User: "make the title catchier"
→ Reply: "Updated the title." + setTitle block

User: "publish this"
→ Reply: "Published." + setStatus("publish") + savePost("publish") blocks`;
}

// ─── Provider implementations ──────────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.content[0].text as string;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
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
        generationConfig: { maxOutputTokens: 2048 },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.candidates[0].content.parts[0].text as string;
}

async function callMistral(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mistral ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}

async function callGroq(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.choices[0].message.content as string;
}
