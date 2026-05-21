import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { wpOptions } from "@astropress/core/schema";

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return new Response("Unauthorized", { status: 401 });

  const db = locals.db;
  let { provider, model, apiKey } = await request.json() as any;

  // If no apiKey provided (masked / not changed), fall back to the saved key for this provider
  if (!apiKey && provider && provider !== "cloudflare-ai" && db) {
    const row = await db.select({ value: wpOptions.optionValue }).from(wpOptions)
      .where(eq(wpOptions.optionName, "astropress_ai_settings")).limit(1).then((r: any) => r[0]);
    if (row?.value) {
      const saved = JSON.parse(row.value);
      apiKey = saved.providers?.[provider]?.apiKey;
      if (!model) model = saved.providers?.[provider]?.defaultModel;
    }
  }

  if (!provider || provider === "none") {
    return new Response(JSON.stringify({ error: "No provider selected." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const testMessages = [{ role: "user" as const, content: "Reply with exactly: OK" }];
  const system = "You are a test assistant. Follow instructions exactly.";

  try {
    let reply: string;

    if (provider === "cloudflare-ai") {
      const ai = (locals as any).runtime?.env?.AI;
      if (!ai) throw new Error("Cloudflare Workers AI binding (AI) not found. Add the AI binding in your Cloudflare dashboard under Settings → Bindings.");
      const result = await ai.run(model ?? "@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        max_tokens: 32,
        messages: [{ role: "system", content: system }, ...testMessages],
      }) as any;
      reply = result.response ?? result.text ?? "OK";
    } else if (provider === "anthropic") {
      if (!apiKey) throw new Error("API key is required.");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: model ?? "claude-haiku-4-5-20251001", max_tokens: 16, system, messages: testMessages }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Anthropic ${res.status}: ${t.slice(0, 120)}`); }
      const data = await res.json() as any;
      reply = data.content[0].text;
    } else if (provider === "openai") {
      if (!apiKey) throw new Error("API key is required.");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model ?? "gpt-4o-mini", max_tokens: 16, messages: [{ role: "system", content: system }, ...testMessages] }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`OpenAI ${res.status}: ${t.slice(0, 120)}`); }
      const data = await res.json() as any;
      reply = data.choices[0].message.content;
    } else if (provider === "gemini") {
      if (!apiKey) throw new Error("API key is required.");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model ?? "gemini-flash-latest"}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: testMessages.map(m => ({ role: "user", parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 16 } }),
        }
      );
      if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t.slice(0, 120)}`); }
      const data = await res.json() as any;
      reply = data.candidates[0].content.parts[0].text;
    } else if (provider === "mistral") {
      if (!apiKey) throw new Error("API key is required.");
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model ?? "mistral-small-latest", max_tokens: 16, messages: [{ role: "system", content: system }, ...testMessages] }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Mistral ${res.status}: ${t.slice(0, 120)}`); }
      const data = await res.json() as any;
      reply = data.choices[0].message.content;
    } else if (provider === "groq") {
      if (!apiKey) throw new Error("API key is required.");
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model ?? "llama-3.1-8b-instant", max_tokens: 16, messages: [{ role: "system", content: system }, ...testMessages] }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Groq ${res.status}: ${t.slice(0, 120)}`); }
      const data = await res.json() as any;
      reply = data.choices[0].message.content;
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return new Response(JSON.stringify({ reply }), { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Test failed" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};
