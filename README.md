# yummaui

Add [Yumma UI](https://yummacss.com/ui) components to your project.

Components are **copied into your repository**, not installed as a dependency.
There is no version to track, no breaking change to absorb, and no wrapper API
between you and the markup. Once a component is in your project it is yours to
edit.

## Usage

No installation needed.

```bash
npx yummaui init
```

```bash
npx yummaui add button
```

That writes `components/ui/button.tsx` and offers to install anything the
component needs that you do not already have.

## Commands

### `init`

Detects your framework, package manager and import alias, then writes a
`yummaui.json`:

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
npx yummaui add button
npx yummaui add dialog tooltip
npx yummaui add button --variant pill
```

Every component has a base and a set of variants. `add button` gives you the
base as `button.tsx`; `add button --variant pill` gives you `button-pill.tsx`,
so the file still says what it is.

| Option | |
| --- | --- |
| `-v, --variant <name>` | Add a variant instead of the base |
| `--overwrite` | Replace files that already exist |
| `-y, --yes` | Skip prompts and take the defaults |

Existing files are never replaced without asking, because these files are meant
to be edited after you copy them.

### `list [component]`

```bash
npx yummaui list          # every component
npx yummaui list button   # one component's variants
```

## Dependencies

Components are self-contained: each one is a single file that imports only from
npm, never from another component and never from a shared helper. There is
nothing to copy alongside it.

What a component needs varies. `button` needs only
[Base UI](https://base-ui.com); `accordion` also needs `motion` and
`iconoir-react`. `add` reads the requirements per component, compares them
against your `package.json`, and offers to install only what is missing. You
will not end up with an animation library because you wanted a button.

## Requirements

- Node 18 or newer
- React 19
- [Yumma CSS](https://yummacss.com) configured in your project, since the
  components are styled with its utilities

## Registry

The CLI reads a static JSON registry published by the docs site:

```
https://yummacss.com/ui/r/index.json      every component and its variants
https://yummacss.com/ui/r/<id>.json       one component's source and dependencies
```

Because the registry is fetched rather than bundled, new components appear
without a CLI release. Point `registry` in `yummaui.json` somewhere else to
test against a local docs server.

## License

MIT
