import type { APIRoute } from "astro";

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Built-in Header Templates ────────────────────────────────────────────────

const HEADER_CLASSIC = [{ id: uid(), type: "nav", props: { logoText: "", align: "right" } }];

const HEADER_CENTERED = [{ id: uid(), type: "html", props: { content: `<header style="background:var(--color-bg,#fff);border-bottom:1px solid var(--color-border,#e9ecef);padding:16px 48px;text-align:center;"><a href="/" style="font-family:var(--font-heading,sans-serif);font-size:1.5rem;font-weight:700;color:var(--color-text,#212529);text-decoration:none;">Site Name</a><nav style="margin-top:12px;display:flex;gap:24px;justify-content:center;flex-wrap:wrap;"><a href="/" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;">Home</a><a href="/about" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;">About</a><a href="/blog" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;">Blog</a><a href="/contact" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;">Contact</a></nav></header>` } }];

const HEADER_DARK = [{ id: uid(), type: "html", props: { content: `<header style="background:#1d2327;padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;"><a href="/" style="font-family:var(--font-heading,sans-serif);font-weight:700;font-size:1.2rem;color:#fff;text-decoration:none;">Site Name</a><nav style="display:flex;gap:0;"><a href="/" style="color:rgba(255,255,255,0.75);text-decoration:none;font-size:0.9rem;padding:8px 14px;transition:color 0.15s;">Home</a><a href="/about" style="color:rgba(255,255,255,0.75);text-decoration:none;font-size:0.9rem;padding:8px 14px;">About</a><a href="/blog" style="color:rgba(255,255,255,0.75);text-decoration:none;font-size:0.9rem;padding:8px 14px;">Blog</a><a href="/contact" style="color:rgba(255,255,255,0.75);text-decoration:none;font-size:0.9rem;padding:8px 14px;">Contact</a></nav></header>` } }];

const HEADER_BRANDED = [{ id: uid(), type: "html", props: { content: `<header style="background:var(--color-primary,#2271b1);padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;"><a href="/" style="font-family:var(--font-heading,sans-serif);font-weight:700;font-size:1.3rem;color:#fff;text-decoration:none;">Site Name</a><nav style="display:flex;gap:0;"><a href="/" style="color:rgba(255,255,255,0.85);text-decoration:none;font-size:0.9rem;padding:8px 16px;">Home</a><a href="/about" style="color:rgba(255,255,255,0.85);text-decoration:none;font-size:0.9rem;padding:8px 16px;">About</a><a href="/blog" style="color:rgba(255,255,255,0.85);text-decoration:none;font-size:0.9rem;padding:8px 16px;">Blog</a><a href="/contact" style="background:rgba(255,255,255,0.2);color:#fff;text-decoration:none;font-size:0.9rem;padding:8px 16px;border-radius:4px;">Contact</a></nav></header>` } }];

const HEADER_SPLIT = [{ id: uid(), type: "html", props: { content: `<header style="background:var(--color-bg,#fff);border-bottom:1px solid var(--color-border,#e9ecef);"><div style="background:var(--color-primary,#2271b1);padding:6px 48px;text-align:right;"><a href="/login" style="color:rgba(255,255,255,0.8);font-size:12px;text-decoration:none;margin-left:16px;">Login</a><a href="/contact" style="color:rgba(255,255,255,0.8);font-size:12px;text-decoration:none;margin-left:16px;">Contact</a></div><div style="padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;"><a href="/" style="font-family:var(--font-heading,sans-serif);font-weight:700;font-size:1.4rem;color:var(--color-text,#212529);text-decoration:none;">Site Name</a><nav style="display:flex;gap:0;"><a href="/" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;padding:8px 14px;">Home</a><a href="/about" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;padding:8px 14px;">About</a><a href="/services" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;padding:8px 14px;">Services</a><a href="/blog" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;padding:8px 14px;">Blog</a><a href="/contact" style="color:var(--color-muted,#6c757d);text-decoration:none;font-size:0.9rem;padding:8px 14px;">Contact</a></nav></div></header>` } }];

