# Plugin API

## Overview

Plugins extend AstroPress without modifying core. Every plugin in `plugins/` is auto-loaded at startup.

## Plugin Manifest

Every plugin must export a default `definePlugin` object:

```ts
// plugins/my-plugin/src/index.ts
import { registerPostType, registerTaxonomy } from "@astropress/core";

export default {
  name: "my-plugin",
  version: "1.0.0",
  description: "What this plugin does",

  register() {
    // Register a custom post type
    registerPostType("product", {
      label: "Product",
      pluralLabel: "Products",
      icon: "🛒",
      public: true,
      showInMenu: true,
      supports: ["title", "editor", "thumbnail", "custom-fields"],
    });

    // Register a custom taxonomy
    registerTaxonomy("product_category", {
      label: "Product Category",
      pluralLabel: "Product Categories",
      hierarchical: true,
      postTypes: ["product"],
    });
  },
};
```

## What Plugins Can Do (MVP)

| Capability | How |
|-----------|-----|
| Register post types | `registerPostType(slug, config)` from `@astropress/core` |
| Register taxonomies | `registerTaxonomy(slug, config)` from `@astropress/core` |
| Add sidebar links | Post types with `showInMenu: true` appear automatically |
| Add postmeta fields | Store custom fields via the `wp_postmeta` table |

## Example: SEO Plugin

See `plugins/seo/src/index.ts` for a complete example.

## Package Structure

```
plugins/my-plugin/
├── package.json        # name: "@astropress/plugin-my-plugin"
├── src/
│   └── index.ts        # default export: plugin manifest
└── tsconfig.json
```

## Loading

Plugins are loaded by importing `plugins/*/src/index.ts` and calling their `register()` method. The loader runs before the Astro dev/build process starts.
