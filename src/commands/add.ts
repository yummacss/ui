import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import * as p from "@clack/prompts";
import { distance } from "fastest-levenshtein";
import type { Flags } from "../cli";
import { installPackages } from "../install";
import { m } from "../messages";
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
import { setUpStyling } from "../setup";
import {
	cancelled,
	fail,
	intro,
	loadIndex,
	outro,
	project,
	say,
	tag,
} from "../ui";

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
			return fail(m.add.nameOne(runner(root)));
		}
		const picked = await p.autocompleteMultiselect({
			message: m.add.pick,
			placeholder: m.add.search,
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
		return fail(m.add.unknown(resolution.unknown, near, runner(root)));
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
			say.info("style", styled.folder);
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
		if (!source) return fail(m.add.empty(item.id));

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
				message: tag("write", m.add.replace(shown)),
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
		say.done("write", written.join("\n"));
	}
	if (skipped.length > 0) {
		say.warn("kept", skipped.map(m.add.kept).join("\n"));
	}
	if (written.length === 0) {
		outro("next", m.add.nothing);
		return 0;
	}

	const missing = missingDependencies(
		root,
		[...deps].map(([name, version]) => ({ name, version })),
	);

	if (missing.length > 0) {
		const pm = detectPackageManager(root);
		const specs = missing.map((d) => `${d.name}@${d.version}`);
		const packages = missing.map((d) => d.name);

		let install = flags.yes === true;
		if (!install) {
			const answer = await p.confirm({
				message: tag("install", m.install.ask(packages, pm)),
			});
			if (p.isCancel(answer)) return cancelled();
			install = answer;
		}

		if (!install) {
			const { command, args } = installCommand(pm, specs);
			say.info("install", m.install.yourself([command, ...args].join(" ")));
		} else if (!(await installPackages(root, pm, specs))) {
			return fail(m.install.failed(pm));
		}
	}

	if (
		!(await setUpStyling(
			root,
			config.componentsDir,
			flags.yes === true,
			index.theme,
		))
	)
		return 1;

	outro("next", m.add.next(config.alias ?? config.componentsDir));
	return 0;
}
