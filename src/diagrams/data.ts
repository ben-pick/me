import type { DiagramId } from "./ids.ts";

export type NodeKind =
  | "client"
  | "service"
  | "object"
  | "store"
  | "external"
  | "sandbox";

export type Vec3 = readonly [number, number, number];

export interface DiagramNode {
  readonly id: string;
  readonly label: string;
  readonly kind: NodeKind;
  /** The technology behind this part. */
  readonly tech: string;
  readonly detail: string;
  readonly at: Vec3;
}

export interface Step {
  readonly from: string;
  readonly to: string;
  readonly note: string;
  /** The request stops partway and never arrives. */
  readonly blocked?: boolean;
}

export interface Flow {
  readonly id: string;
  readonly label: string;
  readonly steps: ReadonlyArray<Step>;
}

export interface Diagram {
  readonly title: string;
  readonly caption: string;
  /** The part selected before the reader touches anything. */
  readonly initial: string;
  /** A wall of dots at this x, naming what sits on each side. */
  readonly boundary: {
    readonly x: number;
    readonly left: string;
    readonly right: string;
  };
  readonly nodes: ReadonlyArray<DiagramNode>;
  readonly edges: ReadonlyArray<readonly [string, string]>;
  readonly flows: ReadonlyArray<Flow>;
}

