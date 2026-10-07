import { afterEach, describe, expect, it, vi } from "vitest";
import { nearest, resolveNames, targetFileName } from "./commands/add";
import {
	fetchIndex,
	fetchItem,
	fetchStyles,
	RegistryError,
	resolveStyle,
	type StylesTable,
} from "./registry";

afterEach(() => {
	vi.unstubAllGlobals();
});

function respond(body: string, init: ResponseInit = {}) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => new Response(body, { status: 200, ...init })),
	);
}

describe("targetFileName", () => {
	it("drops the suffix for a component", () => {
		expect(targetFileName("button", "button", "base")).toBe("button.tsx");
		expect(targetFileName("alert-dialog", "alert-dialog", "base")).toBe(
			"alert-dialog.tsx",
		);
	});

	it("keeps the whole id for an example", () => {
		expect(targetFileName("select-grouped", "select", "grouped")).toBe(
			"select-grouped.tsx",
		);
	});
});

describe("nearest", () => {
	const index = {
		components: ["button", "button-group", "accordion", "dialog"].map(
			(component) => ({ component, title: component, base: component }),
		),
		generated: 0,
	};

	it("suggests the names a typo is close to, nearest first", () => {
		expect(nearest(index, "buton")).toEqual(["button"]);
		expect(nearest(index, "accordian")).toEqual(["accordion"]);
		expect(nearest(index, "dialgo")).toEqual(["dialog"]);
	});

	it("suggests nothing for an unrelated word", () => {
		expect(nearest(index, "zzzzz")).toEqual([]);
	});
});

describe("registry fetching", () => {
	it("reads the index", async () => {
		respond(JSON.stringify({ components: [], generated: 0 }));
		await expect(fetchIndex("http://x/ui/r")).resolves.toEqual({
			components: [],
			generated: 0,
		});
	});

	it("requests the id it was given", async () => {
		const spy = vi.fn(async () => new Response("{}", { status: 200 }));
		vi.stubGlobal("fetch", spy);
		await fetchItem("http://x/ui/r", "button-pill");
		expect(spy).toHaveBeenCalledWith(
			"http://x/ui/r/button-pill.json",
			expect.anything(),
		);
	});

	it("reports a 404 as not found rather than parsing the HTML error page", async () => {
		respond("<!DOCTYPE html><html>404</html>", { status: 404 });
		await expect(fetchItem("http://x/ui/r", "nope")).rejects.toThrow(
			RegistryError,
		);
		await expect(fetchItem("http://x/ui/r", "nope")).rejects.toThrow(
			/Not found/,
		);
	});

	it("surfaces other error statuses", async () => {
		respond("upstream is unwell", { status: 503 });
		await expect(fetchIndex("http://x/ui/r")).rejects.toThrow(/503/);
	});

	it("explains malformed JSON on a 200", async () => {
		respond("{ truncated");
		await expect(fetchIndex("http://x/ui/r")).rejects.toThrow(/invalid JSON/);
	});

	it("explains a network failure instead of leaking the fetch error", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new TypeError("fetch failed");
			}),
		);
		await expect(fetchIndex("http://x/ui/r")).rejects.toThrow(
			/Could not reach the registry/,
		);
	});
});

describe("resolveNames", () => {
	const index = {
		components: [
			{ component: "button", title: "Button", base: "button" },
			{ component: "dialog", title: "Dialog", base: "dialog" },
			{ component: "badge", title: "Badge", base: "badge" },
		],
		generated: 5,
	};

	it("resolves components by name", () => {
		expect(resolveNames(index, ["button", "dialog"])).toEqual({
			ids: ["button", "dialog"],
		});
	});

	it("treats a bare `all` as an unknown name, since it is a flag", () => {
		expect(resolveNames(index, ["all"])).toEqual({ unknown: "all" });
	});

	it("reports the first unknown name rather than guessing", () => {
		expect(resolveNames(index, ["button", "nope"])).toEqual({
			unknown: "nope",
		});
	});
});

describe("resolveNames with --all", () => {
	const index = {
		components: [
			{ component: "button", title: "Button", base: "button" },
			{ component: "dialog", title: "Dialog", base: "dialog" },
		],
		generated: 3,
	};

	it("expands to every component with no names given", () => {
		expect(resolveNames(index, [], { all: true })).toEqual({
			ids: ["button", "dialog"],
		});
	});

	it("combines with a named component without duplicating it", () => {
		expect(resolveNames(index, ["dialog"], { all: true })).toEqual({
			ids: ["button", "dialog"],
		});
	});

	it("leaves the name `all` free for the registry to use", () => {
		const shadowed = {
			...index,
			components: [
				...index.components,
				{ component: "all", title: "All", base: "all" },
			],
		};
		expect(resolveNames(shadowed, [], { all: true })).toEqual({
			ids: ["button", "dialog", "all"],
		});
		expect(resolveNames(shadowed, ["all"])).toEqual({ ids: ["all"] });
	});
});

describe("styles", () => {
	const table: StylesTable = {
		default: "soft",
		styles: {
			soft: {
				name: "Soft",
				radius: "large",
				allow: ["small", "medium", "large", "extra"],
				refused: { none: "Soft is rounded. No radius is a square." },
			},
			squircle: {
				name: "Squircle",
				radius: "large",
				allow: ["medium", "large"],
				refused: { none: "A squircle with no radius is a square." },
			},
		},
	};

	it("picks the folder for a style and its default radius", () => {
		expect(resolveStyle(table, "squircle", null)).toEqual({
			folder: "squircle-large",
		});
		expect(resolveStyle(table, null, "small")).toEqual({
			folder: "soft-small",
		});
	});

	it("refuses a blocked pair with the reason", () => {
		const result = resolveStyle(table, "squircle", "none");
		expect(result).toEqual({
			error:
				"A squircle with no radius is a square. Squircle takes: medium, large.",
		});
	});

	it("names the styles that exist", () => {
		expect(resolveStyle(table, "glass", null)).toEqual({
			error: "There is no glass style. Try one of: soft, squircle.",
		});
	});

	it("fetches styles.json from the registry root", async () => {
		respond(JSON.stringify(table));
		await expect(fetchStyles("https://x.test/ui/r")).resolves.toEqual(table);
		expect(fetch).toHaveBeenCalledWith(
			"https://x.test/ui/r/styles.json",
			expect.anything(),
		);
	});
});
