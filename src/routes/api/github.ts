import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

interface GithubEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: {
    commits?: Array<{ message: string }>;
    ref_type?: string;
    action?: string;
  };
}

const TTL = 600;

const summarise = (e: GithubEvent) => {
  switch (e.type) {
    case "PushEvent": {
      const n = e.payload.commits?.length ?? 0;
      const msg = e.payload.commits?.at(-1)?.message.split("\n")[0] ?? "";
      return `pushed ${n} commit${n === 1 ? "" : "s"}${msg ? ` — ${msg}` : ""}`;
    }
    case "CreateEvent":
      return `created ${e.payload.ref_type ?? "ref"}`;
    case "PullRequestEvent":
      return `${e.payload.action ?? "updated"} a pull request`;
    case "WatchEvent":
      return "starred";
    case "ReleaseEvent":
      return "published a release";
    default:
      return e.type.replace(/Event$/, "").toLowerCase();
  }
};

/** Public GitHub activity, cached at the edge for ten minutes. */
export const Route = createFileRoute("/api/github")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cache = (caches as unknown as { default: Cache }).default;
        const key = new Request(new URL("/api/github", request.url).toString());
        const hit = await cache.match(key);
        if (hit) return hit;

        const user = env.GITHUB_USER;
        const headers: Record<string, string> = {
          accept: "application/vnd.github+json",
          "user-agent": "ben-pick-portfolio",
        };
        const token = (env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN;
        if (token) headers.authorization = `Bearer ${token}`;

        const res = await fetch(
          `https://api.github.com/users/${user}/events/public?per_page=30`,
          { headers },
        );
        if (!res.ok) {
          return Response.json(
            { events: [], error: res.status },
            { status: 502 },
          );
        }
        const events = ((await res.json()) as GithubEvent[])
          .slice(0, 6)
          .map((e) => ({
            repo: e.repo.name.replace(`${user}/`, ""),
            type: e.type,
            when: e.created_at,
            summary: summarise(e),
          }));
        const out = Response.json(
          { events },
          {
            headers: {
              "cache-control": `public, max-age=${TTL}, s-maxage=${TTL}`,
            },
          },
        );
        await cache.put(key, out.clone());
        return out;
      },
    },
  },
});
