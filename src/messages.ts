// every sentence yummaui prints, grouped by command; copywriting.test.ts checks them
import { CONFIG_FILE, DOCS, MARKER } from "./project";
import { c, plural } from "./ui";

export const m = {
	cli: {
		unknownOption: (option = "") => `Unknown option ${option}.`,
		unknownCommand: (command = "") => `Unknown command "${command}".`,
		seeHelp: (run: string) => `Run ${run} --help.`,
	},

	help: (run: string, version: string) => {
		const row = (name: string, text: string) =>
			`  ${c.accent(name.padEnd(24))}${text}`;

		return `
${c.bold("yummaui")} ${c.dim(`v${version}`)}  Copies Yumma UI components into your project.

${c.bold("Usage")}  ${run} <command> [options]

${c.bold("Commands")}
${row("init", "Write yummaui.json and set up Yumma CSS")}
${row("add [components]", "Copy components in, or pick from a list")}
${row("list", "Show every component")}
${row("prune", "Find components nothing uses")}

${c.bold("Options")}
${row("-a, --all", "add: every component")}
${row("--style <name>", "add: soft, compact or squircle")}
${row("--radius <step>", "add: none, small, medium, large or extra")}
${row("--overwrite", "add: replace files that exist")}
${row("--write", "prune: delete what it finds")}
${row("--force", "init: replace yummaui.json")}
${row("-y, --yes", "Skip prompts and take the defaults")}

${c.bold("Examples")}
  ${run} add button tooltip
  ${run} add button --style compact --radius small
  ${run} prune --write
`;
	},

	project: {
		missing: "No package.json found. Run this inside a project.",
		noConfig: (run: string) =>
			`No ${CONFIG_FILE} found. Run ${c.accent(`${run} init`)} first.`,
	},

	registry: {
		reading: "Reading",
		found: (n: number) => plural(n, "component"),
		unavailable: "Unavailable",
	},

	init: {
		exists: () => `${CONFIG_FILE} exists. ${c.accent("--force")} replaces it.`,
		detected: (framework: string | null, pm: string, alias: string | null) =>
			`${framework ?? "No framework"} with ${pm}${alias ? `, imports through ${alias}/` : ""}`,
		where: "Where do components go?",
		useAlias: (alias: string) => `Import them through ${c.bold(`${alias}/`)}?`,
	},

	add: {
		nameOne: (run: string) => `Name a component: ${run} add button`,
		pick: "Which components?",
		search: "Type to search",
		unknown: (name: string, near: string[], run: string) =>
			`There is no ${c.bold(name)} component. ${
				near.length
					? `Did you mean ${near.join(", ")}?`
					: `${run} list shows them all.`
			}`,
		empty: (id: string) => `${id} has no files.`,
		replace: (file: string) => `${file} exists. Replace it?`,
		kept: (file: string) => `${file} ${c.dim("already there")}`,
		nothing: "Nothing written. --overwrite replaces them.",
		next: (from: string) => `Import from ${c.accent(from)}`,
	},

	install: {
		ask: (packages: string[], pm: string) =>
			`${packages.join(", ")} with ${pm}?`,
		yourself: (command: string) => c.accent(command),
		failed: (pm: string) => `${pm} could not install them.`,
		running: (pm: string) => `Running ${pm}`,
		noStart: (command: string) => `Could not start ${command}.`,
		exited: (command: string, code: number | null) =>
			`${command} exited with ${code}`,
	},

	setup: {
		ask: "Yumma CSS is not set up here. Set it up now?",
		unstyled: () =>
			`Yumma CSS is not set up here, so components render unstyled\n${c.accent(DOCS)}`,
		declined: () => `Components render unstyled until it is\n${c.accent(DOCS)}`,
		docs: () => c.accent(DOCS),
		registered: (file: string, plugin: string) => `${file} registers ${plugin}`,
		marked: (file: string) => `${file} starts with ${MARKER}`,
		noVite: "Add yummacss() from @yummacss/vite to your Vite plugins",
		noBuild: "Add @yummacss/vite or @yummacss/postcss to your build",
		noStylesheet: `Add ${MARKER} to the stylesheet your app loads`,
		failed: (file: string) =>
			`Could not change ${file}. The docs have the line to add.`,
	},

	list: {
		next: (run: string) =>
			`${c.accent(`${run} add <component>`)}  ${c.dim("yummacss.com/ui")}`,
	},

	prune: {
		clean: (kept: number, scanned: number) =>
			`Nothing to prune. All ${kept} in use, across ${plural(scanned, "file")}.`,
		hidden: (n: number) =>
			`${plural(n, "file")} build an import at runtime, so what they load cannot be seen`,
		next: (run: string) => `Delete them: ${c.accent(`${run} prune --write`)}`,
		ask: (n: number) => `${plural(n, "file")}?`,
		kept: "Nothing deleted.",
		deleted: (n: number) => `${plural(n, "file")} deleted.`,
	},
};
