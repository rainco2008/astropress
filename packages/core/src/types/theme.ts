export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "columns"
  | "cta"
  | "features"
  | "form"
  | "nav"
  | "site-title"
  | "spacer"
  | "divider"
  | "html"
  | "ai";

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
}

export interface PageSchema {
  version: 1;
  blocks: Block[];
}

export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: {
    sectionY: string;
    containerMax: string;
    borderRadius: string;
  };
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    primary: "#2271b1",
    secondary: "#7c3aed",
    background: "#ffffff",
    surface: "#f8f9fa",
    text: "#212529",
    textMuted: "#6c757d",
    border: "#e9ecef",
  },
  fonts: {
    heading: "system-ui, -apple-system, sans-serif",
    body: "system-ui, -apple-system, sans-serif",
  },
  spacing: {
    sectionY: "5rem",
    containerMax: "1200px",
    borderRadius: "0.5rem",
  },
};

export const BLOCK_DEFAULTS: Record<BlockType, Record<string, unknown>> = {
  hero: {
    heading: "Welcome to Our Site",
    subtext: "A powerful platform built for your business.",
    buttonText: "Get Started",
    buttonUrl: "#",
    bgColor: "#1a1a2e",
    textColor: "#ffffff",
    align: "center",
    height: 480,
  },
  text: {
    content: "<p>Your content goes here. Click to edit this block.</p>",
    align: "left",
  },
  image: {
    src: "",
    alt: "",
    caption: "",
    align: "center",
    width: "normal",
  },
  columns: {
    cols: 2,
    gap: "2rem",
    leftContent: "<p>Left column content.</p>",
    rightContent: "<p>Right column content.</p>",
  },
  cta: {
    heading: "Ready to Get Started?",
    text: "Join thousands of users who trust our platform.",
    buttonText: "Start Free Trial",
    buttonUrl: "#",
    bgColor: "#2271b1",
    textColor: "#ffffff",
  },
  features: {
    heading: "Why Choose Us",
    subtext: "Everything you need to grow your business",
    cols: 3,
    items: [
      { icon: "★", title: "Feature One", text: "Description of this amazing feature." },
      { icon: "✦", title: "Feature Two", text: "Description of this amazing feature." },
      { icon: "◆", title: "Feature Three", text: "Description of this amazing feature." },
    ],
  },
  form: {
    formId: "",
    formTitle: "Select a form",
  },
  nav: {
    align: "right",
    style: "inline",
    logoText: "",
  },
  "site-title": {
    showTagline: true,
    size: "medium",
    align: "left",
  },
  spacer: { height: 64 },
  divider: { style: "solid", color: "#e2e8f0", thickness: 1 },
  html: { content: "<!-- Custom HTML here -->" },
  ai: { prompt: "" },
};
