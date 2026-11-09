import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // Page changes cross-fade, but a hash-only change doesn't: opening or
    // closing a popover writes `#company/…` to the URL, and a view
    // transition there snapshots the whole page, so the sticky nav flickered.
    defaultViewTransition: {
      types: ({ pathChanged }) => (pathChanged ? [] : false),
    },
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