// ─── Built-in Footer Templates ────────────────────────────────────────────────

const FOOTER_SIMPLE = [{ id: uid(), type: "html", props: { content: `<footer style="background:var(--color-surface,#f8f9fa);border-top:1px solid var(--color-border,#e9ecef);padding:24px 48px;text-align:center;"><p style="margin:0;font-size:13px;color:var(--color-muted,#6c757d);">© ${new Date().getFullYear()} Your Site. All rights reserved.</p></footer>` } }];

const FOOTER_DARK = [{ id: uid(), type: "html", props: { content: `<footer style="background:#1d2327;color:#a7aaad;padding:48px;"><div style="max-width:1200px;margin:0 auto;display:flex;justify-content:center;gap:32px;flex-wrap:wrap;margin-bottom:28px;"><a href="/" style="color:#a7aaad;text-decoration:none;font-size:13px;">Home</a><a href="/about" style="color:#a7aaad;text-decoration:none;font-size:13px;">About</a><a href="/blog" style="color:#a7aaad;text-decoration:none;font-size:13px;">Blog</a><a href="/services" style="color:#a7aaad;text-decoration:none;font-size:13px;">Services</a><a href="/contact" style="color:#a7aaad;text-decoration:none;font-size:13px;">Contact</a></div><p style="text-align:center;margin:0;font-size:12px;color:#646970;">© ${new Date().getFullYear()} Your Site. All rights reserved.</p></footer>` } }];

const FOOTER_FOUR_COL = [{ id: uid(), type: "html", props: { content: `<footer style="background:#1d2327;color:#a7aaad;padding:60px 48px 32px;"><div style="max-width:1200px;margin:0 auto;"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:48px;"><div><h3 style="color:#fff;font-size:1.1rem;font-weight:700;margin:0 0 12px;">Site Name</h3><p style="font-size:13px;line-height:1.7;margin:0 0 16px;">Building great digital experiences for people worldwide.</p></div><div><h4 style="color:#fff;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 14px;">Company</h4><div style="display:flex;flex-direction:column;gap:9px;"><a href="/about" style="color:#a7aaad;text-decoration:none;font-size:13px;">About</a><a href="/services" style="color:#a7aaad;text-decoration:none;font-size:13px;">Services</a><a href="/contact" style="color:#a7aaad;text-decoration:none;font-size:13px;">Contact</a></div></div><div><h4 style="color:#fff;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 14px;">Resources</h4><div style="display:flex;flex-direction:column;gap:9px;"><a href="/blog" style="color:#a7aaad;text-decoration:none;font-size:13px;">Blog</a><a href="/docs" style="color:#a7aaad;text-decoration:none;font-size:13px;">Docs</a><a href="/faq" style="color:#a7aaad;text-decoration:none;font-size:13px;">FAQ</a></div></div><div><h4 style="color:#fff;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 14px;">Legal</h4><div style="display:flex;flex-direction:column;gap:9px;"><a href="/privacy" style="color:#a7aaad;text-decoration:none;font-size:13px;">Privacy</a><a href="/terms" style="color:#a7aaad;text-decoration:none;font-size:13px;">Terms</a></div></div></div><div style="border-top:1px solid #3c434a;padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#646970;">© ${new Date().getFullYear()} Your Site. All rights reserved.</p></div></div></footer>` } }];

const FOOTER_BRAND = [{ id: uid(), type: "html", props: { content: `<footer style="background:var(--color-primary,#2271b1);color:rgba(255,255,255,0.85);padding:40px 48px;"><div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;"><div><strong style="color:#fff;font-size:1.1rem;">Site Name</strong><p style="margin:6px 0 0;font-size:13px;opacity:0.8;">© ${new Date().getFullYear()} All rights reserved.</p></div><nav style="display:flex;gap:24px;flex-wrap:wrap;"><a href="/" style="color:rgba(255,255,255,0.8);text-decoration:none;font-size:13px;">Home</a><a href="/about" style="color:rgba(255,255,255,0.8);text-decoration:none;font-size:13px;">About</a><a href="/blog" style="color:rgba(255,255,255,0.8);text-decoration:none;font-size:13px;">Blog</a><a href="/privacy" style="color:rgba(255,255,255,0.8);text-decoration:none;font-size:13px;">Privacy</a></nav></div></footer>` } }];

