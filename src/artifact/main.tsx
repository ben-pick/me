/**
 * Static, client-only build of the site for hosting as a claude.ai artifact.
 * Same components and content as the Worker build; routing lives in memory
 * because the artifact frame can't use path-based URLs.
 */
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  notFound,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BOOT_KEY, Boot } from "../components/Boot.tsx";
import { CommandPalette } from "../components/CommandPalette.tsx";
import { CompanyPreview } from "../components/CompanyPreview.tsx";
import { PopoverHost } from "../components/Popover.tsx";
import { Toast } from "../components/Toast.tsx";
import { PAPER } from "../components/ui.tsx";
import { logBySlug } from "../content/index.ts";
import { Home } from "../pages/Home.tsx";
import { LogPage } from "../pages/LogPage.tsx";
import { LogsIndex } from "../pages/LogsIndex.tsx";
import "../styles.css";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Boot />
      <CompanyPreview />
      <PopoverHost />
      <CommandPalette />
      <Toast />
    </>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});
const logsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logs/",
  component: LogsIndex,
});
const logRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logs/$slug",
  loader: ({ params }) => {
    const post = logBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  component: function LogRouteView() {
    return <LogPage log={logRoute.useLoaderData()} />;
  },
});

const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, logsRoute, logRoute]),
  history: createMemoryHistory({ initialEntries: ["/"] }),
  defaultViewTransition: true,
  scrollRestoration: true,
});

try {
  if (
    sessionStorage.getItem(BOOT_KEY) ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    document.documentElement.dataset.booted = "1";
} catch {
  document.documentElement.dataset.booted = "1";
}
Object.assign(document.body.style, PAPER);
document.body.className =
  "m-0 bg-cream font-mono text-[13px] text-ink antialiased";

const el = document.getElementById("app");
if (el) {
  createRoot(el).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