const architecture: Diagram = {
  title: "Architecture so far",
  caption:
    "Trusted code on the left, model-written code on the right. Drag to rotate, pick a part, or play a flow.",
  initial: "isolate",
  boundary: { x: 0, left: "App origin", right: "Sandbox origin" },
  nodes: [
    {
      id: "builder",
      label: "Builder browser",
      kind: "client",
      tech: "React 19",
      detail:
        "Signs in, then holds one WebSocket per application for chat. Generated code never runs on this origin.",
      at: [-2.6, 1.75, 0.2],
    },
    {
      id: "app",
      label: "App Worker",
      kind: "service",
      tech: "TanStack Start on Workers",
      detail:
        "Serves the app and owns accounts. It checks the session and ownership before any chat connection upgrades.",
      at: [-2.55, 0.1, 0.8],
    },
    {
      id: "chat",
      label: "Chat agent",
      kind: "object",
      tech: "Durable Object, one per application",
      detail:
        "Owns the running turn. It runs one at a time, queues the next message, buffers the stream for reconnects and keeps the transcript in its own SQLite.",
      at: [-1.1, 0.35, -0.8],
    },
    {
      id: "models",
      label: "Model providers",
      kind: "external",
      tech: "effect/ai behind config",
      detail:
        "Chat and code generation are separate model roles. Changing a provider is a config change.",
      at: [-4.4, 0.35, -0.8],
    },
    {
      id: "db",
      label: "D1 database",
      kind: "store",
      tech: "Cloudflare D1, Drizzle",
      detail:
        "Holds accounts, drafts, versions and the authoritative pointer to the live version.",
      at: [-2.2, -1.75, 0],
    },
    {
      id: "frame",
      label: "Sandboxed frame",
      kind: "client",
      tech: "iframe on the sandbox origin",
      detail:
        "The only place the builder's browser runs generated code. It talks to the app over origin-checked, schema-decoded postMessage.",
      at: [1.3, 1.75, 0.8],
    },
    {
      id: "visitor",
      label: "Visitor",
      kind: "client",
      tech: "Any browser",
      detail:
        "Opens published applications on the sandbox origin. Serving them never touches the app origin.",
      at: [3.3, 1.75, -0.5],
    },
    {
      id: "host",
      label: "Host Worker",
      kind: "service",
      tech: "Workers, service binding",
      detail:
        "Routes live and draft requests, and bundles code at build time. The app reaches it only through a service binding.",
      at: [1.25, 0.05, 0.7],
    },
    {
      id: "supervisor",
      label: "Supervisor",
      kind: "object",
      tech: "Durable Object, one per application and draft",
      detail:
        "Owns the version pointer and loads the matching bundle. Drafts and live versions have separate Supervisors.",
      at: [2.9, 0.15, -0.3],
    },
    {
      id: "bundles",
      label: "Bundle store",
      kind: "store",
      tech: "Cloudflare R2",
      detail:
        "Immutable bundles keyed by content hash. The hash is the version id, so a rollback reuses an existing bundle.",
      at: [1.15, -1.75, 0.2],
    },
    {
      id: "isolate",
      label: "Generated app",
      kind: "sandbox",
      tech: "V8 isolate, Dynamic Workers",
      detail:
        "Model-written code nobody has read. It has CPU and subrequest limits, only the bindings it was granted, and no raw secrets.",
      at: [4.05, -0.6, 0.75],
    },
    {
      id: "appdb",
      label: "App SQLite",
      kind: "store",
      tech: "Durable Object facet",
      detail:
        "Each application's private database. Draft data and live data sit in separate instances.",
      at: [2.85, -1.85, 0.8],
    },
    {
      id: "internet",
      label: "Public internet",
      kind: "external",
      tech: "Outbound network",
      detail:
        "Off by default. An application reaches it only via an allowlist.",
      at: [5, 0.75, -0.9],
    },
    {
      id: "other",
      label: "Other app's data",
      kind: "store",
      tech: "A separate facet",
      detail:
        "Another application's SQLite. No binding exists that would let this application name it.",
      at: [4.65, -2, -0.1],
    },
  ],
  edges: [
    ["builder", "app"],
    ["builder", "frame"],
    ["app", "chat"],
    ["app", "db"],
    ["app", "host"],
    ["chat", "models"],
    ["chat", "db"],
    ["chat", "host"],
    ["frame", "host"],
    ["visitor", "host"],
    ["host", "supervisor"],
    ["host", "bundles"],
    ["supervisor", "bundles"],
    ["supervisor", "isolate"],
    ["isolate", "appdb"],
  ],
  flows: [
    {
      id: "turn",
      label: "Chat turn",
      steps: [
        {
          from: "builder",
          to: "app",
          note: "The browser opens a WebSocket. The Worker verifies the session and ownership before upgrading it.",
        },
        {
          from: "app",
          to: "chat",
          note: "The turn starts inside this application's Durable Object. A second message would wait behind it.",
        },
        {
          from: "chat",
          to: "models",
          note: "A chat model replies. If it calls the one build tool, a code model edits the current draft.",
        },
        {
          from: "chat",
          to: "db",
          note: "The new draft files are saved.",
        },
        {
          from: "chat",
          to: "host",
          note: "A service binding carries the build across the boundary. It is the only server-side path through the wall.",
        },
        {
          from: "host",
          to: "bundles",
          note: "The build bundles the files and stores them under their content hash.",
        },
        {
          from: "host",
          to: "supervisor",
          note: "The draft's Supervisor moves its pointer to the new hash.",
        },
        {
          from: "app",
          to: "builder",
          note: "The stream ends with a draft-ready event. If the tab had closed, the stream would replay on reconnect.",
        },
        {
          from: "frame",
          to: "host",
          note: "The frame loads the draft with a signed preview token that expires in 15 minutes.",
        },
      ],
    },
    {
      id: "publish",
      label: "Publish",
      steps: [
        {
          from: "builder",
          to: "app",
          note: "The builder publishes a saved version.",
        },
        {
          from: "app",
          to: "host",
          note: "The request crosses the boundary over the service binding.",
        },
        {
          from: "host",
          to: "bundles",
          note: "The bundle lands under its content hash. An older version resolves to the hash it already has.",
        },
        {
          from: "host",
          to: "supervisor",
          note: "The live Supervisor moves its pointer. Publishing and rolling back are the same operation.",
        },
        {
          from: "app",
          to: "db",
          note: "D1 records the live version after the deploy succeeds. A failed deploy leaves the pointer where it was.",
        },
      ],
    },
    {
      id: "visit",
      label: "Visitor request",
      steps: [
        {
          from: "visitor",
          to: "host",
          note: "A request arrives at the sandbox origin.",
        },
        {
          from: "host",
          to: "supervisor",
          note: "The router forwards it to that application's Supervisor.",
        },
        {
          from: "supervisor",
          to: "bundles",
          note: "The Supervisor reads the bundle for the hash it points at. Nothing compiles on this path.",
        },
        {
          from: "supervisor",
          to: "isolate",
          note: "The bundle starts in its own isolate with only its granted bindings.",
        },
        {
          from: "isolate",
          to: "appdb",
          note: "The application reads and writes its own SQLite.",
        },
      ],
    },
    {
      id: "worst",
      label: "Worst case",
      steps: [
        {
          from: "isolate",
          to: "internet",
          blocked: true,
          note: "Generated code tries to send data out. Outbound network starts off.",
        },
        {
          from: "isolate",
          to: "other",
          blocked: true,
          note: "It tries another application's database. Its only storage binding is its own.",
        },
        {
          from: "isolate",
          to: "db",
          blocked: true,
          note: "It tries the platform database. No binding crosses the wall, and it holds no secrets to try with.",
        },
        {
          from: "frame",
          to: "builder",
          blocked: true,
          note: "Its browser code reaches for the app's session. The separate origin stops it.",
        },
        {
          from: "frame",
          to: "builder",
          note: "postMessage is the one channel left. Both sides check the origin and decode every payload against a schema.",
        },
      ],
    },
  ],
};

