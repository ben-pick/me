/** Every diagram a log can name in its `diagram` frontmatter field. */
export const DIAGRAM_IDS = ["architecture", "site"] as const;

export type DiagramId = (typeof DIAGRAM_IDS)[number];
