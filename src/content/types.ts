import type { Root } from "mdast";
import type {
  CompanyFrontmatter,
  InterestFrontmatter,
  LogFrontmatter,
  ProjectFrontmatter,
  SiteSchema,
} from "./schema.ts";

type Body = { readonly body: Root };

export type Company = typeof CompanyFrontmatter.Type & Body;
export type Project = typeof ProjectFrontmatter.Type & Body;
export type Interest = typeof InterestFrontmatter.Type & Body;
export type Log = typeof LogFrontmatter.Type & Body;

export type Site = typeof SiteSchema.Type;

export interface Content {
  readonly site: Site;
  readonly companies: ReadonlyArray<Company>;
  readonly projects: ReadonlyArray<Project>;
  readonly interests: ReadonlyArray<Interest>;
  readonly logs: ReadonlyArray<Log>;
}
