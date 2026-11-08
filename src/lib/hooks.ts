import { useEffect, useState } from "react";

export const useMediaQuery = (query: string, initial = false) => {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const on = () => setMatches(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
};

export const useReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
