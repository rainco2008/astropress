import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  vite: {
    resolve: {
      dedupe: [
        "@wordpress/block-editor",
        "@wordpress/block-library",
        "@wordpress/blocks",
        "@wordpress/components",
        "@wordpress/compose",
        "@wordpress/data",
        "@wordpress/element",
        "@wordpress/hooks",
        "@wordpress/i18n",
        "@wordpress/keyboard-shortcuts",
        "@wordpress/primitives",
        "@wordpress/rich-text",
        "react",
        "react-dom",
      ],
    },
    optimizeDeps: {
      include: [
        "@wordpress/block-editor",
        "@wordpress/block-library",
        "@wordpress/blocks",
        "@wordpress/components",
        "@wordpress/data",
        "@wordpress/element",
        "@wordpress/keyboard-shortcuts",
      ],
    },
    ssr: {
      noExternal: [
        "@wordpress/block-editor",
        "@wordpress/block-library",
        "@wordpress/blocks",
        "@wordpress/components",
        "@wordpress/data",
        "@wordpress/element",
        "@wordpress/keyboard-shortcuts",
      ],
    },
  },
});
