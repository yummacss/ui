import c from "picocolors";
import { add } from "./commands/add";
import { init } from "./commands/init";
import { list } from "./commands/list";

const VERSION = "0.1.0";

const HELP = `
${c.bold("yummaui")} ${c.dim(`v${VERSION}`)}

  Copies Yumma UI components into your project. Never a dependency.

${c.bold("Usage")}
  npx yummaui <command> [options]

${c.bold("Commands")}
  init                     Set up yummaui.json in this project
  add <component...>       Copy a component in
  list [component]         Browse what is available

${c.bold("Options")}
      --overwrite          Replace files that already exist
  -y, --yes                Skip prompts, take the defaults
  -h, --help               Show this
      --version            Show the version

${c.bold("Examples")}
  npx yummaui add button
  npx yummaui add dialog tooltip
  npx yummaui list button
`;

async function main(): Promise<number> {
	const argv = process.argv.slice(2);
	const command = argv[0];

	if (!command || command === "-h" || command === "--help") {
		console.log(HELP);
		return 0;
	}
	if (command === "--version" || command === "-V") {
		console.log(VERSION);
		return 0;
	}

	const rest = argv.slice(1);

	switch (command) {
		case "init":
			return init(rest);
		case "add":
			return add(rest);
		case "list":
		case "ls":
			return list(rest);
		default:
			console.error(c.red(`Unknown command "${command}".`));
			console.log(HELP);
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
