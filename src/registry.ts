export const DEFAULT_REGISTRY = "https://yummacss.com/ui/r";

export interface RegistryDependency {
	name: string;
	version: string;
}

export interface RegistryFile {
	path: string;
	target: string;
	content: string;
}

export type RegistryKind = "component" | "block" | "example";

export interface RegistryItem {
	id: string;
	component: string;
	variant: string;
	kind: RegistryKind;
	useClient: boolean;
	dependencies: RegistryDependency[];
	registryDependencies: string[];
	files: RegistryFile[];
}

export interface RegistryComponent {
	component: string;
	title: string;
	base: string;
}

export interface RegistryBlock {
	id: string;
	component: string;
}

export interface RegistryIndex {
	components: RegistryComponent[];
	blocks: RegistryBlock[];
	generated: number;
}

export class RegistryError extends Error {}

async function getJson<T>(url: string): Promise<T> {
	let res: Response;
	try {
		res = await fetch(url, { headers: { accept: "application/json" } });
	} catch (cause) {
		throw new RegistryError(
			`Could not reach the registry at ${url}. Are you online?`,
			{ cause },
		);
	}

	if (res.status === 404) throw new RegistryError(`Not found: ${url}`);
	if (!res.ok) {
		throw new RegistryError(`Registry returned ${res.status} for ${url}`);
	}

	try {
		return (await res.json()) as T;
	} catch (cause) {
		throw new RegistryError(`Registry sent invalid JSON from ${url}`, {
			cause,
		});
	}
}

export function fetchIndex(registry: string): Promise<RegistryIndex> {
	return getJson<RegistryIndex>(`${registry}/index.json`);
}

export function fetchItem(registry: string, id: string): Promise<RegistryItem> {
	return getJson<RegistryItem>(`${registry}/${id}.json`);
}

export interface StyleSpec {
	name: string;
	radius: string;
	allow: string[];
	refused: Record<string, string>;
}

export interface StylesTable {
	default: string;
	styles: Record<string, StyleSpec>;
}

export function fetchStyles(registry: string): Promise<StylesTable> {
	return getJson<StylesTable>(`${registry}/styles.json`);
}

// the registry folder for a style and radius, or why the pair is refused
export function resolveStyle(
	table: StylesTable,
	style: string | null,
	radius: string | null,
): { folder: string } | { error: string } {
	const name = style ?? table.default;
	const spec = table.styles[name];
	if (!spec) {
		const known = Object.keys(table.styles).join(", ");
		return { error: `There is no ${name} style. Try one of: ${known}.` };
	}
	const step = radius ?? spec.radius;
	if (!spec.allow.includes(step)) {
		const reason = spec.refused[step] ?? `${spec.name} does not take ${step}.`;
		return {
			error: `${reason} ${spec.name} takes: ${spec.allow.join(", ")}.`,
		};
	}
	return { folder: `${name}-${step}` };
}
