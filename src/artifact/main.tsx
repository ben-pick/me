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
import { CommandPalette } from "../components/CommandPalette.tsx";
import { PopoverHost } from "../components/Popover.tsx";
import { Toast } from "../components/Toast.tsx";
import { PAPER } from "../components/ui.tsx";
import { postBySlug } from "../content/index.ts";
import { BlogIndex } from "../pages/BlogIndex.tsx";
import { Home } from "../pages/Home.tsx";
import { PostPage } from "../pages/PostPage.tsx";
import "../styles.css";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
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
const blogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/blog/",
  component: BlogIndex,
});
const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/blog/$slug",
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  component: function PostRouteView() {
    return <PostPage post={postRoute.useLoaderData()} />;
  },
});

const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute, blogRoute, postRoute]),
  history: createMemoryHistory({ initialEntries: ["/"] }),
  defaultViewTransition: true,
  scrollRestoration: true,
});

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
