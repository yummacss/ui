[![Yumma UI](https://yummacss.com/ui-og.png)](https://yummacss.com/ui)

# Yumma UI

Add [Yumma UI](https://yummacss.com/ui) components to your project, from the terminal.

## Usage

There is nothing to install.

```bash
pnpm dlx yummaui init
```

```bash
pnpm dlx yummaui add [components]
```

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

Pass `--force` to replace an existing config, and `-y` to take the defaults.

### `add [components]`

```bash
pnpm dlx yummaui add button
pnpm dlx yummaui add dialog tooltip
pnpm dlx yummaui add --all
pnpm dlx yummaui add
pnpm dlx yummaui add button --style compact --radius small
```

| Option             |                                                   |
|--------------------|---------------------------------------------------|
| `-a, --all`        | Add every component                               |
| `--style <name>`   | `soft`, `compact` or `squircle`                   |
| `--radius <step>`  | `none`, `small`, `medium`, `large` or `extra`     |
| `--overwrite`      | Replace files that already exist                  |
| `-y, --yes`        | Skip prompts and take the defaults                |

With no names, `add` opens a list to search and pick from.

A style and radius set as `style` and `radius` in `yummaui.json` apply to
every `add`; the flags win over them. Each style takes some radius steps and
refuses the rest, and `add` says why.

### `list`

```bash
pnpm dlx yummaui list
```

### `prune`

Finds component files nothing in your project reaches, and only ever considers
files `add` wrote: your own components in the same folder are left alone.

```bash
pnpm dlx yummaui prune           # list them
pnpm dlx yummaui prune --write   # delete them, after confirming
```

| Option      |                                     |
|-------------|-------------------------------------|
| `--write`   | Delete, instead of only listing     |
| `-y, --yes` | Skip the confirmation               |

A component can import another, so "is anything importing this file" would
keep a whole unused chain alive. `prune` asks whether a file is reachable from
outside `componentsDir` instead.

## Registry

The CLI reads a static JSON registry published by the docs site:

```
https://yummacss.com/ui/r/index.json      every component
https://yummacss.com/ui/r/<id>.json       one component's source and dependencies
https://yummacss.com/ui/r/styles.json     the styles and the radius steps each takes
https://yummacss.com/ui/r/<style>-<radius>/<id>.json   the same, rewritten for a style
```

## License

MIT
