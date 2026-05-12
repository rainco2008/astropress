# Theme API

## Overview

Themes control the visual appearance of `apps/web`. The default theme lives in `themes/default`.

## Default Theme

The default theme exports a single `themeStyles` CSS string that `apps/web/src/layouts/BaseLayout.astro` injects into every page. It uses CSS custom properties (variables) so you can override any value.

## Creating a Theme

```
themes/my-theme/
├── package.json
│   # { "name": "@astropress/theme-my-theme", "exports": { ".": "./index.ts" } }
└── index.ts
    # export const themeStyles = `...your CSS...`;
```

## CSS Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--font-sans` | `system-ui` | Body font stack |
| `--color-bg` | `#ffffff` | Page background |
| `--color-text` | `#212529` | Body text |
| `--color-primary` | `#2271b1` | Links, buttons |
| `--color-border` | `#e9ecef` | Dividers, card borders |
| `--max-width` | `740px` | Content column width |

## Switching Themes

1. Create your theme package in `themes/`
2. Update `apps/web/src/layouts/BaseLayout.astro` to import from your theme
3. Update the `stylesheet` option in `wp_options` via Settings
