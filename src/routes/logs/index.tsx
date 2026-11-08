import { createFileRoute } from "@tanstack/react-router";
import { LogsIndex } from "../../pages/LogsIndex.tsx";

export const Route = createFileRoute("/logs/")({
  head: () => ({ meta: [{ title: "Logs — Benjamin Pick" }] }),
  component: LogsIndex,
});
