# Notes

What the code does not say for itself. The reasoning lives here so PR bodies
can stay to what changed.

## Publishing

- **`repository.url` has to match the repo's canonical name, exactly.**
  `publishConfig.provenance` makes npm mint a Sigstore attestation from the
  Actions OIDC token, then refuse the upload unless `repository.url` matches
  the repo name in it. **A GitHub rename redirect does not count.** The
  mismatch arrived in `830b2bc` (URL changed from `yummaui` to `ui`) and cost
  nothing for three releases because the repo was called `ui` then; renaming
  it turned the same line into a hard `422` and failed v0.3.0 twice. The
  failure reads as a build failure and is not one: types, tests, build and
  pack all pass, and it dies on the last step. `publish.yml` checks the two
  against each other before it installs anything.
- A publish run from a laptop cannot work no matter how the credentials are
  set up: `provenance: true` needs the `id-token: write` OIDC token, which
  only a workflow run has.

## Styles, 2026-09-27

`add --style` and `--radius` read `styles.json` from the registry root, check
the pair, and fetch items from `<registry>/<style>-<radius>/` instead of the
root. Nothing else in `add` knows about styles. The docs site builds those
folders with the same `applyStyle` its tests cover, so the CLI holds no copy
of the rules: a refusal it prints is the reason `styles.json` gives.


## Output

Every command opens with `intro()` and ends in `outro()` or `fail()` from
`src/ui.ts`, so errors print inside the same frame as everything else. Each
line names its stage (`registry`, `write`, `install`, `check`, `next`) in one
column, with no blank line between steps. Colour is `styleText` from
`node:util`. On a 24-bit terminal the CLI uses the docs theme's dark values:
diff-add for done, diff-remove for errors, the accent (the navbar's link
colour) for links and prompts, a yellow at the diff colours' lightness for
warnings, and the terminal's own text colour for information. `@clack/prompts` has no theme setting and names its colours,
so `repaint()` rewrites those codes on stdout. Elsewhere the terminal's own blue and red stand in.
Flags are `parseArgs` from `node:util` in `cli.ts`, strict, so a typo is an
error rather than a silent default. `add` installs through `p.taskLog`, which
folds the package manager's output away on success and keeps it on failure.

The registry's `index.json` still carries an empty `blocks` array, which the
CLI ignores: blocks never shipped.
