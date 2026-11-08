import type { Nodes, Root } from "mdast";
import type { ReactNode } from "react";
import { cx } from "../lib/cx.ts";

type Variant = "prose" | "compact";

const render = (node: Nodes, v: Variant, key: number): ReactNode => {
  const kids = () =>
    "children" in node
      ? node.children.map((c, i) => render(c as Nodes, v, i))
      : null;
  switch (node.type) {
    case "root":
      return <>{kids()}</>;
    case "paragraph":
      return (
        <p
          key={key}
          className={cx("m-0", v === "prose" ? "mb-4" : "mb-3 last:mb-0")}
        >
          {kids()}
        </p>
      );
    case "heading":
      return (
        <h2
          key={key}
          className="mt-12 mb-4 font-display text-[28px] uppercase leading-none tracking-[-0.02em]"
        >
          {kids()}
        </h2>
      );
    case "list":
      return v === "compact" ? (
        <ul key={key} className="m-0 flex list-none flex-col gap-3 p-0">
          {kids()}
        </ul>
      ) : (
        <ul key={key} className="mb-4 list-[square] pl-5">
          {kids()}
        </ul>
      );
    case "listItem":
      return v === "compact" ? (
        <li
          key={key}
          className="relative animate-rise pl-5 before:absolute before:top-[0.6em] before:left-0 before:h-px before:w-2.5 before:bg-current [&>p]:m-0"
        >
          {kids()}
        </li>
      ) : (
        <li key={key} className="mb-1.5 [&>p]:m-0">
          {kids()}
        </li>
      );
    case "text":
      return node.value;
    case "strong":
      return (
        <strong key={key} className="font-medium">
          {kids()}
        </strong>
      );
    case "emphasis":
      return <em key={key}>{kids()}</em>;
    case "inlineCode":
      return (
        <code key={key} className="border border-current px-1 text-[0.9em]">
          {node.value}
        </code>
      );
    case "code":
      return (
        <pre
          key={key}
          className="mb-4 overflow-x-auto bg-ink p-4 text-[12px] text-cream"
        >
          <code>{node.value}</code>
        </pre>
      );
    case "link":
      return (
        <a
          key={key}
          href={node.url}
          className="underline underline-offset-[3px] transition-colors hover:bg-current/10"
          {...(node.url.startsWith("http")
            ? { target: "_blank", rel: "noreferrer" }
            : {})}
        >
          {kids()}
        </a>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-6 border-l border-current pl-4 opacity-80"
        >
          {kids()}
        </blockquote>
      );
    case "thematicBreak":
      return <hr key={key} className="my-8 border-0 border-t border-current" />;
    case "break":
      return <br key={key} />;
    default:
      return kids();
  }
};

export const Markdown = ({
  tree,
  variant = "prose",
}: {
  tree: Root;
  variant?: Variant;
}) => <>{render(tree, variant, 0)}</>;
