# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-08-16

First release.

### Added

- `init` writes a `yummaui.json` after detecting the framework, package manager and `@/` import alias. Next.js is reported as App Router or Pages Router by looking for the directory, since the router is not a dependency and cannot be read from `package.json`.
- `add <name...>` copies components in from the registry, resolving components and blocks in one namespace. A component lands under its own name, so `add button` produces `button.tsx`; a block keeps its whole id, so `add dialog-sign-in` produces `dialog-sign-in.tsx` and still says what it is. There is deliberately no way to ask for an example: the difference between `autocomplete` and its large demo is `size="lg"`, a prop you pass rather than a second file to own and keep in sync.
- `registryDependencies` are resolved transitively, so `add dialog-sign-in` also writes the components it is built from.
- `list` and `list <component>` for browsing the registry without leaving the terminal. `list <component>` points at the docs for its props rather than enumerating demos.
- Dependencies are read per component and diffed by name against the project's `package.json`, so only what is missing is offered for install. Components differ in what they need, and a blanket install would put an animation library in the project of someone who asked for a button.
- Installs run through the package manager detected from the lockfile, falling back to the `packageManager` field and then to npm.
- Unknown component names fall back to edit-distance suggestions. Substring matching alone misses the most common typo, where neither string contains the other.

### Notes

- Existing files are never overwritten without confirmation, and the prompt defaults to no. These files exist to be edited after copying, so replacing one silently would discard work.
- The registry is fetched rather than bundled, so new components reach users without a CLI release.
