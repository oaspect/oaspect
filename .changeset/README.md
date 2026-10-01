# Changesets

Every user-facing change adds a changeset describing it:

```bash
pnpm changeset
```

All three packages (`oaspect`, `@oaspect/core`, `@oaspect/react`) share one
version (`fixed` in config.json). On `main`, the Release workflow opens a
"Version packages" PR that bumps versions and writes CHANGELOG.md files;
merging it publishes to npm.
