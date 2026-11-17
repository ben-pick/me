---
slug: loaders-not-boundaries
title: Loaders, not boundaries
date: 2026-11-17
summary: What changed when I moved from the Next.js App Router to TanStack Start, and why the loader is the part I'd keep.
diagram: site
draft: true
---

I'm used to the Next.js App Router. This site and [REDACTED] both run on TanStack Start, and the biggest difference is a question I no longer have to ask. In the App Router every file raises it: which side of the boundary is this on? In Start the question is what a route needs before it renders, and the answer goes in one function.

## The loader

Here is the whole route for the page you're reading:

```tsx
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
        })
      : {},
  component: function LogRoute() {
    return <LogPage log={Route.useLoaderData()} />;
  },
});
```

It looks simple, and the simplicity comes from a few decisions underneath it.

**The data is ready before the component exists.** The router matches the URL, runs the loader, then renders. Components never fetch, so a component tree can't build a waterfall where a parent renders, fetches, then a child renders and fetches again. When a URL matches several nested routes, their loaders all start at the same time.

**It's typed from end to end.** `params.slug` is typed because the file is named `$slug.tsx`. `useLoaderData()` returns whatever the loader returned, with no generic to write and nothing to cast. Change the loader and every use of its data that no longer fits stops compiling.

**The page's metadata reads the same data.** `head` receives `loaderData`, so the title and description come from the post the loader already found. The App Router's equivalent is `generateMetadata`, a separate function that runs its own lookup. Next deduplicates `fetch` calls between the two, but a database query or a file read needs wrapping in React's `cache()` to avoid running twice. Here there is only one lookup to begin with.

**A missing page is a thrown value.** `throw notFound()` stops the loader and the router renders the nearest `notFoundComponent`. The component only ever receives a post that exists, so it has no empty case to handle.

### Server first, client after

The loader is not server code, and that turned out to be the best thing about it. It runs on the server for the first request, and in the browser on every navigation after that. That's the opposite of the App Router, where a server component's `async` body never reaches the browser.

I write one function and get both behaviours for free. A first visit, or a search engine, gets complete HTML with the data already in it, and the loader's result is serialized into the page so hydration doesn't fetch it again. From then on the app behaves like a single-page app: the router runs the loader in the browser, swaps the data and re-renders only the routes that changed. Nothing in the route says which mode it's in. The App Router gets a similar result by rendering server components on the server for every navigation and streaming the result to the client. Start's version is simpler: after the first page, the server only does what the browser can't.

That changes how the loader above behaves. Posts on this site are parsed at build time and bundled as JSON, so `logBySlug` is an array lookup available on both sides. Clicking a log makes no network request at all. The router also preloads on intent:

```tsx
createRouter({ routeTree, defaultPreload: "intent" });
```

Hovering a link runs its loader, so by the time you click, the data is already in the router's cache. On a site this small, page changes take as long as the cross-fade.

It also means a loader that reads a database, a secret or `env` would try to do that in the browser on the second navigation. That's what server functions are for.

## Moving the boundary

The App Router puts the client/server boundary in the component tree. `"use client"` marks a file as a door, and everything it imports comes through to the client side with it. Props crossing that door must be serializable, so you can't pass a callback from a server component to a client one. A context provider needs its own client wrapper file. A component library that uses `useState` anywhere needs `"use client"` somewhere above it. None of this is hard on its own, but it's a question every file has to answer, and the error for a wrong answer can appear some distance from the file that caused it.

Start has no boundary in the tree. Every component renders on the server for the first request and hydrates in the browser, as React apps did before server components. The boundary moves to a function call:

```ts
import { createServerFn } from "@tanstack/react-start";

export const getContributions = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = env.GITHUB_TOKEN; // only ever read on the server
    return fetchCalendar(site.github.user, token);
  },
);
```

```tsx
export const Route = createFileRoute("/")({
  loader: () => getContributions(),
  component: Home,
});
```

At build time Start's compiler splits that function. The server bundle keeps the handler. The client bundle gets a stub with the same signature that sends a request to an endpoint Start generates. During the first server render the loader calls the handler directly. After that, a navigation in the browser calls the stub, the stub makes the request, and the result comes back with the types intact.

The boundary didn't disappear. It moved to a place where it has a name, an input and a return type, and where I can see it in an import. A rendering concern became a data concern: components describe what the page looks like, and the server is just where some of the data comes from.

### Why I don't miss server actions

I never got along with Next's server actions. A `"use server"` function can be passed to a form, called from an event handler or imported into a client component. It becomes a POST endpoint I never declared, and its URL is an id the build makes up. Next runs them one at a time per client, so they're the wrong tool for reads, but nothing stops you using them for reads. After a write you call `revalidatePath` or `revalidateTag` inside the action, and which cached pages that refreshes depends on which of Next's several caches the page is sitting in. A single function writes data, decides what goes stale and has a network call hidden inside it, and none of that shows at the call site.

