import { Logo } from "@oaspect/react";

// Plain-object config → <ApiReference> props. `logo` may be a URL or
// { light, dark, alt, label }.
export function toProps(config = {}) {
  const { logo, ...props } = config;
  if (typeof logo === "string") props.logo = <Logo light={logo} alt={config.title ?? ""} />;
  else if (logo && typeof logo === "object") props.logo = <Logo {...logo} />;
  // The book cover is dark: its logo is the dark-theme variant when there is one.
  const coverLogo = typeof logo === "string" ? logo : (logo?.dark ?? logo?.light);
  if (coverLogo && !props.print?.logo) props.print = { ...props.print, logo: coverLogo };
  return props;
}
