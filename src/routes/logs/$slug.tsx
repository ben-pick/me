import { createFileRoute, notFound } from "@tanstack/react-router";
import { logBySlug } from "../../content/index.ts";
import { LogPage } from "../../pages/LogPage.tsx";

export const Route = createFileRoute("/logs/$slug")({
  loader: ({ params }) => {
    const post = logBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Benjamin Pick` },
          { name: "description", content: loaderData.summary },
          { property: "og:title", content: loaderData.title },
        ]
      : [],
  }),
  component: function LogRoute() {
    return <LogPage log={Route.useLoaderData()} />;
  },
});