const site: Diagram = {
  title: "How this page got here",
  caption:
    "Build time on the left, request time on the right. Drag to rotate, pick a part, or play a flow.",
  initial: "plugin",
  boundary: { x: 0, left: "Build time", right: "Request time" },
  nodes: [
    {
      id: "files",
      label: "Content files",
      kind: "store",
      tech: "Markdown, JSON",
      detail: "Every word on this site starts as a file in the repo.",
      at: [-3.3, 1.1, 0],
    },
    {
      id: "plugin",
      label: "Vite plugin",
      kind: "service",
      tech: "mdast at build time",
      detail:
        "Parses the Markdown in Node, so no Markdown parser ships to the browser.",
      at: [-1.9, 0.1, 0.5],
    },
    {
      id: "schema",
      label: "Effect Schema",
      kind: "object",
      tech: "Frontmatter validation",
      detail:
        "A bad field fails the build and names the file. A log without a diagram fails here too.",
      at: [-3.3, -1.2, -0.3],
    },
    {
      id: "virtual",
      label: "Virtual module",
      kind: "store",
      tech: "Generated at build",
      detail: "Typed content the app imports like any other module.",
      at: [-1.05, -1.3, 0.2],
    },
    {
      id: "worker",
      label: "Worker",
      kind: "service",
      tech: "TanStack Start on Workers",
      detail: "Renders the page on Cloudflare's edge and serves the assets.",
      at: [1.45, 0, 0.5],
    },
    {
      id: "browser",
      label: "Browser",
      kind: "client",
      tech: "React 19",
      detail: "Receives server-rendered HTML, then hydrates.",
      at: [1.55, 1.6, 0],
    },
    {
      id: "three",
      label: "three.js chunk",
      kind: "sandbox",
      tech: "Dynamic import",
      detail:
        "Loads when a scene nears the viewport, and pauses off-screen. You are looking at it.",
      at: [3.5, 1.3, -0.5],
    },
    {
      id: "api",
      label: "Contributions API",
      kind: "service",
      tech: "Server route",
      detail:
        "Returns the last year of GitHub contributions for the Activity graph.",
      at: [3.1, -0.3, 0.3],
    },
    {
      id: "cache",
      label: "Edge cache",
      kind: "store",
      tech: "Cloudflare cache",
      detail: "Keeps the contribution data for six hours.",
      at: [1.95, -1.6, -0.1],
    },
    {
      id: "github",
      label: "GitHub",
      kind: "external",
      tech: "GraphQL or public calendar",
      detail:
        "Uses the GraphQL API with a token and reads the public calendar without one.",
      at: [4.3, -1.4, -0.5],
    },
  ],
  edges: [
    ["files", "plugin"],
    ["plugin", "schema"],
    ["plugin", "virtual"],
    ["virtual", "worker"],
    ["worker", "browser"],
    ["browser", "three"],
    ["browser", "api"],
    ["api", "cache"],
    ["api", "github"],
  ],
  flows: [
    {
      id: "build",
      label: "Build",
      steps: [
        {
          from: "files",
          to: "plugin",
          note: "The plugin reads every content file in Node.",
        },
        {
          from: "plugin",
          to: "schema",
          note: "Frontmatter gets decoded. A typo stops the build and names the file.",
        },
        {
          from: "plugin",
          to: "virtual",
          note: "Parsed content becomes a virtual module.",
        },
        {
          from: "virtual",
          to: "worker",
          note: "The content compiles into the Worker. The parser stays behind on the build machine.",
        },
      ],
    },
    {
      id: "load",
      label: "Page load",
      steps: [
        {
          from: "browser",
          to: "worker",
          note: "The browser requests a page.",
        },
        {
          from: "worker",
          to: "browser",
          note: "The Worker responds with rendered HTML, and React hydrates it.",
        },
        {
          from: "browser",
          to: "three",
          note: "As a 3D scene nears the viewport, the browser fetches three.js. Readers who never scroll that far never download it.",
        },
      ],
    },
    {
      id: "activity",
      label: "Activity graph",
      steps: [
        {
          from: "browser",
          to: "api",
          note: "The Activity section asks for contribution data.",
        },
        {
          from: "api",
          to: "cache",
          note: "A cached response from the last six hours ends the request here.",
        },
        {
          from: "api",
          to: "github",
          note: "On a miss, the route asks GitHub.",
        },
        {
          from: "api",
          to: "browser",
          note: "The browser draws the data as a halftone grid.",
        },
      ],
    },
  ],
};

export const DIAGRAMS: Record<DiagramId, Diagram> = { architecture, site };
