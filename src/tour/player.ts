import narrationUrl from "../../content/tour-narration.mp3?url";
import timing from "../../content/tour-timing.json";
import { tour } from "../content/index.ts";
import { actions } from "../lib/store.ts";
import { type Clock, createClock } from "./clock.ts";
import { buildTimeline, stateAt } from "./timeline.ts";

export const timeline = buildTimeline(tour.stops, timing);

let clock: Clock | null = null;

/** The one running tour, shared by the start button and the control bar. */
export const tourPlayer = {
  /** Call from the click itself: browsers only allow audio in a user gesture. */
  start() {
    clock = createClock(narrationUrl);
    clock.play();
    actions.setTourRunning(true);
  },
  stop() {
    clock?.stop();
    clock = null;
    actions.setTourRunning(false);
  },
  now: () => Math.min(clock?.now() ?? 0, timeline.duration),
  /** Move to the previous or next stop and keep playing. */
  skip(direction: -1 | 1) {
    const { stopIndex } = stateAt(timeline, tourPlayer.now());
    const stop = timeline.stops[stopIndex + direction];
    if (stop) clock?.seek(stop.start);
  },
};
