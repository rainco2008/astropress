/**
 * Plugin bootstrap — imported once in middleware.
 * Add new plugins here to register them with the system.
 */
import { loadPlugin } from "@astropress/core";
import seoPlugin from "@astropress/plugin-seo";

let bootstrapped = false;

export function bootstrapPlugins(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  loadPlugin(seoPlugin);
}
