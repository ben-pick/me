import { Schema } from "effect";

const Strings = Schema.Array(Schema.String);
const Link = Schema.Struct({ label: Schema.String, href: Schema.String });

export const CompanyFrontmatter = Schema.Struct({
  slug: Schema.String,
  name: Schema.String,
  detail: Schema.optional(Schema.String),
  role: Schema.String,
  start: Schema.String,
  end: Schema.String,
  highlight: Schema.String,
  url: Schema.optional(Schema.String),
  stack: Strings,
  /** Brain region that lights up while this row is on screen. */
  region: Schema.optional(Schema.String),
});

export const ProjectFrontmatter = Schema.Struct({
  slug: Schema.String,
  code: Schema.String,
  name: Schema.String,
  status: Schema.String,
  pitch: Schema.String,
  tags: Strings,
  featured: Schema.optional(Schema.Boolean),
  links: Schema.Array(Link),
});

export const InterestFrontmatter = Schema.Struct({
  slug: Schema.String,
  num: Schema.String,
  name: Schema.String,
  region: Schema.String,
  function: Schema.String,
  blurb: Schema.String,
  facts: Schema.Array(Schema.Struct({ k: Schema.String, v: Schema.String })),
  media: Schema.optional(Schema.String),
});

export const LogFrontmatter = Schema.Struct({
  slug: Schema.String,
  title: Schema.String,
  date: Schema.String,
  summary: Schema.String,
  /** Slug of the project this is a build log for, if any. */
  project: Schema.optional(Schema.String),
  draft: Schema.optional(Schema.Boolean),
});

export const NowPlayingFrontmatter = Schema.Struct({
  title: Schema.String,
  artist: Schema.String,
  /** Audio file to play: a path under public/ or an absolute URL. */
  audio: Schema.optional(Schema.String),
  /** Where to listen to the full track. */
  url: Schema.optional(Schema.String),
  /** Why it's on repeat — one line. */
  note: Schema.optional(Schema.String),
});
