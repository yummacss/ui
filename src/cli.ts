import { parseArgs } from "node:util";
import { version } from "../package.json";
import { add } from "./commands/add";
import { init } from "./commands/init";
import { list } from "./commands/list";
import { prune } from "./commands/prune";
import { m } from "./messages";
import { runner } from "./project";
import { c, repaint } from "./ui";

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

const help = () => m.help(runner(), version);

async function main(): Promise<number> {
	repaint();
	let parsed: ReturnType<typeof parse>;
	try {
		parsed = parse(process.argv.slice(2));
	} catch (error) {
		const unknown =
			(error as { code?: string }).code === "ERR_PARSE_ARGS_UNKNOWN_OPTION";
		const option = String(error).match(/'(-[^']+)'/)?.[1];
		console.error(
			c.danger(
				unknown
					? m.cli.unknownOption(option)
					: String((error as Error).message),
			),
		);
		console.error(m.cli.seeHelp(runner()));
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
			console.error(c.danger(m.cli.unknownCommand(command)));
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
			c.danger(error instanceof Error ? error.message : String(error)),
		);
		process.exitCode = 1;
	});
