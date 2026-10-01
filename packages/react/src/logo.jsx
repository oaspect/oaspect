// Header logo with optional dark-theme variant and label, e.g.
// <Logo light="/logo.svg" dark="/logo-dark.svg" alt="ACME" label="API Docs" />.
// Plain <img> elements: logos are small static files from any host.
export function Logo({ light, dark, alt = "", label }) {
  return (
    <>
      <img src={light} alt={alt} className={`h-6 w-auto max-w-32 ${dark ? "dark:hidden" : ""}`} />
      {dark && <img src={dark} alt={alt} className="hidden h-6 w-auto max-w-32 dark:block" />}
      {label && <span className="hidden text-sm font-medium text-muted-foreground sm:inline">{label}</span>}
    </>
  );
}
