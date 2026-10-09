# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.1] - 2026-10-09

### Fixed

- The `yumma.config.mjs` that setup writes includes the states and keyframes
  the components animate with, read from the registry. When the file exists
  and lacks some of them, `add` and `init` name the ones to add.

## [0.5.0] - 2026-10-09

### Added

- `add` with no names opens a list to search and pick from.
- `init -y` takes the defaults without asking.
- `init` and `add` offer to set up Yumma CSS when it is missing: they install
  `yummacss` and the plugin for the framework, register the plugin in
  `vite.config` or `postcss.config`, write `yumma.config.mjs`, and add
  `@yummacss;` to the stylesheet the app loads.

### Changed

- Every command prints in the same frame, `list` and errors included. Each
  line names its stage, and the colours are the docs site's palette.
- Package manager output folds into one line once the install succeeds, and
  shows in full when it fails.
- An unknown option is an error rather than being ignored.
- `init` puts components in `src/components/ui` when the project has a `src`
  folder.

### Removed

- `list <component>`. The docs page has what it showed.
- Blocks. The registry has none.

## [0.4.0] - 2026-09-27

### Added

- `add --style` and `--radius`, and `style` and `radius` in `yummaui.json`.

## [0.3.0] - 2026-09-17

### Added

- `init` and `add` now say when Yumma CSS is not set up in the project, naming
  what is missing: `yummacss`, the plugin for the detected framework
  (`@yummacss/postcss` for Next.js, `@yummacss/vite` otherwise), and
  `yumma.config.mjs`.

### Changed

- `--help` now names the package manager the project uses, instead of always
  saying `npx`. Every other hint the CLI prints already did.

## [0.2.1] - 2026-08-30

### Changed

- `prune` no longer skips `dist`, `.next` and similar directories by name.
  Guessing which folders hold build output made it delete more readily, and a
  stale build naming a component is a reason to keep it.

## [0.2.0] - 2026-08-30

### Added

- add `yummaui prune`, which lists component files nothing in the project
  reaches. Pass `--write` to delete them.

## [0.1.0] - 2026-08-20

### Added

- add `yummaui add --all` command, use the `--all` flag to install all components at once.

## [0.0.1] - 2026-08-16

### Added

- Initial release.

[Unreleased]: https://github.com/yummacss/yummaui/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/yummacss/yummaui/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/yummacss/yummaui/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/yummacss/yummaui/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/yummacss/yummaui/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/yummacss/yummaui/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/yummacss/yummaui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yummacss/yummaui/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/yummacss/yummaui/releases/tag/v0.0.1
