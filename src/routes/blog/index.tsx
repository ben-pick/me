import { createFileRoute } from "@tanstack/react-router";
import { BlogIndex } from "../../pages/BlogIndex.tsx";

export const Route = createFileRoute("/blog/")({
  head: () => ({ meta: [{ title: "Blog — Benjamin Pick" }] }),
  component: BlogIndex,
});
