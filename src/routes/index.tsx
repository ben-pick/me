import { createFileRoute } from "@tanstack/react-router";
import { site } from "../content/index.ts";
import { pageHead } from "../lib/seo.ts";
import { Home } from "../pages/Home.tsx";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(site, {
      path: "/",
      title: site.seo.title,
      description: site.seo.description,
    }),
  component: Home,
});
