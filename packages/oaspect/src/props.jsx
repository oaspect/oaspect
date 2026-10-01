import { Logo } from "@oaspect/react";

// Plain-object config → <ApiReference> props. `logo` may be a URL or
// { light, dark, alt, label }.
export function toProps(config = {}) {
  const { logo, ...props } = config;
  if (typeof logo === "string") props.logo = <Logo light={logo} alt={config.title ?? ""} />;
  else if (logo && typeof logo === "object") props.logo = <Logo {...logo} />;
  return props;
}
