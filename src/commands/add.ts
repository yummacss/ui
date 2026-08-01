import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import * as p from "@clack/prompts";
import c from "picocolors";
import {
	CONFIG_FILE,
	detectPackageManager,
	findProjectRoot,
	installCommand,
	missingDependencies,
	readConfig,
	runner,
} from "../project";
import {
	fetchIndex,
	fetchItem,
	type RegistryComponent,
	RegistryError,
} from "../registry";

interface Options {
	variant: string | null;
	overwrite: boolean;
	yes: boolean;
}

function parse(argv: string[]): { names: string[]; options: Options } {
	const names: string[] = [];
	const options: Options = { variant: null, overwrite: false, yes: false };

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i] as string;
		if (arg === "--variant" || arg === "-v")
			options.variant = argv[++i] ?? null;
		else if (arg.startsWith("--variant=")) options.variant = arg.slice(10);
		else if (arg === "--overwrite") options.overwrite = true;
		else if (arg === "--yes" || arg === "-y") options.yes = true;
		else if (!arg.startsWith("-")) names.push(arg);
	}

	return { names, options };
}

/**
 * The base variant drops its suffix on disk: `button-base` becomes
 * `button.tsx`, because `-base` is an id in the registry rather than a name
 * anyone should have to live with. A named variant keeps it, so
 * `button-pill.tsx` still says what it is.
 */
function targetFileName(component: string, variant: string): string {
	return variant === "base"
		? `${component}.tsx`
		: `${component}-${variant}.tsx`;
}

export async function add(argv: string[]): Promise<number> {
	const { names, options } = parse(argv);
	const root = findProjectRoot();

	if (!root) {
		p.log.error("No package.json found. Run this inside a project.");
		return 1;
	}

	const config = readConfig(root);
	if (!config) {
		p.log.error(
			`No ${CONFIG_FILE} found. Run ${c.cyan(`${runner(root)} init`)} first.`,
		);
		return 1;
	}

	if (names.length === 0) {
		p.log.error(`Nothing to add. Try: ${runner(root)} add button`);
		return 1;
	}

	if (options.variant && names.length > 1) {
		p.log.error("--variant applies to a single component at a time.");
		return 1;
	}

	p.intro(c.bgCyan(c.black(" Yumma UI ")));

	let index: Awaited<ReturnType<typeof fetchIndex>>;
	const s = p.spinner();
	s.start("Fetching registry");
	try {
		index = await fetchIndex(config.registry);
	} catch (error) {
		s.stop("Registry unavailable", 1);
		p.log.error(error instanceof RegistryError ? error.message : String(error));
		return 1;
	}
	s.stop(`${index.components.length} components available`);

	const pending: { id: string; component: string; variant: string }[] = [];

	for (const name of names) {
		const entry = index.components.find((x) => x.component === name);
		if (!entry) {
			p.log.error(`Unknown component ${c.bold(name)}.`);
			suggest(index.components, name);
			return 1;
		}

		if (options.variant) {
			if (!entry.variants.includes(options.variant)) {
				p.log.error(
					`${c.bold(name)} has no variant ${c.bold(`"${options.variant}"`)}.`,
				);
				p.log.info(
					`Available (${entry.variants.length}):\n${entry.variants.join(", ")}`,
				);
				return 1;
			}
			pending.push({
				id: `${name}-${options.variant}`,
				component: name,
				variant: options.variant,
			});
		} else {
			pending.push({ id: entry.base, component: name, variant: "base" });
		}
	}

	const written: string[] = [];
	const allDeps = new Map<string, string>();

	for (const target of pending) {
		let item: Awaited<ReturnType<typeof fetchItem>>;
		try {
			item = await fetchItem(config.registry, target.id);
		} catch (error) {
			p.log.error(
				error instanceof RegistryError ? error.message : String(error),
			);
			return 1;
		}

		const fileName = targetFileName(target.component, target.variant);
		const dest = join(root, config.componentsDir, fileName);
		const shown = relative(root, dest).replace(/\\/g, "/");

		if (existsSync(dest) && !options.overwrite) {
			if (options.yes) {
				p.log.warn(`Skipped ${shown} (already exists)`);
				continue;
			}
			const answer = await p.confirm({
				message: `${shown} already exists. Overwrite?`,
				initialValue: false,
			});
			if (p.isCancel(answer)) {
				p.cancel("Cancelled.");
				return 1;
			}
			if (!answer) {
				p.log.warn(`Skipped ${shown}`);
				continue;
			}
		}

		const source = item.files[0];
		if (!source) {
			p.log.error(`${target.id} has no files.`);
			return 1;
		}

		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, source.content);
		written.push(shown);

		for (const dep of item.dependencies) allDeps.set(dep.name, dep.version);
	}

	if (written.length === 0) {
		p.outro("Nothing written.");
		return 0;
	}

	p.log.success(`Added\n${written.map((f) => `  ${f}`).join("\n")}`);

	const missing = missingDependencies(
		root,
		[...allDeps].map(([name, version]) => ({ name, version })),
	);
	const satisfied = [...allDeps.keys()].filter(
		(name) => !missing.some((m) => m.name === name),
	);

	if (allDeps.size > 0) {
		const lines = [
			...satisfied.map(
				(n) => `  ${c.green("✔")} ${n} ${c.dim("already installed")}`,
			),
			...missing.map((d) => `  ${c.yellow("+")} ${d.name}@${d.version}`),
		];
		p.log.info(`Dependencies\n${lines.join("\n")}`);
	}

	if (missing.length > 0) {
		const pm = detectPackageManager(root);
		const specs = missing.map((d) => `${d.name}@${d.version}`);

		let install = options.yes;
		if (!install) {
			const answer = await p.confirm({
				message: `Install ${missing.length} missing package${missing.length > 1 ? "s" : ""} with ${c.bold(pm)}?`,
			});
			if (p.isCancel(answer)) {
				p.cancel("Cancelled.");
				return 1;
			}
			install = answer;
		}

		if (install) {
			const { command, args } = installCommand(pm, specs);
			const run = spawnSync(command, args, {
				cwd: root,
				stdio: "inherit",
				shell: process.platform === "win32",
			});
			if (run.status !== 0) {
				p.log.error(`${command} exited with ${run.status ?? "an error"}.`);
				return 1;
			}
		} else {
			p.log.info(
				`Install manually:\n  ${detectPackageManager(root)} add ${specs.join(" ")}`,
			);
		}
	}

	p.outro("Done.");
	return 0;
}

/**
 * Substring matching alone misses the most common typo: a single wrong or
 * dropped letter, where neither string contains the other ("buton" vs
 * "button"). Edit distance catches those, and substring still catches the
 * half-remembered name ("dialog" for "alert-dialog").
 */
function editDistance(a: string, b: string): number {
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			row[j] = Math.min(
				(row[j - 1] as number) + 1,
				(prev[j] as number) + 1,
				(prev[j - 1] as number) + cost,
			);
		}
		prev = row;
	}
	return prev[b.length] as number;
}

function suggest(components: RegistryComponent[], name: string): void {
	const near = components
		.map((x) => x.component)
		.map((x) => ({
			name: x,
			score: x.includes(name) || name.includes(x) ? 0 : editDistance(x, name),
		}))
		// Two edits is generous enough for a slip, tight enough that unrelated
		// names do not show up as suggestions.
		.filter((x) => x.score <= 2)
		.sort((a, b) => a.score - b.score)
		.slice(0, 5)
		.map((x) => x.name);

	if (near.length) p.log.info(`Did you mean: ${near.join(", ")}`);
	else p.log.info(`Run ${runner()} list to see everything.`);
}
