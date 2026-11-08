import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { site } from "../../content/index.ts";
import {
  fromGraphql,
  parseContributionsHtml,
} from "../../lib/contributions.ts";

const TTL = 60 * 60 * 6;

interface GraphqlCalendar {
  data?: {
    user?: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: Array<{
            contributionDays: Array<{
              date: string;
              contributionCount: number;
            }>;
          }>;
        };
      };
    };
  };
}

const viaGraphql = async (user: string, token: string) => {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "ben-pick-portfolio",
    },
    body: JSON.stringify({
      query:
        "query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}",
      variables: { login: user },
    }),
  });
  if (!res.ok) throw new Error(`GraphQL ${res.status}`);
  const cal = ((await res.json()) as GraphqlCalendar).data?.user
    ?.contributionsCollection.contributionCalendar;
  if (!cal) throw new Error("No calendar");
  return fromGraphql(user, cal.weeks, cal.totalContributions);
};

const viaPublicPage = async (user: string) => {
  const res = await fetch(`https://github.com/users/${user}/contributions`, {
    headers: { "user-agent": "ben-pick-portfolio", accept: "text/html" },
  });
  if (!res.ok) throw new Error(`Calendar ${res.status}`);
  return parseContributionsHtml(user, await res.text());
};

/** The last year of GitHub contributions, cached at the edge for six hours. */
export const Route = createFileRoute("/api/contributions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cache = (caches as unknown as { default: Cache }).default;
        const key = new Request(
          new URL("/api/contributions", request.url).toString(),
        );
        const hit = await cache.match(key);
        if (hit) return hit;
        const user = site.github.user;
        const token = (env as { GITHUB_TOKEN?: string }).GITHUB_TOKEN;
        try {
          const data = token
            ? await viaGraphql(user, token)
            : await viaPublicPage(user);
          const out = Response.json(data, {
            headers: {
              "cache-control": `public, max-age=${TTL}, s-maxage=${TTL}`,
            },
          });
          await cache.put(key, out.clone());
          return out;
        } catch (error) {
          return Response.json({ error: String(error) }, { status: 502 });
        }
      },
    },
  },
});
