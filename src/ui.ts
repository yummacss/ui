import { styleText } from "node:util";
import * as p from "@clack/prompts";
import { version } from "../package.json";
import {
	CONFIG_FILE,
	type Config,
	findProjectRoot,
	readConfig,
	runner,
} from "./project";
import { fetchIndex, type RegistryIndex } from "./registry";

type Format = Parameters<typeof styleText>[0];
const style = (format: Format) => (text: string) => styleText(format, text);

export const c = {
	bold: style("bold"),
	dim: style("dim"),
	cyan: style("cyan"),
	green: style("green"),
	yellow: style("yellow"),
	red: style("red"),
};

export const plural = (n: number, word: string) =>
	`${n} ${word}${n === 1 ? "" : "s"}`;

export function intro(): void {
	p.intro(`${c.bold("yummaui")} ${c.dim(`v${version}`)}`);
}

// ends the run on an error; every command returns its exit code
export function fail(error: unknown): number {
	p.cancel(error instanceof Error ? error.message : String(error));
	return 1;
}

export function cancelled(): number {
	p.cancel("Cancelled.");
	return 1;
}

export function project(): { root: string; config: Config } | string {
	const root = findProjectRoot();
	if (!root) return "No package.json found. Run this inside a project.";

	const config = readConfig(root);
	if (!config) {
		return `No ${CONFIG_FILE} found. Run ${c.cyan(`${runner(root)} init`)} first.`;
	}
	return { root, config };
}

export async function loadIndex(registry: string): Promise<RegistryIndex> {
	const s = p.spinner();
	s.start("Reading the registry");
	try {
		const index = await fetchIndex(registry);
		s.stop(`${plural(index.components.length, "component")} in the registry`);
		return index;
	} catch (error) {
		s.error("Registry unavailable");
		throw error;
	}
}
