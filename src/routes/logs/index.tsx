import { createFileRoute } from "@tanstack/react-router";
import { site } from "../../content/index.ts";
import { pageHead } from "../../lib/seo.ts";
import { LogsIndex } from "../../pages/LogsIndex.tsx";

export const Route = createFileRoute("/logs/")({
  head: () =>
    pageHead(site, {
      path: "/logs",
      title: `${site.sections.logs.title} — ${site.name.first} ${site.name.last}`,
      description: site.seo.logsDescription,
    }),
  component: LogsIndex,
});
