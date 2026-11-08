import type { Content } from "../content/types.ts";

export type Line =
  | { readonly kind: "out"; readonly text: string }
  | { readonly kind: "dim"; readonly text: string }
  | { readonly kind: "link"; readonly text: string; readonly href: string };

export type Effect =
  | { readonly type: "clear" }
  | { readonly type: "open"; readonly hash: string }
  | { readonly type: "github" };

export interface Result {
  readonly lines: ReadonlyArray<Line>;
  readonly effect?: Effect;
}

const out = (text: string): Line => ({ kind: "out", text });
const dim = (text: string): Line => ({ kind: "dim", text });

export const FILES = ["now.txt", "about.txt", "contact.txt"] as const;

export const COMMANDS: Record<string, string> = {
  help: "list commands",
  ls: "list files",
  cat: "print a file — try `cat now.txt`",
  projects: "list projects",
  logs: "latest logs and build logs",
  open: "open a popover — `open nooks`",
  gh: "recent GitHub activity",
  neofetch: "system info",
  whoami: "who you are talking to",
  "sudo hire ben": "you know you want to",
  clear: "clear the screen (⌃L)",
};

const pad = (s: string, n: number) => s + " ".repeat(Math.max(1, n - s.length));

/** Pure command interpreter: input in, lines (and an optional side effect) out. */
export const run = (input: string, content: Content): Result => {
  const raw = input.trim();
  if (raw === "") return { lines: [] };
  const [cmd = "", ...args] = raw.split(/\s+/);
  const arg = args.join(" ");

  switch (cmd) {
    case "help":
      return {
        lines: Object.entries(COMMANDS).map(([k, v]) =>
          out(`${pad(k, 15)}${v}`),
        ),
      };
    case "ls":
      return { lines: [out(FILES.join("  "))] };
    case "cat": {
      if (arg === "now.txt")
        return {
          lines: [out("Senior SWE at Thanks. Building Nooks on Cloudflare.")],
        };
      if (arg === "about.txt")
        return {
          lines: [
            out(
              "Software engineer with a holistic knowledge of engineering, AI and design.",
            ),
          ],
        };
      if (arg === "contact.txt")
        return {
          lines: [
            {
              kind: "link",
              text: "bendavidpick@gmail.com",
              href: "mailto:bendavidpick@gmail.com",
            },
            {
              kind: "link",
              text: "github.com/ben-pick",
              href: "https://github.com/ben-pick",
            },
            {
              kind: "link",
              text: "linkedin.com/in/benpick5",
              href: "https://linkedin.com/in/benpick5/",
            },
          ],
        };
      return { lines: [dim(`cat: ${arg || "(missing file)"}: No such file`)] };
    }
    case "projects":
      return {
        lines: [
          ...content.projects.map((p) =>
            out(`${pad(p.code, 6)}${pad(p.name, 20)}${p.status}`),
          ),
          dim("open <name> for details"),
        ],
      };
    case "open": {
      const q = arg.toLowerCase();
      const project = content.projects.find(
        (p) => p.slug === q || p.name.toLowerCase() === q,
      );
      if (project)
        return {
          lines: [dim(`opening ${project.name}…`)],
          effect: { type: "open", hash: `#project/${project.slug}` },
        };
      const company = content.companies.find(
        (c) => c.slug === q || c.name.toLowerCase() === q,
      );
      if (company)
        return {
          lines: [dim(`opening ${company.name}…`)],
          effect: { type: "open", hash: `#company/${company.slug}` },
        };
      const interest = content.interests.find(
        (i) => i.slug === q || i.name.toLowerCase() === q,
      );
      if (interest)
        return {
          lines: [dim(`opening ${interest.name}…`)],
          effect: { type: "open", hash: `#interest/${interest.slug}` },
        };
      return { lines: [dim(`open: nothing called "${arg}"`)] };
    }
    case "logs":
      return {
        lines: [
          ...content.logs
            .slice(0, 6)
            .map((l) =>
              out(
                `${l.date}  ${pad(l.project ? `[${l.project}]` : "", 8)}${l.title}`,
              ),
            ),
          dim("⌥1 opens the latest"),
        ],
      };
    case "gh":
      return {
        lines: [dim("fetching github.com/ben-pick…")],
        effect: { type: "github" },
      };
    case "neofetch":
      return {
        lines: [
          out("ben@sydney"),
          dim("----------"),
          out(`${pad("OS", 9)}Cream OS (ink edition)`),
          out(`${pad("Host", 9)}Cloudflare Workers`),
          out(`${pad("Shell", 9)}zsh`),
          out(`${pad("Stack", 9)}TanStack Start · React 19 · Tailwind v4`),
          out(`${pad("Role", 9)}Senior SWE @ Thanks`),
          out(
            `${pad("Uptime", 9)}${new Date().getFullYear() - 2019} years shipping`,
          ),
          out(
            `${pad("Projects", 9)}${content.projects.map((p) => p.name).join(", ")}`,
          ),
        ],
      };
    case "whoami":
      return { lines: [out("Benjamin Pick — software engineer, Sydney.")] };
    case "sudo":
      if (arg === "hire ben")
        return {
          lines: [
            out("[sudo] password for recruiter: ••••••••"),
            out("Access granted. Drafting an email…"),
            {
              kind: "link",
              text: "bendavidpick@gmail.com",
              href: "mailto:bendavidpick@gmail.com?subject=Let's%20build%20something",
            },
          ],
        };
      return { lines: [dim("sudo: permission denied. Try `sudo hire ben`.")] };
    case "clear":
      return { lines: [], effect: { type: "clear" } };
    case "exit":
      return { lines: [dim("There is no escape. Try `help`.")] };
    default:
      return { lines: [dim(`zsh: command not found: ${cmd}. Try \`help\`.`)] };
  }
};

/** Tab completion over commands, files and popover names. */
export const complete = (input: string, content: Content): string | null => {
  const parts = input.split(" ");
  const names = [
    ...content.projects.map((p) => p.slug),
    ...content.companies.map((c) => c.slug),
    ...content.interests.map((i) => i.slug),
  ];
  const pool =
    parts.length === 1
      ? [...Object.keys(COMMANDS).map((c) => c.split(" ")[0] ?? c), "sudo"]
      : parts[0] === "cat"
        ? [...FILES]
        : parts[0] === "open"
          ? names
          : parts[0] === "sudo"
            ? ["hire ben"]
            : [];
  const last = parts.slice(1).join(" ");
  const prefix = parts.length === 1 ? (parts[0] ?? "") : last;
  const hit = [...new Set(pool)].find(
    (c) => c.startsWith(prefix) && c !== prefix,
  );
  if (!hit) return null;
  return parts.length === 1 ? hit : `${parts[0]} ${hit}`;
};
