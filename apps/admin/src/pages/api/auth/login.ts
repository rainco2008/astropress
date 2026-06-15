import type { APIRoute } from "astro";
import { createAuth, verifyPassword } from "@astropress/auth";
import { wpUsers } from "@astropress/core/schema";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const username = params.get("username")?.trim() ?? "";
  const password = params.get("password") ?? "";

  if (!username || !password) {
    return redirect("/login?error=invalid");
  }

  const db = locals.db;
  if (!db) return redirect("/login?error=unknown");

  const [user] = await db
    .select()
    .from(wpUsers)
    .where(eq(wpUsers.userLogin, username))
    .limit(1);

  if (!user) return redirect("/login?error=invalid");

  const valid = await verifyPassword(password, user.userPass);
  if (!valid) return redirect("/login?error=invalid");

  const auth = createAuth(db as Parameters<typeof createAuth>[0]);
  const session = await auth.createSession(String(user.id), {});
  const cookie = auth.createSessionCookie(session.id);
  cookies.set(cookie.name, cookie.value, cookie.attributes);
  return redirect("/admin/dashboard");
};
