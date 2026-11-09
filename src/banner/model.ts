import { site } from "../content/index.ts";

/** Every piece of text on the LinkedIn banner, read from the site's content. */
export const bannerModel = () => ({
  name: `${site.name.first} ${site.name.last}`,
  role: site.role,
  location: site.location,
  coordinates: site.coordinates,
  tags: site.tags,
});
