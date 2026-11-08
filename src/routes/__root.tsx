import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CommandPalette } from "../components/CommandPalette.tsx";
import { PopoverHost } from "../components/Popover.tsx";
import { Toast } from "../components/Toast.tsx";
import { PAPER } from "../components/ui.tsx";
import appCss from "../styles.css?url";

const TITLE = "Benjamin Pick — Software Engineer, Sydney";
const DESCRIPTION =
  "Software engineer with a holistic knowledge of engineering, AI and design. Senior SWE at Thanks, ex-Staff SWE at CommBank, building Nooks.";

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
      { property: "og:image", content: "/og.png" },
      { name: "twitter:card", content: "summary_large_image" },
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
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
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
  return (
    <RootDocument>
      <Outlet />
      <PopoverHost />
      <CommandPalette />
      <Toast />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        style={PAPER}
        className="m-0 bg-cream font-mono text-[13px] text-ink antialiased"
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