// ─── Built-in Template Library ────────────────────────────────────────────────

export const TEMPLATE_LIBRARY: Record<string, Array<{ id: string; name: string; free: boolean; blocks: any[] }>> = {
  header: [
    { id: "header-classic", name: "Classic", free: true, blocks: HEADER_CLASSIC },
    { id: "header-centered", name: "Centered", free: true, blocks: HEADER_CENTERED },
    { id: "header-dark", name: "Dark", free: true, blocks: HEADER_DARK },
    { id: "header-branded", name: "Branded", free: true, blocks: HEADER_BRANDED },
    { id: "header-split", name: "Split (Top Bar)", free: true, blocks: HEADER_SPLIT },
  ],
  footer: [
    { id: "footer-simple", name: "Simple", free: true, blocks: FOOTER_SIMPLE },
    { id: "footer-dark", name: "Dark Links", free: true, blocks: FOOTER_DARK },
    { id: "footer-four-col", name: "Four Column", free: true, blocks: FOOTER_FOUR_COL },
    { id: "footer-brand", name: "Branded", free: true, blocks: FOOTER_BRAND },
  ],
  "single-post": [
    { id: "single-post-standard", name: "Standard", free: true, blocks: [{ id: uid(), type: "html", props: { content: `<article style="max-width:740px;margin:0 auto;padding:48px 24px;"><header style="margin-bottom:32px;"><h1 style="font-family:var(--font-heading,sans-serif);font-size:2.2rem;font-weight:700;margin:0 0 12px;line-height:1.25;color:var(--color-text,#212529);">Post Title</h1><div style="font-size:0.875rem;color:var(--color-muted,#6c757d);">January 1, 2024 · 5 min read</div></header><div style="font-size:1.05rem;line-height:1.8;color:var(--color-text,#212529);">Post content renders here.</div></article>` } }] },
  ],
  "single-page": [
    { id: "single-page-standard", name: "Standard", free: true, blocks: [{ id: uid(), type: "html", props: { content: `<main style="max-width:900px;margin:0 auto;padding:48px 24px;"><h1 style="font-family:var(--font-heading,sans-serif);font-size:2rem;font-weight:700;margin:0 0 24px;color:var(--color-text,#212529);">Page Title</h1><div style="font-size:1.05rem;line-height:1.8;color:var(--color-text,#212529);">Page content renders here.</div></main>` } }] },
  ],
  archive: [
    { id: "archive-grid", name: "Grid", free: true, blocks: [{ id: uid(), type: "html", props: { content: `<div style="max-width:1100px;margin:0 auto;padding:48px 24px;"><h1 style="font-family:var(--font-heading,sans-serif);font-size:1.8rem;font-weight:700;margin:0 0 32px;color:var(--color-text,#212529);">Archive</h1><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px;">Posts render here.</div></div>` } }] },
  ],
  "404": [
    { id: "404-standard", name: "Standard", free: true, blocks: [{ id: uid(), type: "html", props: { content: `<div style="text-align:center;padding:100px 24px;"><div style="font-size:6rem;font-weight:700;color:var(--color-border,#e9ecef);line-height:1;">404</div><h2 style="font-family:var(--font-heading,sans-serif);font-size:1.5rem;font-weight:600;margin:16px 0 8px;color:var(--color-text,#212529);">Page Not Found</h2><p style="color:var(--color-muted,#6c757d);margin:0 0 28px;">The page you're looking for doesn't exist or has been moved.</p><a href="/" style="display:inline-block;background:var(--color-primary,#2271b1);color:#fff;padding:12px 28px;border-radius:var(--radius-md,6px);text-decoration:none;font-weight:600;">Go Home</a></div>` } }] },
  ],
  search: [
    { id: "search-standard", name: "Standard", free: true, blocks: [{ id: uid(), type: "html", props: { content: `<div style="max-width:740px;margin:0 auto;padding:48px 24px;"><h1 style="font-family:var(--font-heading,sans-serif);font-size:1.8rem;font-weight:700;margin:0 0 24px;color:var(--color-text,#212529);">Search Results</h1><div>Results render here.</div></div>` } }] },
  ],
};

