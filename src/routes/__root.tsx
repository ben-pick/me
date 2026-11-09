import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BOOT_KEY, Boot } from "../components/Boot.tsx";
import { CommandPalette } from "../components/CommandPalette.tsx";
import { PopoverHost } from "../components/Popover.tsx";
import { Toast } from "../components/Toast.tsx";
import { PAPER } from "../components/ui.tsx";
import { site } from "../content/index.ts";
import { useScrollLockKeys } from "../lib/scroll-lock.ts";
import { absoluteUrl } from "../lib/seo.ts";
import overlayCss from "../overlay.css?url";
import appCss from "../styles.css?url";

const TITLE = site.seo.title;
const DESCRIPTION = site.seo.description;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: "#ece5e1" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: absoluteUrl(site, "/og.png") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        // Before first paint: skip the boot panel on repeat visits or with reduced motion.
        children: `try{if(sessionStorage.getItem("${BOOT_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.booted="1"}catch(e){document.documentElement.dataset.booted="1"}`,
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&family=JetBrains+Mono:wght@300;400;500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: overlayCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <main className="mx-auto flex min-h-dvh max-w-[1216px] flex-col justify-center gap-6 px-8">
      <h1 className="m-0 font-display text-[clamp(56px,10vw,120px)] uppercase leading-[0.86] tracking-[-0.02em]">
        404
      </h1>
      <a href="/" className="text-[12px] uppercase">
        ← Back to the index
      </a>
    </main>
  ),
});

function RootComponent() {
  useScrollLockKeys();
  return (
    <RootDocument>
      <Outlet />
      <Boot />
      <PopoverHost />
      <CommandPalette />
      <Toast />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // The inline boot script marks <html> before hydration.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      {/*
        Radix's modal scroll lock sets `overflow: hidden` on <body> while a
        popover or the palette is open, plus a margin standing in for the
        scrollbar it hides. Toggling those moves the page's scroll container
        and re-lays out the page, which made the sticky nav flicker (shown,
        gone, shown) in Safari and changed the layout on every open and close.
        The lock already blocks wheel and touch scrolling outside the dialog,
        and focus stays inside it, so the page keeps its own overflow and
        scrollbar and nothing moves.
      */}
      <body
        style={PAPER}
        className="m-0 bg-cream font-mono text-[13px] text-ink antialiased [&[data-scroll-locked]]:!mr-0 [&[data-scroll-locked]]:!overflow-visible"
      >
        <a
          href="#main"
          className="fixed top-2 left-2 z-[70] -translate-y-16 bg-ink px-3 py-2 text-[12px] uppercase text-cream transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
