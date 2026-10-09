import { m } from "../messages";
import { findProjectRoot, readConfig, runner } from "../project";
import { DEFAULT_REGISTRY, type RegistryIndex } from "../registry";
import { fail, intro, loadIndex, outro, say } from "../ui";

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
	say.done("available", rows.join("\n"));

	outro("next", m.list.next(runner(root)));
	return 0;
}
