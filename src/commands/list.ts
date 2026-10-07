import * as p from "@clack/prompts";
import { findProjectRoot, readConfig, runner } from "../project";
import { DEFAULT_REGISTRY, type RegistryIndex } from "../registry";
import { c, fail, intro, loadIndex } from "../ui";

export async function list(): Promise<number> {
	intro();

	const root = findProjectRoot();
	const registry = (root && readConfig(root)?.registry) || DEFAULT_REGISTRY;

	let index: RegistryIndex;
	try {
		index = await loadIndex(registry);
	} catch (error) {
		return fail(error);
	}

	const names = index.components.map((x) => x.component);
	const width = Math.max(...names.map((x) => x.length)) + 2;
	const rows: string[] = [];
	for (let i = 0; i < names.length; i += 3) {
		rows.push(
			names
				.slice(i, i + 3)
				.map((x) => x.padEnd(width))
				.join("")
				.trimEnd(),
		);
	}
	p.log.message(rows.join("\n"));

	p.outro(
		`${c.cyan(`${runner(root)} add <component>`)}  ${c.dim("https://yummacss.com/ui")}`,
	);
	return 0;
}
