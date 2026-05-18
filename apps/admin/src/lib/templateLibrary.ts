import type { Block } from "@astropress/core/types/theme";

export const LIBRARY_CATEGORIES = [
  "All", "Navigation", "Hero", "Features", "Content", "CTA", "Pricing", "Gallery", "Form", "Footer",
] as const;
export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

export interface LibraryBlock {
  id: string;
  name: string;
  category: Exclude<LibraryCategory, "All">;
  blocks: Block[];
}

export interface LibraryPage {
  id: string;
  name: string;
  industry: string;
  popularity: number; // 0-100
  blocks: Block[];
}

export interface UserTemplate {
  id: string;
  name: string;
  createdAt: string;
  blocks: Block[];
}

function b(id: string, type: Block["type"], props: Record<string, unknown>): Block {
  return { id, type, props };
}

// ─── Block Templates ───────────────────────────────────────────────────────────

export const LIBRARY_BLOCKS: LibraryBlock[] = [
  // ── Navigation ──────────────────────────────────────────────────────────────
  {
    id: "nav-classic",
    name: "Classic Nav",
    category: "Navigation",
    blocks: [b("t", "nav", { logoText: "Brand", align: "right", style: "inline" })],
  },
  {
    id: "nav-left-logo",
    name: "Logo Left Nav",
    category: "Navigation",
    blocks: [b("t", "nav", { logoText: "Brand", align: "left", style: "inline" })],
  },
  {
    id: "nav-with-title",
    name: "Site Title + Nav",
    category: "Navigation",
    blocks: [
      b("t1", "site-title", { showTagline: true, size: "medium", align: "left" }),
      b("t2", "nav", { logoText: "", align: "right", style: "inline" }),
    ],
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  {
    id: "hero-dark-center",
    name: "Dark Hero (Center)",
    category: "Hero",
    blocks: [b("t", "hero", { heading: "Build Something Amazing", subtext: "The platform your business needs to grow.", buttonText: "Get Started", buttonUrl: "#", bgColor: "#0f172a", textColor: "#f8fafc", align: "center", height: 520 })],
  },
  {
    id: "hero-navy-left",
    name: "Navy Hero (Left)",
    category: "Hero",
    blocks: [b("t", "hero", { heading: "Design Without Limits", subtext: "From idea to launch in days, not months.", buttonText: "See Our Work", buttonUrl: "#", bgColor: "#1e3a5f", textColor: "#f0f9ff", align: "left", height: 480 })],
  },
  {
    id: "hero-brand-center",
    name: "Brand Hero",
    category: "Hero",
    blocks: [b("t", "hero", { heading: "Grow Your Business", subtext: "Powerful tools to take you to the next level.", buttonText: "Start Free Trial", buttonUrl: "#", bgColor: "#2271b1", textColor: "#ffffff", align: "center", height: 480 })],
  },
  {
    id: "hero-purple-bold",
    name: "Purple Bold Hero",
    category: "Hero",
    blocks: [b("t", "hero", { heading: "AI That Actually Works", subtext: "Stop wasting time on manual tasks.", buttonText: "Get Early Access", buttonUrl: "#", bgColor: "#4c1d95", textColor: "#f5f3ff", align: "center", height: 500 })],
  },
  {
    id: "hero-light-minimal",
    name: "Light Minimal Hero",
    category: "Hero",
    blocks: [b("t", "hero", { heading: "Simple. Powerful. Fast.", subtext: "The tool your team has been waiting for.", buttonText: "Learn More", buttonUrl: "#", bgColor: "#f8fafc", textColor: "#111827", align: "center", height: 400 })],
  },
  {
    id: "hero-dark-tall",
    name: "Dark Tall Hero",
    category: "Hero",
    blocks: [b("t", "hero", { heading: "We Build Digital Experiences", subtext: "Award-winning studio crafting brands that stand out.", buttonText: "View Portfolio", buttonUrl: "#", bgColor: "#1a1a2e", textColor: "#ffffff", align: "left", height: 560 })],
  },
  {
    id: "hero-gradient",
    name: "Emerald Hero",
    category: "Hero",
    blocks: [b("t", "hero", { heading: "The Future of Your Industry", subtext: "Join thousands of companies already ahead of the curve.", buttonText: "Join for Free", buttonUrl: "#", bgColor: "#064e3b", textColor: "#ecfdf5", align: "center", height: 480 })],
  },

  // ── Features ────────────────────────────────────────────────────────────────
  {
    id: "features-3col-icons",
    name: "3-Column Features",
    category: "Features",
    blocks: [b("t", "features", {
      heading: "Why Choose Us",
      subtext: "Everything you need to succeed, nothing you don't",
      cols: 3,
      items: [
        { icon: "⚡", title: "Lightning Fast", text: "Optimized for peak performance from the ground up." },
        { icon: "🔒", title: "Secure by Default", text: "Enterprise-grade security built right in, zero config." },
        { icon: "📊", title: "Deep Analytics", text: "Make smarter decisions with real-time insights." },
      ],
    })],
  },
  {
    id: "features-2col",
    name: "2-Column Features",
    category: "Features",
    blocks: [b("t", "features", {
      heading: "Our Core Strengths",
      subtext: "",
      cols: 2,
      items: [
        { icon: "🎯", title: "Precision", text: "Built for accuracy and reliability at any scale." },
        { icon: "🤝", title: "Collaboration", text: "Work together seamlessly, from anywhere." },
        { icon: "🌍", title: "Global Reach", text: "Serve customers across 150+ countries." },
        { icon: "💡", title: "Innovation", text: "Constantly evolving to meet your needs." },
      ],
    })],
  },
  {
    id: "features-4col",
    name: "4-Column Grid",
    category: "Features",
    blocks: [b("t", "features", {
      heading: "All the Tools You Need",
      subtext: "Packed into one powerful platform",
      cols: 4,
      items: [
        { icon: "✦", title: "Analytics", text: "Track what matters most." },
        { icon: "★", title: "Automation", text: "Save hours every day." },
        { icon: "◆", title: "Integrations", text: "Connect your existing stack." },
        { icon: "●", title: "Support", text: "24/7 expert assistance." },
      ],
    })],
  },
  {
    id: "features-services",
    name: "Services Grid",
    category: "Features",
    blocks: [b("t", "features", {
      heading: "Our Services",
      subtext: "Comprehensive solutions for your business",
      cols: 3,
      items: [
        { icon: "🎨", title: "Brand Identity", text: "Logos, guidelines, and visual systems that last." },
        { icon: "💻", title: "Web Design", text: "Beautiful, fast websites that convert visitors." },
        { icon: "📱", title: "Digital Marketing", text: "SEO, ads, and content that drives real growth." },
      ],
    })],
  },

  // ── Content ──────────────────────────────────────────────────────────────────
  {
    id: "content-rich-text",
    name: "Rich Text",
    category: "Content",
    blocks: [b("t", "text", { content: "<h2>Our Story</h2><p>We started with a simple idea: make great tools accessible to everyone. Today, thousands of teams rely on us every day to do their best work.</p><p>Our mission is to empower creators, entrepreneurs, and enterprises alike.</p>", align: "left" })],
  },
  {
    id: "content-two-column",
    name: "Two Columns",
    category: "Content",
    blocks: [b("t", "columns", {
      leftContent: "<h3>Our Approach</h3><p>We believe great products start with deep user understanding. Every feature we ship begins with research, not assumptions.</p>",
      rightContent: "<h3>Our Results</h3><p>100,000+ satisfied users. 99.9% uptime. Award-winning support. And we're just getting started building for what's next.</p>",
      gap: "3rem",
      cols: 2,
    })],
  },
  {
    id: "content-quote",
    name: "Testimonial Quote",
    category: "Content",
    blocks: [b("t", "text", { content: "<blockquote style='border-left:4px solid #2271b1;padding-left:24px;font-size:1.2rem;font-style:italic;color:#374151;margin:0'>&ldquo;This product completely transformed how our team works. We couldn't imagine going back.&rdquo;<br><strong style='font-style:normal;font-size:0.9rem;color:#6b7280;display:block;margin-top:12px'>— Sarah K., Head of Operations at TechCorp</strong></blockquote>", align: "left" })],
  },
  {
    id: "content-wide-image",
    name: "Wide Image",
    category: "Content",
    blocks: [b("t", "image", { src: "", alt: "Featured image", caption: "Add your caption here", align: "center", width: "wide" })],
  },

  // ── CTA ───────────────────────────────────────────────────────────────────────
  {
    id: "cta-bold-blue",
    name: "Bold Blue CTA",
    category: "CTA",
    blocks: [b("t", "cta", { heading: "Ready to Transform Your Business?", text: "Join 10,000+ companies already growing with us.", buttonText: "Start Free Trial", buttonUrl: "#", bgColor: "#2271b1", textColor: "#ffffff" })],
  },
  {
    id: "cta-dark",
    name: "Dark CTA",
    category: "CTA",
    blocks: [b("t", "cta", { heading: "Let's Build Something Great", text: "No contracts. No setup fees. Cancel anytime.", buttonText: "Get Started Today", buttonUrl: "#", bgColor: "#0f172a", textColor: "#f8fafc" })],
  },
  {
    id: "cta-purple",
    name: "Purple CTA",
    category: "CTA",
    blocks: [b("t", "cta", { heading: "Unlock Premium Features", text: "Upgrade your plan and take your project further.", buttonText: "Upgrade Now", buttonUrl: "#", bgColor: "#7c3aed", textColor: "#ffffff" })],
  },
  {
    id: "cta-light",
    name: "Light CTA",
    category: "CTA",
    blocks: [b("t", "cta", { heading: "Start Your Free Trial", text: "No credit card required.", buttonText: "Get Started →", buttonUrl: "#", bgColor: "#f1f5f9", textColor: "#1e293b" })],
  },
  {
    id: "cta-green",
    name: "Green CTA",
    category: "CTA",
    blocks: [b("t", "cta", { heading: "Join Thousands of Happy Teams", text: "Everything you need, right out of the box.", buttonText: "Try It Free", buttonUrl: "#", bgColor: "#064e3b", textColor: "#ecfdf5" })],
  },

  // ── Pricing ───────────────────────────────────────────────────────────────────
  {
    id: "pricing-3tier",
    name: "3-Tier Pricing",
    category: "Pricing",
    blocks: [b("t", "features", {
      heading: "Simple, Transparent Pricing",
      subtext: "Choose the plan that works for your team",
      cols: 3,
      items: [
        { icon: "🌱", title: "Starter — Free", text: "Up to 3 projects · 5 GB storage · Email support · Core features" },
        { icon: "🚀", title: "Pro — $29/mo", text: "Unlimited projects · 50 GB storage · Priority support · Advanced analytics" },
        { icon: "🏢", title: "Enterprise — Custom", text: "Unlimited everything · Dedicated manager · SLA guarantee · Custom integrations" },
      ],
    })],
  },
  {
    id: "pricing-2tier",
    name: "Monthly vs Annual",
    category: "Pricing",
    blocks: [b("t", "features", {
      heading: "Pick Your Plan",
      subtext: "Save 50% when you pay annually",
      cols: 2,
      items: [
        { icon: "◻", title: "Monthly — $19/mo", text: "All core features · Unlimited users · Email & chat support" },
        { icon: "◼", title: "Annual — $9/mo", text: "Save 50% vs monthly · All core features · Priority support · Bonus onboarding" },
      ],
    })],
  },

  // ── Gallery ───────────────────────────────────────────────────────────────────
  {
    id: "gallery-2col",
    name: "Two-Column Gallery",
    category: "Gallery",
    blocks: [b("t", "columns", {
      leftContent: '<div style="background:#e2e8f0;border-radius:8px;height:240px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px">Image 1</div>',
      rightContent: '<div style="background:#e2e8f0;border-radius:8px;height:240px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px">Image 2</div>',
      gap: "1.5rem",
      cols: 2,
    })],
  },
  {
    id: "gallery-image-text",
    name: "Image + Text",
    category: "Gallery",
    blocks: [b("t", "columns", {
      leftContent: '<div style="background:#e2e8f0;border-radius:8px;height:280px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px">Image</div>',
      rightContent: "<h3>Compelling Headline</h3><p>Use this layout to pair an image with descriptive text. Great for showcasing products, case studies, or features with visual context.</p>",
      gap: "2.5rem",
      cols: 2,
    })],
  },

  // ── Form ──────────────────────────────────────────────────────────────────────
  {
    id: "form-contact-section",
    name: "Contact Section",
    category: "Form",
    blocks: [
      b("t1", "text", { content: "<h2 style='text-align:center'>Get In Touch</h2><p style='text-align:center;color:#6c757d;max-width:480px;margin:0 auto'>We'd love to hear from you. Fill out the form and we'll get back to you within 24 hours.</p>", align: "center" }),
      b("t2", "form", { formId: "", formTitle: "Select a form" }),
    ],
  },

  // ── Footer ────────────────────────────────────────────────────────────────────
  {
    id: "footer-minimal",
    name: "Minimal Footer",
    category: "Footer",
    blocks: [
      b("t1", "divider", { style: "solid", color: "#e2e8f0", thickness: 1 }),
      b("t2", "columns", {
        leftContent: "<p style='margin:0;font-weight:700;font-size:14px'>Brand Name</p><p style='margin:4px 0 0;color:#6c757d;font-size:12px'>© 2025 All rights reserved.</p>",
        rightContent: "<p style='margin:0;text-align:right'><a href='#' style='color:#6c757d;font-size:13px;text-decoration:none;margin-left:20px'>Privacy</a><a href='#' style='color:#6c757d;font-size:13px;text-decoration:none;margin-left:20px'>Terms</a><a href='#' style='color:#6c757d;font-size:13px;text-decoration:none;margin-left:20px'>Contact</a></p>",
        gap: "2rem",
        cols: 2,
      }),
    ],
  },
  {
    id: "footer-rich",
    name: "3-Column Footer",
    category: "Footer",
    blocks: [
      b("t1", "divider", { style: "solid", color: "#e2e8f0", thickness: 1 }),
      b("t2", "features", {
        heading: "",
        subtext: "",
        cols: 3,
        items: [
          { icon: "", title: "Company", text: "About Us\nCareers\nBlog\nPress" },
          { icon: "", title: "Product", text: "Features\nPricing\nDocs\nChangelog" },
          { icon: "", title: "Support", text: "Help Center\nContact\nStatus\nCommunity" },
        ],
      }),
      b("t3", "divider", { style: "solid", color: "#e2e8f0", thickness: 1 }),
      b("t4", "columns", {
        leftContent: "<p style='margin:0;color:#6c757d;font-size:12px'>© 2025 Brand Inc. All rights reserved.</p>",
        rightContent: "<p style='margin:0;text-align:right'><a href='#' style='color:#6c757d;font-size:12px;text-decoration:none;margin-left:16px'>Privacy Policy</a><a href='#' style='color:#6c757d;font-size:12px;text-decoration:none;margin-left:16px'>Terms</a></p>",
        gap: "2rem",
        cols: 2,
      }),
    ],
  },
];

// ─── Page Templates ────────────────────────────────────────────────────────────

export const LIBRARY_PAGES: LibraryPage[] = [
  {
    id: "page-saas",
    name: "SaaS Landing",
    industry: "Startup",
    popularity: 98,
    blocks: [
      b("p1", "nav", { logoText: "SaaS Co", align: "right" }),
      b("p2", "hero", { heading: "The Smarter Way to Manage Your Team", subtext: "Automate workflows, track projects, and collaborate in real time.", buttonText: "Start Free Trial", buttonUrl: "#", bgColor: "#0f172a", textColor: "#f8fafc", align: "center", height: 520 }),
      b("p3", "features", { heading: "Everything Your Team Needs", subtext: "Built for speed, security, and scale", cols: 3, items: [{ icon: "⚡", title: "Fast Setup", text: "Up and running in minutes, no IT required." }, { icon: "🔒", title: "Enterprise Security", text: "SOC 2 compliant with end-to-end encryption." }, { icon: "📈", title: "Real-time Analytics", text: "See what's working with live dashboards." }] }),
      b("p4", "cta", { heading: "Ready to 10x Your Productivity?", text: "Join 5,000+ teams already using us.", buttonText: "Get Started Free", buttonUrl: "#", bgColor: "#2271b1", textColor: "#ffffff" }),
    ],
  },
  {
    id: "page-agency",
    name: "Agency Landing",
    industry: "Business",
    popularity: 91,
    blocks: [
      b("p1", "nav", { logoText: "Studio", align: "right" }),
      b("p2", "hero", { heading: "We Design Digital Experiences", subtext: "Award-winning design studio crafting brands that stand out.", buttonText: "See Our Work", buttonUrl: "#", bgColor: "#1a1a2e", textColor: "#ffffff", align: "left", height: 500 }),
      b("p3", "features", { heading: "Our Services", subtext: "", cols: 3, items: [{ icon: "🎨", title: "Brand Identity", text: "Logos, guidelines, and visual systems." }, { icon: "💻", title: "Web Design", text: "Beautiful, fast websites that convert." }, { icon: "📱", title: "Digital Marketing", text: "SEO, ads, and content that drives growth." }] }),
      b("p4", "text", { content: "<h2>Our Process</h2><p>Every project starts with a discovery session. We learn your goals, your audience, and your competitive landscape. Then we craft a tailored strategy and execute with precision.</p>", align: "left" }),
      b("p5", "cta", { heading: "Let's Work Together", text: "Ready to elevate your brand?", buttonText: "Get a Free Quote", buttonUrl: "#", bgColor: "#7c3aed", textColor: "#ffffff" }),
    ],
  },
  {
    id: "page-portfolio",
    name: "Portfolio",
    industry: "Portfolio",
    popularity: 87,
    blocks: [
      b("p1", "nav", { logoText: "John Doe", align: "right" }),
      b("p2", "hero", { heading: "I Build Websites That Sell", subtext: "Freelance developer & designer with 8 years of experience.", buttonText: "View My Work", buttonUrl: "#", bgColor: "#f8fafc", textColor: "#1d2327", align: "center", height: 420 }),
      b("p3", "features", { heading: "What I Do", subtext: "", cols: 3, items: [{ icon: "⚛", title: "React & Next.js", text: "Modern frontend with the React ecosystem." }, { icon: "🎨", title: "UI/UX Design", text: "From wireframes to pixel-perfect builds." }, { icon: "☁", title: "Cloud & DevOps", text: "AWS, Vercel, CI/CD pipelines and more." }] }),
      b("p4", "cta", { heading: "Let's Build Something Together", text: "Available for freelance projects.", buttonText: "Get In Touch", buttonUrl: "#", bgColor: "#0f172a", textColor: "#f8fafc" }),
    ],
  },
  {
    id: "page-startup",
    name: "Startup / AI",
    industry: "Startup",
    popularity: 95,
    blocks: [
      b("p1", "nav", { logoText: "StartupAI", align: "right" }),
      b("p2", "hero", { heading: "AI That Actually Works", subtext: "Stop wasting time on manual tasks. Let AI handle the heavy lifting.", buttonText: "Start for Free", buttonUrl: "#", bgColor: "#4c1d95", textColor: "#f5f3ff", align: "center", height: 540 }),
      b("p3", "features", { heading: "Trusted by 10,000+ Teams", subtext: "Here's what makes us different", cols: 3, items: [{ icon: "🤖", title: "Smart Automation", text: "AI that learns your workflow over time." }, { icon: "⚡", title: "Instant Results", text: "See ROI in the first 7 days or your money back." }, { icon: "🔗", title: "100+ Integrations", text: "Works with your existing tools out of the box." }] }),
      b("p4", "cta", { heading: "Start Your Free 14-Day Trial", text: "No credit card required. No commitments.", buttonText: "Sign Up Free", buttonUrl: "#", bgColor: "#7c3aed", textColor: "#ffffff" }),
    ],
  },
  {
    id: "page-restaurant",
    name: "Restaurant",
    industry: "Restaurant",
    popularity: 82,
    blocks: [
      b("p1", "nav", { logoText: "La Cucina", align: "right" }),
      b("p2", "hero", { heading: "A Taste of Italy in Every Bite", subtext: "Fresh ingredients, traditional recipes, unforgettable evenings.", buttonText: "Reserve a Table", buttonUrl: "#", bgColor: "#1c0a00", textColor: "#fff8f0", align: "center", height: 560 }),
      b("p3", "features", { heading: "Why Our Guests Love Us", subtext: "", cols: 3, items: [{ icon: "🍝", title: "Authentic Recipes", text: "Passed down through three generations of chefs." }, { icon: "🌿", title: "Seasonal Ingredients", text: "We source fresh, local ingredients every morning." }, { icon: "🍷", title: "Curated Wine List", text: "Over 120 wines from the finest Italian regions." }] }),
      b("p4", "text", { content: "<h2 style='text-align:center'>Our Hours</h2><p style='text-align:center'>Monday – Thursday: 5pm – 10pm<br>Friday – Saturday: 5pm – 11pm<br>Sunday: 4pm – 9pm</p>", align: "center" }),
      b("p5", "cta", { heading: "Book Your Table Tonight", text: "Walk-ins welcome. Reservations recommended.", buttonText: "Make a Reservation", buttonUrl: "#", bgColor: "#7c2d12", textColor: "#fff8f0" }),
    ],
  },
  {
    id: "page-about",
    name: "About Us",
    industry: "Business",
    popularity: 79,
    blocks: [
      b("p1", "hero", { heading: "Our Story", subtext: "How we went from a small idea to a global product.", buttonText: "", buttonUrl: "#", bgColor: "#f1f5f9", textColor: "#1e293b", align: "center", height: 320 }),
      b("p2", "text", { content: "<h2>How It All Started</h2><p>In 2018, our founder was frustrated with the tools available. They were either too complex or too limited. So we built something better.</p><p>Today, we serve over 50,000 users across 80 countries — and we're just getting started.</p>", align: "left" }),
      b("p3", "features", { heading: "Our Values", subtext: "", cols: 3, items: [{ icon: "❤", title: "Customer First", text: "Every decision starts with our users in mind." }, { icon: "🌱", title: "Sustainability", text: "Building for the long-term, not just growth." }, { icon: "🤝", title: "Transparency", text: "Open about what we're building and why." }] }),
      b("p4", "cta", { heading: "Join Our Journey", text: "We're hiring across engineering, design, and marketing.", buttonText: "See Open Roles", buttonUrl: "#", bgColor: "#2271b1", textColor: "#ffffff" }),
    ],
  },
  {
    id: "page-contact",
    name: "Contact Page",
    industry: "Business",
    popularity: 72,
    blocks: [
      b("p1", "hero", { heading: "Get In Touch", subtext: "Our team typically responds within 24 hours.", buttonText: "", buttonUrl: "#", bgColor: "#f8fafc", textColor: "#1d2327", align: "center", height: 300 }),
      b("p2", "columns", { leftContent: "<h3>Our Office</h3><p>123 Main Street<br>San Francisco, CA 94105</p><h3 style='margin-top:24px'>Email</h3><p>hello@company.com</p><h3 style='margin-top:24px'>Phone</h3><p>+1 (555) 000-0000</p>", rightContent: "<h3>Send a Message</h3><p style='color:#6c757d'>We'd love to hear from you.</p>", gap: "3rem", cols: 2 }),
    ],
  },
  {
    id: "page-product-launch",
    name: "Product Launch",
    industry: "Startup",
    popularity: 88,
    blocks: [
      b("p1", "hero", { heading: "Introducing Our Newest Product", subtext: "The tool you've been waiting for. Designed for the way you work.", buttonText: "Join the Waitlist", buttonUrl: "#", bgColor: "#0f172a", textColor: "#f8fafc", align: "center", height: 480 }),
      b("p2", "features", { heading: "Built for Modern Teams", subtext: "Launch faster. Scale easier. Grow smarter.", cols: 3, items: [{ icon: "🚀", title: "Ship Faster", text: "From prototype to production in record time." }, { icon: "📊", title: "Data Driven", text: "Every feature backed by real user data." }, { icon: "🛡", title: "Rock Solid", text: "99.99% uptime with 24/7 monitoring." }] }),
      b("p3", "text", { content: "<blockquote style='border-left:4px solid #2271b1;padding-left:20px;font-size:1.2rem;font-style:italic;color:#475569'>&ldquo;This product saved our team 15 hours per week. It's a game-changer.&rdquo;<br><strong style='font-style:normal;font-size:0.9rem'>— Sarah K., Head of Operations</strong></blockquote>", align: "left" }),
      b("p4", "cta", { heading: "Be First in Line", text: "Early access opens soon. Secure your spot today.", buttonText: "Join the Waitlist →", buttonUrl: "#", bgColor: "#0f172a", textColor: "#f8fafc" }),
    ],
  },
  {
    id: "page-blog-home",
    name: "Blog / Article",
    industry: "Content",
    popularity: 65,
    blocks: [
      b("p1", "hero", { heading: "The Future of Web Development", subtext: "May 18, 2025 · 8 min read", buttonText: "", buttonUrl: "#", bgColor: "#1d2327", textColor: "#f8fafc", align: "center", height: 320 }),
      b("p2", "text", { content: "<p style='font-size:1.1rem;line-height:1.9'>The web development landscape is evolving faster than ever. With AI-powered tools, new frameworks, and changing user expectations, developers need to stay ahead of the curve.</p><h2>The Rise of AI-Assisted Development</h2><p>From GitHub Copilot to Claude Code, AI assistants are changing how developers write code. What used to take hours now takes minutes.</p>", align: "left" }),
      b("p3", "cta", { heading: "Enjoyed This Article?", text: "Subscribe for more insights every week.", buttonText: "Subscribe →", buttonUrl: "#", bgColor: "#f1f5f9", textColor: "#1e293b" }),
    ],
  },
  {
    id: "page-law-firm",
    name: "Law Firm",
    industry: "Professional",
    popularity: 61,
    blocks: [
      b("p1", "nav", { logoText: "Smith & Associates", align: "right" }),
      b("p2", "hero", { heading: "Trusted Legal Counsel Since 1985", subtext: "Protecting your rights and interests with decades of proven experience.", buttonText: "Schedule a Consultation", buttonUrl: "#", bgColor: "#1e3a5f", textColor: "#f0f9ff", align: "center", height: 480 }),
      b("p3", "features", { heading: "Our Practice Areas", subtext: "", cols: 3, items: [{ icon: "⚖", title: "Corporate Law", text: "Business formation, contracts, and compliance." }, { icon: "🏠", title: "Real Estate", text: "Residential and commercial property law." }, { icon: "👨‍👩‍👦", title: "Family Law", text: "Divorce, custody, and estate planning." }] }),
      b("p4", "cta", { heading: "Ready to Protect What Matters?", text: "Free initial consultation for new clients.", buttonText: "Book a Free Consultation", buttonUrl: "#", bgColor: "#1e3a5f", textColor: "#f0f9ff" }),
    ],
  },
  {
    id: "page-photography",
    name: "Photographer",
    industry: "Portfolio",
    popularity: 76,
    blocks: [
      b("p1", "nav", { logoText: "Jane Doe Photography", align: "right" }),
      b("p2", "hero", { heading: "Stories in Light & Shadow", subtext: "Documentary photographer capturing moments that matter.", buttonText: "View Portfolio", buttonUrl: "#", bgColor: "#0f0f0f", textColor: "#fafafa", align: "center", height: 540 }),
      b("p3", "columns", { leftContent: '<div style="background:#e2e8f0;border-radius:4px;height:280px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px">Portrait Work</div>', rightContent: '<div style="background:#e2e8f0;border-radius:4px;height:280px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px">Landscape Work</div>', gap: "1rem", cols: 2 }),
      b("p4", "cta", { heading: "Let's Create Together", text: "Available for editorial, commercial, and private commissions.", buttonText: "Get In Touch", buttonUrl: "#", bgColor: "#0f0f0f", textColor: "#fafafa" }),
    ],
  },
  {
    id: "page-fitness",
    name: "Online Training",
    industry: "Health & Fitness",
    popularity: 84,
    blocks: [
      b("p1", "hero", { heading: "Become the Best Version of Yourself", subtext: "Expert-designed programs for every level. Real results. No excuses.", buttonText: "Start Your Journey", buttonUrl: "#", bgColor: "#14532d", textColor: "#f0fdf4", align: "center", height: 520 }),
      b("p2", "features", { heading: "What You Get", subtext: "Everything you need to transform your body and mind", cols: 3, items: [{ icon: "💪", title: "Custom Programs", text: "Plans built around your goals, schedule, and fitness level." }, { icon: "🥗", title: "Nutrition Guides", text: "Meal plans and recipes from certified nutritionists." }, { icon: "📱", title: "App Access", text: "Track workouts, progress, and habits on any device." }] }),
      b("p3", "cta", { heading: "Start Your Free 7-Day Trial", text: "No equipment needed. Cancel anytime.", buttonText: "Get Started Free", buttonUrl: "#", bgColor: "#14532d", textColor: "#f0fdf4" }),
    ],
  },
];
