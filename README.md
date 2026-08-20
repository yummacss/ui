[![Yumma UI](https://yummacss.com/ui-og.png)](https://yummacss.com/ui)

# Yumma UI

Add [Yumma UI](https://yummacss.com/ui) components to your project, from the terminal.

Components are **copied into your repository**, not installed as a dependency. There is no version to track, no breaking change to absorb, and no wrapper API between you and the markup. Once a component is in your project it is yours to edit.

[Components](https://yummacss.com/ui/components/button) • [Yumma CSS](https://yummacss.com) • [Playground](https://play.yummacss.com) • [X](https://x.com/yummacss)

## Usage

There is nothing to install.

```bash
pnpm dlx yummaui init
```

```bash
pnpm dlx yummaui add button
```

That writes `components/ui/button.tsx` and offers to install anything the component needs that you do not already have.

## Commands

### `init`

Detects your framework, package manager and import alias, then writes a `yummaui.json`:

```json
{
	"componentsDir": "components/ui",
	"alias": "@/components/ui",
	"registry": "https://yummacss.com/ui/r"
}
```

Pass `--force` to overwrite an existing config.

### `add <component...>`

```bash
pnpm dlx yummaui add button
pnpm dlx yummaui add dialog tooltip
pnpm dlx yummaui add dialog-sign-in
pnpm dlx yummaui add all
```

Components and blocks share one namespace. A component lands under its own name, so `add button` gives you `button.tsx`; a block keeps its whole id, so `add dialog-sign-in` gives you `dialog-sign-in.tsx` and the file still says what it is.

`add all` copies every component in one go. Components only: a block is a specific composition, and pulls the components it is built from anyway, so name a block when you want one.

There is no way to ask for an example, deliberately. The difference between `autocomplete` and its large demo is `size="lg"` — a prop you pass, not a second file to own and keep in sync.

| Option | |
| --- | --- |
| `--overwrite` | Replace files that already exist |
| `-y, --yes` | Skip prompts and take the defaults |

Existing files are never replaced without asking, because these files are meant to be edited after you copy them.

### `list [component]`

```bash
pnpm dlx yummaui list
pnpm dlx yummaui list button
```

## Dependencies

A component is a single file that imports only from npm, never from a shared helper. A block is built from components and says so: `add dialog-sign-in` writes the block plus the checkbox, dialog and field it composes, whose `./` imports resolve beside it.

What a component needs varies. `button` needs only [Base UI](https://base-ui.com); `accordion` also needs `motion` and `iconoir-react`. `add` reads the requirements per component, compares them against your `package.json`, and offers to install only what is missing. You will not end up with an animation library because you wanted a button.

Installs run through whichever package manager your lockfile indicates.

## Requirements

- Node 18 or newer
- React 19
- [Yumma CSS](https://yummacss.com) configured in your project, since the components are styled with its utilities

## Registry

The CLI reads a static JSON registry published by the docs site:

```
https://yummacss.com/ui/r/index.json      every component and block
https://yummacss.com/ui/r/<id>.json       one component's source and dependencies
```

Because the registry is fetched rather than bundled, new components appear without a CLI release. Point `registry` in `yummaui.json` somewhere else to test against a local docs server.

## Contributing

```bash
# install dependencies
pnpm i
# build the CLI
pnpm build
# rebuild on change
pnpm dev
```

Then run it against a local checkout:

```bash
node dist/cli.mjs list
```

## License

MIT
