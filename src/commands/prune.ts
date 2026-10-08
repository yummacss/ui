import { rmSync } from "node:fs";
import { relative } from "node:path";
import * as p from "@clack/prompts";
import type { Flags } from "../cli";
import { runner } from "../project";
import { findUnused, installableFileNames } from "../prune";
import type { RegistryIndex } from "../registry";
import {
	c,
	cancelled,
	fail,
	intro,
	loadIndex,
	outro,
	plural,
	project,
	say,
	tag,
} from "../ui";

export async function prune(flags: Flags): Promise<number> {
	intro();

	const found = project();
	if (typeof found === "string") return fail(found);
	const { root, config } = found;

	let index: RegistryIndex;
	try {
		index = await loadIndex(config.registry);
	} catch (error) {
		return fail(error);
	}

	const result = findUnused(
		{ root, componentsDir: config.componentsDir, alias: config.alias },
		installableFileNames(index),
	);
	const show = (path: string) => relative(root, path).replace(/\\/g, "/");

	if (result.computed.length > 0) {
		say.warn(
			"hidden",
			`${plural(result.computed.length, "file")} build an import at runtime, so what they load cannot be seen\n${result.computed
				.slice(0, 5)
				.map((f) => c.dim(show(f)))
				.join("\n")}`,
		);
	}

	if (result.unused.length === 0) {
		outro(
			"next",
			`Nothing to prune. All ${result.kept} in use, across ${plural(result.scanned, "file")}.`,
		);
		return 0;
	}

	say.warn("unused", result.unused.map(show).join("\n"));

	if (!flags.write) {
		outro("next", `Delete them: ${c.accent(`${runner(root)} prune --write`)}`);
		return 0;
	}

	if (!flags.yes) {
		const answer = await p.confirm({
			message: tag("delete", `${plural(result.unused.length, "file")}?`),
			initialValue: false,
		});
		if (p.isCancel(answer)) return cancelled();
		if (!answer) {
			outro("next", "Nothing deleted.");
			return 0;
		}
	}

	for (const file of result.unused) rmSync(file, { force: true });
	outro("delete", `${plural(result.unused.length, "file")} deleted.`);
	return 0;
}
