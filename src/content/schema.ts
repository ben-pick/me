import { Schema } from "effect";
import { DIAGRAM_IDS } from "../diagrams/ids.ts";

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
  /** The interactive 3D diagram shown at the top of the log. */
  diagram: Schema.Literals(DIAGRAM_IDS),
  draft: Schema.optional(Schema.Boolean),
});

/** A change partway through a tour stop, triggered by a phrase in its text. */
export const TourBeat = Schema.Struct({
  /** A phrase from the stop's narration. */
  on: Schema.String,
  /** Another `data-tour` target to spotlight. */
  target: Schema.optional(Schema.String),
  /** A brain region to focus. */
  region: Schema.optional(Schema.String),
});

export const TourStop = Schema.Struct({
  id: Schema.String,
  /** The `data-tour` name to spotlight and scroll into view. */
  target: Schema.String,
  /** Company slug whose modal opens for this stop; omitted means closed. */
  open: Schema.optional(Schema.String),
  text: Schema.String,
  beats: Schema.optional(Schema.Array(TourBeat)),
});

export const TourSchema = Schema.Struct({
  stops: Schema.NonEmptyArray(TourStop),
});

const Section = Schema.Struct({
  title: Schema.String,
  caption: Schema.optional(Schema.String),
});

/** Everything on the page that isn't a company, project, interest, log or song. */
export const SiteSchema = Schema.Struct({
  name: Schema.Struct({ first: Schema.String, last: Schema.String }),
  role: Schema.String,
  location: Schema.String,
  coordinates: Schema.String,
  tags: Strings,
  /** The production origin, used for canonical URLs and the sitemap. */
  url: Schema.String,
  intro: Schema.String,
  seo: Schema.Struct({
    title: Schema.String,
    description: Schema.String,
    logsDescription: Schema.String,
  }),
  contact: Schema.Struct({
    headline: Schema.String,
    email: Schema.String,
    github: Schema.String,
    linkedin: Schema.String,
    coffee: Schema.Struct({ subject: Schema.String, body: Schema.String }),
  }),
  github: Schema.Struct({ user: Schema.String }),
  sections: Schema.Struct({
    companies: Section,
    projects: Section,
    brain: Section,
    activity: Section,
    logs: Section,
  }),
});
