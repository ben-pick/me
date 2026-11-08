import { createFileRoute } from "@tanstack/react-router";
import { site } from "../../content/index.ts";
import { LogsIndex } from "../../pages/LogsIndex.tsx";

export const Route = createFileRoute("/logs/")({
  head: () => ({
    meta: [
      {
        title: `${site.sections.logs.title} — ${site.name.first} ${site.name.last}`,
      },
    ],
  }),
  component: LogsIndex,
});
