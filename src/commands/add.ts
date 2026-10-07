import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import * as p from "@clack/prompts";
import { distance } from "fastest-levenshtein";
import type { Flags } from "../cli";
import {
	detectPackageManager,
	installCommand,
	missingDependencies,
	runner,
} from "../project";
import {
	fetchItem,
	fetchStyles,
	type RegistryIndex,
	type RegistryItem,
	resolveStyle,
} from "../registry";
import { warnStyling } from "../styling";
import { c, cancelled, fail, intro, loadIndex, plural, project } from "../ui";

export function targetFileName(id: string, component: string, variant: string) {
	return variant === "base" ? `${component}.tsx` : `${id}.tsx`;
}

export function resolveNames(
	index: RegistryIndex,
	names: string[],
	options: { all?: boolean } = {},
): { ids: string[] } | { unknown: string } {
	const ids: string[] = [];

	if (options.all) ids.push(...index.components.map((x) => x.base));

	for (const name of names) {
		const component = index.components.find((x) => x.component === name);
		if (!component) return { unknown: name };
		ids.push(component.base);
	}

	return { ids: [...new Set(ids)] };
}

// the closest names to a typo, nearest first
export function nearest(index: RegistryIndex, name: string): string[] {
	return index.components
		.map(({ component }) => ({
			component,
			score:
				component.includes(name) || name.includes(component)
					? 0
					: distance(component, name),
		}))
		.filter((x) => x.score <= 2)
		.sort((a, b) => a.score - b.score)
		.slice(0, 5)
		.map((x) => x.component);
}

export async function add(names: string[], flags: Flags): Promise<number> {
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

	if (names.length === 0 && !flags.all) {
		if (flags.yes || !process.stdout.isTTY) {
			return fail(`Name a component: ${runner(root)} add button`);
		}
		const picked = await p.autocompleteMultiselect({
			message: "Which components?",
			placeholder: "Type to search",
			options: index.components.map((x) => ({
				value: x.component,
				label: x.component,
			})),
			required: true,
		});
		if (p.isCancel(picked)) return cancelled();
		names = picked;
	}

	const resolution = resolveNames(index, names, { all: flags.all });
	if ("unknown" in resolution) {
		const near = nearest(index, resolution.unknown);
		return fail(
			`There is no ${c.bold(resolution.unknown)} component. ${
				near.length
					? `Did you mean ${near.join(", ")}?`
					: `${runner(root)} list shows them all.`
			}`,
		);
	}

	let registry = config.registry;
	const style = flags.style ?? config.style ?? null;
	const radius = flags.radius ?? config.radius ?? null;
	if (style || radius) {
		try {
			const styled = resolveStyle(
				await fetchStyles(config.registry),
				style,
				radius,
			);
			if ("error" in styled) return fail(styled.error);
			registry = `${config.registry}/${styled.folder}`;
			p.log.info(`Style ${c.bold(styled.folder)}`);
		} catch (error) {
			return fail(error);
		}
	}

	// every item the request needs, its registry dependencies first
	const items: RegistryItem[] = [];
	const seen = new Set<string>();
	async function collect(id: string): Promise<void> {
		if (seen.has(id)) return;
		seen.add(id);
		const item = await fetchItem(registry, id);
		for (const dep of item.registryDependencies) await collect(dep);
		items.push(item);
	}
	try {
		for (const id of resolution.ids) await collect(id);
	} catch (error) {
		return fail(error);
	}

	const written: string[] = [];
	const skipped: string[] = [];
	const deps = new Map<string, string>();

	for (const item of items) {
		const source = item.files[0];
		if (!source) return fail(`${item.id} has no files.`);

		const dest = join(
			root,
			config.componentsDir,
			targetFileName(item.id, item.component, item.variant),
		);
		const shown = relative(root, dest).replace(/\\/g, "/");

		if (existsSync(dest) && !flags.overwrite) {
			// only what was asked for by name is worth a question
			const asked = resolution.ids.includes(item.id);
			if (!asked || flags.yes || !process.stdout.isTTY) {
				skipped.push(shown);
				continue;
			}
			const answer = await p.confirm({
				message: `${shown} exists. Replace it?`,
				initialValue: false,
			});
			if (p.isCancel(answer)) return cancelled();
			if (!answer) {
				skipped.push(shown);
				continue;
			}
		}

		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, source.content);
		written.push(shown);
		for (const dep of item.dependencies) deps.set(dep.name, dep.version);
	}

	if (written.length > 0) {
		p.log.success(
			`Added ${plural(written.length, "file")}\n${written.map((f) => c.dim(f)).join("\n")}`,
		);
	}
	if (skipped.length > 0) {
		p.log.warn(
			`Kept ${plural(skipped.length, "file")} already there\n${skipped.map((f) => c.dim(f)).join("\n")}`,
		);
	}
	if (written.length === 0) {
		p.outro("Nothing written.");
		return 0;
	}

	const missing = missingDependencies(
		root,
		[...deps].map(([name, version]) => ({ name, version })),
	);

	if (missing.length > 0) {
		const pm = detectPackageManager(root);
		const specs = missing.map((d) => `${d.name}@${d.version}`);

		let install = flags.yes === true;
		if (!install) {
			const answer = await p.confirm({
				message: `Install ${specs.join(", ")} with ${pm}?`,
			});
			if (p.isCancel(answer)) return cancelled();
			install = answer;
		}

		if (!install) {
			const { command, args } = installCommand(pm, specs);
			p.log.info(
				`Install them yourself:\n${c.cyan([command, ...args].join(" "))}`,
			);
		} else if (!(await installPackages(root, pm, specs))) {
			return fail(`${pm} could not install them.`);
		}
	}

	warnStyling(root);

	p.outro(`Import from ${c.cyan(config.alias ?? config.componentsDir)}`);
	return 0;
}

// streams the package manager into a log that folds away when it succeeds
function installPackages(
	root: string,
	pm: ReturnType<typeof detectPackageManager>,
	specs: string[],
): Promise<boolean> {
	const { command, args } = installCommand(pm, specs);
	const log = p.taskLog({ title: `Installing with ${pm}`, limit: 8 });
	const child = spawn(command, args, {
		cwd: root,
		shell: process.platform === "win32",
	});

	for (const stream of [child.stdout, child.stderr]) {
		stream.on("data", (chunk: Buffer) => {
			for (const line of chunk.toString().split(/\r?\n/)) {
				if (line.trim()) log.message(line);
			}
		});
	}

	return new Promise((resolve) => {
		child.on("error", () => {
			log.error(`Could not start ${command}.`);
			resolve(false);
		});
		child.on("close", (code) => {
			if (code === 0)
				log.success(`Installed ${plural(specs.length, "package")}`);
			else log.error(`${command} exited with ${code}`, { showLog: true });
			resolve(code === 0);
		});
	});
}
