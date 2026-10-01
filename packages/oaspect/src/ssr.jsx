// Server-side rendering for `oaspect build`: the reference as static HTML,
// hydrated in the browser by Oaspect.hydrate() with the same config.
import { ApiReference } from "@oaspect/react";
import css from "@oaspect/react/styles.css";
import { renderToString } from "react-dom/server";
import { toProps } from "./props";

export { css };

/** Markup for <div id="oaspect">; render everything (no lazy sections) so it is complete. */
export function renderToHtml(config) {
  return renderToString(<ApiReference {...toProps(config)} />);
}
