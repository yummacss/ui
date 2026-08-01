import c from "picocolors";
import { findProjectRoot, readConfig } from "../project";
import { DEFAULT_REGISTRY, fetchIndex, RegistryError } from "../registry";

export async function list(argv: string[]): Promise<number> {
	const name = argv.find((a) => !a.startsWith("-"));
	const root = findProjectRoot();
	const registry = (root && readConfig(root)?.registry) || DEFAULT_REGISTRY;

	let index: Awaited<ReturnType<typeof fetchIndex>>;
	try {
		index = await fetchIndex(registry);
	} catch (error) {
		console.error(
			c.red(error instanceof RegistryError ? error.message : String(error)),
		);
		return 1;
	}

	if (name) {
		const entry = index.components.find((x) => x.component === name);
		if (!entry) {
			console.error(c.red(`Unknown component ${name}.`));
			return 1;
		}
		console.log(`\n${c.bold(entry.title)}  ${c.dim(entry.component)}\n`);
		console.log(
			`  ${c.green("base")}  ${c.dim("npx yummaui add " + entry.component)}\n`,
		);
		if (entry.variants.length) {
			console.log(`  ${c.bold(`${entry.variants.length} variants`)}`);
			for (const v of entry.variants) {
				console.log(`    ${v.padEnd(22)}${c.dim(`--variant ${v}`)}`);
			}
		}
		console.log();
		return 0;
	}

	console.log(`\n${c.bold(`${index.components.length} components`)}\n`);

	// Two columns, because 36 single-file lines is a screenful of scrolling.
	const cells = index.components.map(
		(x) =>
			`${x.component.padEnd(18)}${c.dim(`${x.variants.length + 1} variants`)}`,
	);
	for (let i = 0; i < cells.length; i += 2) {
		console.log(`  ${(cells[i] ?? "").padEnd(46)}${cells[i + 1] ?? ""}`);
	}

	console.log(
		`\n  ${c.dim("npx yummaui list <component>")}  to see its variants\n`,
	);
	return 0;
}
