import { createFileRoute, notFound } from "@tanstack/react-router";
import { postBySlug } from "../../content/index.ts";
import { PostPage } from "../../pages/PostPage.tsx";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
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
  component: function PostRoute() {
    return <PostPage post={Route.useLoaderData()} />;
  },
});