Start splits those jobs between two things. Reads go in loaders. Writes are server functions you call yourself, and afterwards you tell the router its data is out of date:

```tsx
const publishLog = createServerFn({ method: "POST" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    await db.logs.publish(slug);
  });

function PublishButton({ slug }: { slug: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await publishLog({ data: slug });
        await router.invalidate(); // rerun the loaders for this page
      }}
    >
      Publish
    </button>
  );
}
```

`router.invalidate()` marks every loaded route stale and reruns the loaders for the page on screen, in the browser, using the same functions that ran on the server for the first load. Nothing gets revalidated by path or tag on the server, because there's no server cache of the page to revalidate. The rule this forces on you is that a loader is the only place a route reads data. So after any write, "refresh the page's data" has one meaning, and it's one line.

### What it costs

Three trade-offs come with this, and they're worth knowing before you choose it.

**Every component ships to the browser.** Server components can render a heavy Markdown parser or syntax highlighter on the server and send only the HTML. In Start, whatever a component imports goes into the bundle. This site gets around that by parsing Markdown in a Vite plugin at build time, so the parser never reaches a route at all. Without that option, the extra JavaScript is a cost to plan for.

**A server function is a public endpoint.** Anyone can call the URL the compiler generates, with any input. Start lets you attach a validator, and it should be treated as required whenever the function takes input. Next's server actions have the same property, but Start's look like ordinary function calls and make it easier to forget.

**The bug changes shape.** In the App Router the common mistake was a hook in a file without `"use client"`. In Start it's importing a server-only module into code that runs on both sides, a loader being the usual place. Start has `createServerOnlyFn` and `createClientOnlyFn` to make that fail loudly instead of quietly shipping something.

### Not blocking the page

The home page's GitHub activity graph still fetches in an effect, because putting `getContributions()` in the loader as written would hold the whole page until GitHub answered. A loader can return a promise without awaiting it, and the router streams it in when it settles:

```tsx
loader: () => ({ contributions: getContributions() }),

function ActivityGraph() {
  const { contributions } = Route.useLoaderData();
  return (
    <Await promise={contributions} fallback={<GraphSkeleton />}>
      {(data) => <Graph data={data} />}
    </Await>
  );
}
```

The page renders immediately, the fallback holds the graph's place, and the data arrives in the same response. `<Await>` is a Suspense boundary and a render prop in one, so the loading state sits next to the data it's waiting for. React 19's `use(contributions)` does the same job, but it needs a `<Suspense>` placed somewhere above the component, and in a snippet that boundary is easy to leave out. It's the same idea as streaming server components, with the slow part expressed as a promise in the data instead of as a component.

## Other things Start fixed

<!-- Pick the ones you want and delete the rest. Each stands alone. -->

**Links can't point at pages that don't exist.** The router generates a route tree from the files, so `<Link to="/logs/$slug" params={{ slug }}>` is checked at compile time. Rename a route and every link to it fails `tsc`. The App Router takes an `href` string, and its typed-routes option only checks the path, not the params a route needs.

**Search params are typed state.** A route declares its search params with `validateSearch`, and `useSearch()` returns the parsed result. Add `loaderDeps` and the loader reruns when they change:

```tsx
export const Route = createFileRoute("/logs/")({
  validateSearch: (search: Record<string, unknown>) => ({
    project: typeof search.project === "string" ? search.project : undefined,
  }),
  loaderDeps: ({ search }) => ({ project: search.project }),
  loader: ({ deps }) =>
    deps.project ? logsForProject(deps.project) : content.logs,
});
```

In the App Router, `useSearchParams()` returns strings for you to parse, and reading it in a statically rendered page needs a Suspense boundary or the build fails. URL state is the most shareable state an app has, and Start treats it like the rest of its state.

**I can see the cache.** The App Router has four caches: request memoization, the data cache, the full route cache and the client router cache. Their defaults changed between Next 14 and 15, and whether a page ends up static or dynamic depends on what it happens to call. Start has one cache, in the browser, keyed by route, params and `loaderDeps`. Revisit a route and you get the cached data immediately while the loader refreshes it in the background. `staleTime` on the route sets how long it counts as fresh. Server-side caching is left to you, with HTTP. This site's `/api/contributions` route caches GitHub's response at the Cloudflare edge for six hours with `caches.default` and a `cache-control` header. It's more to write, and it's all visible in one file.

**It's just Vite.** Start is a Vite plugin, so anything Vite runs works. This site's content pipeline is a forty-line Vite plugin that exposes the Markdown as a virtual module. Cloudflare's Vite plugin runs the dev server inside `workerd`, the same runtime as production, so `env` bindings and `caches` behave the same locally as they do deployed. With the App Router, the build and its deployment are shaped around Vercel, and other hosts depend on adapters.

**Server routes sit beside pages.** `/sitemap.xml` is a file in `routes/` with a `GET` handler that returns a `Response`. It uses the same file routing and the same content imports as the pages. The App Router has `route.ts` for this too, so it's less a fix than parity, but it means one routing model for both.
