import { content, site } from "../content/index.ts";

/** Every piece of text on the LinkedIn banner, read from the site's content. */
export const bannerModel = () => {
  const project = content.projects.find((p) => p.featured);
  if (!project) throw new Error("The banner needs a featured project");
  return {
    name: `${site.name.first} ${site.name.last}`,
    role: site.role,
    location: site.location,
    coordinates: site.coordinates,
    tags: site.tags,
    headline: site.contact.headline,
    github: site.contact.github.replace("https://", ""),
    companies: content.companies.slice(0, 5).map((c) => ({
      slug: c.slug,
      // "Kodo (ex-Thanks)" reads as "Kodo" at this size.
      name: c.name.replace(/\s*\(.*\)$/, ""),
      role: c.role.replace("Software Engineer", "SWE"),
    })),
    project: {
      code: project.code,
      status: project.status,
      name: project.name,
      pitch: project.pitch,
      tags: project.tags,
    },
  };
};