// ─── Built-in Theme Packages ──────────────────────────────────────────────────

const THEME_PACKAGES = [
  {
    id: "theme-business",
    name: "Business Pro",
    description: "Clean professional theme for businesses and agencies",
    preview: null,
    free: true,
    package: {
      name: "Business Pro",
      version: "1.0.0",
      description: "Clean professional theme for businesses and agencies",
      author: "AstroPress",
      tokens: {
        colors: { primary: "#2271b1", secondary: "#0ea5e9", background: "#ffffff", surface: "#f8fafc", text: "#1e293b", textMuted: "#64748b", border: "#e2e8f0" },
        fonts: { heading: "system-ui, -apple-system, sans-serif", body: "system-ui, -apple-system, sans-serif" },
        spacing: { sectionY: "5rem", containerMax: "1200px", borderRadius: "0.5rem" },
      },
      templates: [
        { type: "header", name: "Business Header", blocks: HEADER_CLASSIC },
        { type: "footer", name: "Business Footer", blocks: FOOTER_FOUR_COL },
      ],
      pages: [
        {
          title: "Home", slug: "home",
          blocks: [
            { id: uid(), type: "hero", props: { heading: "Grow Your Business Online", subtext: "Professional tools and services to take your business to the next level.", buttonText: "Get Started", buttonUrl: "/contact", bgColor: "#1e293b", textColor: "#ffffff", align: "center", height: 520 } },
            { id: uid(), type: "features", props: { heading: "Why Choose Us", subtext: "Everything your business needs to succeed online", cols: 3, items: [{ icon: "⚡", title: "Fast & Reliable", text: "Blazing fast performance with 99.9% uptime guarantee." }, { icon: "🔒", title: "Secure", text: "Enterprise-grade security to protect your data and customers." }, { icon: "📈", title: "Scalable", text: "Grows with your business from startup to enterprise." }] } },
            { id: uid(), type: "cta", props: { heading: "Ready to Get Started?", text: "Join thousands of businesses already growing with us.", buttonText: "Start Free Trial", buttonUrl: "/contact", bgColor: "#2271b1", textColor: "#ffffff" } },
          ],
        },
        {
          title: "About", slug: "about",
          blocks: [
            { id: uid(), type: "hero", props: { heading: "About Us", subtext: "Learn more about who we are and what we do.", bgColor: "#1e293b", textColor: "#ffffff", align: "center", height: 300 } },
            { id: uid(), type: "columns", props: { leftContent: "<h2>Our Story</h2><p>Founded with a mission to help businesses thrive online, we've been delivering exceptional digital solutions since 2020.</p><p>Our team of experts combines deep industry knowledge with cutting-edge technology to create solutions that drive real results.</p>", rightContent: "<h2>Our Mission</h2><p>We believe every business deserves access to world-class digital tools and expertise, regardless of size or budget.</p><p>That's why we've built an accessible platform that puts powerful features in everyone's hands.</p>" } },
          ],
        },
        {
          title: "Contact", slug: "contact",
          blocks: [
            { id: uid(), type: "hero", props: { heading: "Contact Us", subtext: "Get in touch with our team.", bgColor: "#1e293b", textColor: "#ffffff", align: "center", height: 280 } },
            { id: uid(), type: "text", props: { content: "<p style='text-align:center;font-size:1.1rem;'>📧 hello@yoursite.com &nbsp;|&nbsp; 📞 +1 (555) 000-0000 &nbsp;|&nbsp; 📍 123 Business Ave, New York, NY</p>", align: "center" } },
          ],
        },
      ],
    },
  },
  {
    id: "theme-creative",
    name: "Creative Agency",
    description: "Bold and expressive theme for creative studios and agencies",
    preview: null,
    free: true,
    package: {
      name: "Creative Agency",
      version: "1.0.0",
      description: "Bold and expressive theme for creative studios and agencies",
      author: "AstroPress",
      tokens: {
        colors: { primary: "#7c3aed", secondary: "#ec4899", background: "#ffffff", surface: "#faf5ff", text: "#1e1b4b", textMuted: "#6b7280", border: "#e9d5ff" },
        fonts: { heading: "system-ui, -apple-system, sans-serif", body: "system-ui, -apple-system, sans-serif" },
        spacing: { sectionY: "6rem", containerMax: "1100px", borderRadius: "1rem" },
      },
      templates: [
        { type: "header", name: "Creative Header", blocks: HEADER_BRANDED },
        { type: "footer", name: "Creative Footer", blocks: FOOTER_DARK },
      ],
      pages: [
        {
          title: "Home", slug: "home",
          blocks: [
            { id: uid(), type: "hero", props: { heading: "We Create Bold Experiences", subtext: "A creative agency passionate about design, strategy, and digital innovation.", buttonText: "See Our Work", buttonUrl: "/portfolio", bgColor: "#1e1b4b", textColor: "#ffffff", align: "center", height: 560 } },
            { id: uid(), type: "features", props: { heading: "What We Do", subtext: "End-to-end creative services for modern brands", cols: 3, items: [{ icon: "✦", title: "Brand Identity", text: "Logos, guidelines, and visual systems that define who you are." }, { icon: "◆", title: "Web Design", text: "Beautiful, conversion-optimized websites and digital experiences." }, { icon: "★", title: "Strategy", text: "Data-driven marketing strategies that drive real growth." }] } },
          ],
        },
      ],
    },
  },
  {
    id: "theme-minimal",
    name: "Minimal Blog",
    description: "Clean minimal theme focused on typography and reading experience",
    preview: null,
    free: true,
    package: {
      name: "Minimal Blog",
      version: "1.0.0",
      description: "Clean minimal theme focused on typography and reading experience",
      author: "AstroPress",
      tokens: {
        colors: { primary: "#111827", secondary: "#374151", background: "#ffffff", surface: "#f9fafb", text: "#111827", textMuted: "#6b7280", border: "#f3f4f6" },
        fonts: { heading: "Georgia, 'Times New Roman', serif", body: "system-ui, -apple-system, sans-serif" },
        spacing: { sectionY: "4rem", containerMax: "740px", borderRadius: "0.25rem" },
      },
      templates: [
        { type: "header", name: "Minimal Header", blocks: HEADER_CENTERED },
        { type: "footer", name: "Minimal Footer", blocks: FOOTER_SIMPLE },
      ],
      pages: [],
    },
  },
];

export const GET: APIRoute = async ({ locals, url }) => {
  const db = locals.db;
  if (!db || !locals.user) return new Response("Unauthorized", { status: 401 });

  const type = url.searchParams.get("type");

  if (type === "themes") {
    return new Response(JSON.stringify({ themes: THEME_PACKAGES.map(t => ({ id: t.id, name: t.name, description: t.description, free: t.free, preview: t.preview })) }), { headers: { "Content-Type": "application/json" } });
  }

  if (type === "theme-package") {
    const id = url.searchParams.get("id");
    const pkg = THEME_PACKAGES.find(t => t.id === id);
    if (!pkg) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ package: pkg.package }), { headers: { "Content-Type": "application/json" } });
  }

  // Default: return templates (optionally filtered by type)
  const library = type && TEMPLATE_LIBRARY[type] ? { [type]: TEMPLATE_LIBRARY[type] } : TEMPLATE_LIBRARY;
  return new Response(JSON.stringify({ templates: library }), { headers: { "Content-Type": "application/json" } });
};
