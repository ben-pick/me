import content from "virtual:content";

export type { Company, Content, Interest, Post, Project } from "./types.ts";
export { content };

export const companyBySlug = (slug: string) =>
  content.companies.find((c) => c.slug === slug);
export const projectBySlug = (slug: string) =>
  content.projects.find((p) => p.slug === slug);
export const interestBySlug = (slug: string) =>
  content.interests.find((i) => i.slug === slug);
export const postBySlug = (slug: string) =>
  content.posts.find((p) => p.slug === slug);
