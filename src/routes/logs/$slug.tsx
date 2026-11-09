import { createFileRoute, notFound } from "@tanstack/react-router";
import { logBySlug, site } from "../../content/index.ts";
import { logPath, pageHead } from "../../lib/seo.ts";
import { LogPage } from "../../pages/LogPage.tsx";

export const Route = createFileRoute("/logs/$slug")({
  loader: ({ params }) => {
    const post = logBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) =>
    loaderData
      ? pageHead(site, {
          path: logPath(loaderData.slug),
          title: `${loaderData.title} — ${site.name.first} ${site.name.last}`,
          description: loaderData.summary,
          published: loaderData.date,
        })
      : {},
  component: function LogRoute() {
    return <LogPage log={Route.useLoaderData()} />;
  },
});
