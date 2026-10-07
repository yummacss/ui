import { parseArgs } from "node:util";
import { version } from "../package.json";
import { add } from "./commands/add";
import { init } from "./commands/init";
import { list } from "./commands/list";
import { prune } from "./commands/prune";
import { runner } from "./project";
import { c } from "./ui";

const options = {
	all: { type: "boolean", short: "a" },
	style: { type: "string" },
	radius: { type: "string" },
	overwrite: { type: "boolean" },
	write: { type: "boolean" },
	force: { type: "boolean" },
	yes: { type: "boolean", short: "y" },
	help: { type: "boolean", short: "h" },
	version: { type: "boolean", short: "V" },
} as const;

export type Flags = ReturnType<typeof parse>["values"];

const parse = (args: string[]) =>
	parseArgs({ args, options, allowPositionals: true });

const help = () => {
	const run = runner();
	const row = (name: string, text: string) =>
		`  ${c.accent(name.padEnd(24))}${text}`;

	return `
${c.bold("yummaui")} ${c.dim(`v${version}`)}  Copies Yumma UI components into your project.

${c.bold("Usage")}  ${run} <command> [options]

${c.bold("Commands")}
${row("init", "Write yummaui.json for this project")}
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
};

async function main(): Promise<number> {
	let parsed: ReturnType<typeof parse>;
	try {
		parsed = parse(process.argv.slice(2));
	} catch (error) {
		const unknown =
			(error as { code?: string }).code === "ERR_PARSE_ARGS_UNKNOWN_OPTION";
		const option = String(error).match(/'(-[^']+)'/)?.[1];
		console.error(
			c.red(
				unknown
					? `Unknown option ${option}.`
					: String((error as Error).message),
			),
		);
		console.error(`Run ${runner()} --help.`);
		return 1;
	}
	const { values, positionals } = parsed;
	const [command, ...names] = positionals;

	if (values.version) {
		console.log(version);
		return 0;
	}

	switch (values.help ? undefined : command) {
		case "init":
			return init(values);
		case "add":
			return add(names, values);
		case "list":
		case "ls":
			return list();
		case "prune":
			return prune(values);
		case undefined:
			console.log(help());
			return 0;
		default:
			console.error(c.red(`Unknown command "${command}".`));
			console.log(help());
			return 1;
	}
}

main()
	.then((code) => {
		process.exitCode = code;
	})
	.catch((error: unknown) => {
		console.error(
			c.red(error instanceof Error ? error.message : String(error)),
		);
		process.exitCode = 1;
	});
