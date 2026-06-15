/**
 * Plugin bootstrap — imported once in middleware.
 * Add new plugins here to register them with the system.
 *
 * ## Adding AI actions from a plugin
 *
 * Plugins can extend the AI assistant by registering custom actions.
 * Actions appear automatically in the AI system prompt and can be triggered
 * by the floating AI widget from any admin page.
 *
 * ```ts
 * import { registerAIAction } from "../lib/ai-registry";
 *
 * registerAIAction({
 *   type: "myPlugin:doSomething",
 *   description: "What this action does — shown to the AI",
 *   example: '{"type":"myPlugin:doSomething","param":"value"}',
 *   serverSide: true,
 *   handler: async (params, db, userId) => {
 *     // perform the action using db
 *     return { success: true, message: "Done.", navigate: "/admin/..." };
 *   },
 * });
 * ```
 *
 * Call registerAIAction() at module load time (top-level or in bootstrapPlugins).
 * The execute endpoint imports ai-actions.ts which must import your plugin file
 * for the action to be available server-side.
 */
import { loadPlugin } from "@astropress/core";
import seoPlugin from "@astropress/plugin-seo";

let bootstrapped = false;

export function bootstrapPlugins(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  loadPlugin(seoPlugin);

  // To add AI actions from a plugin, call registerAIAction() here or in the
  // plugin's own module and import it above.
}
