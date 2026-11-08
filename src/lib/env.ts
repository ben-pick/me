/** The static artifact build has no server and can't load third-party scripts. */
export const STATIC_BUILD = import.meta.env.MODE === "artifact";
