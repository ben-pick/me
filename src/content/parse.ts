import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import type { Nodes, Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { frontmatter } from "micromark-extension-frontmatter";
import { parse as parseYaml } from "yaml";
import {
  CompanyFrontmatter,
  InterestFrontmatter,
  LogFrontmatter,
  ProjectFrontmatter,
} from "./schema.ts";
import type { Content } from "./types.ts";

/** Drop source positions so the serialised tree stays small. */
const strip = (node: Nodes): Nodes => {
  const { position: _position, ...rest } = node;
  if ("children" in rest) {
    return { ...rest, children: rest.children.map(strip) } as Nodes;
  }
  return rest as Nodes;
};

/** Split a Markdown document into its YAML frontmatter and an mdast body. */
export const parseDocument = (
  source: string,
): { data: unknown; body: Root } => {
  const tree = fromMarkdown(source, {
    extensions: [frontmatter(["yaml"])],
    mdastExtensions: [frontmatterFromMarkdown(["yaml"])],
  });
  const yamlNode = tree.children.find((n) => n.type === "yaml");
  const data: unknown = yamlNode ? parseYaml(yamlNode.value) : {};
  const children = tree.children.filter((n) => n.type !== "yaml");
  return { data, body: strip({ type: "root", children }) as Root };
};

const readCollection = <S extends Schema.Top>(
  dir: string,
  schema: S,
): Array<S["Type"] & { body: Root }> =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const { data, body } = parseDocument(
        readFileSync(join(dir, file), "utf8"),
      );
      try {
        const decoded = Schema.decodeUnknownSync(schema as never)(
          data,
        ) as object;
        return { ...decoded, body } as S["Type"] & { body: Root };
      } catch (error) {
        throw new Error(
          `Invalid content in ${join(dir, file)}:\n${String(error)}`,
        );
      }
    });

export const loadContent = (root: string): Content => ({
  companies: readCollection(join(root, "companies"), CompanyFrontmatter),
  projects: readCollection(join(root, "projects"), ProjectFrontmatter),
  interests: readCollection(join(root, "interests"), InterestFrontmatter),
  logs: readCollection(join(root, "logs"), LogFrontmatter)
    .filter((p) => p.draft !== true)
    .sort((a, b) => b.date.localeCompare(a.date)),
});
