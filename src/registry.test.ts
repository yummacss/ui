import { afterEach, describe, expect, it, vi } from "vitest";
import { editDistance, targetFileName } from "./commands/add";
import { fetchIndex, fetchItem, RegistryError } from "./registry";

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
	// The whole point of the -base rename: the base is the component's name, a
	// variant keeps its suffix so the file still says what it is.
	it("drops the suffix for base and keeps it for a variant", () => {
		expect(targetFileName("button", "base")).toBe("button.tsx");
		expect(targetFileName("button", "pill")).toBe("button-pill.tsx");
		expect(targetFileName("alert-dialog", "base")).toBe("alert-dialog.tsx");
		expect(targetFileName("alert-dialog", "destructive")).toBe(
			"alert-dialog-destructive.tsx",
		);
	});
});

describe("editDistance", () => {
	it("scores the typos that substring matching misses", () => {
		// Neither string contains the other, which is why substring alone failed.
		expect(editDistance("button", "buton")).toBe(1); // a dropped letter
		expect(editDistance("accordion", "accordian")).toBe(1); // one wrong letter
		// A transposition costs 2 under plain Levenshtein, which is still inside
		// the threshold `suggest` uses.
		expect(editDistance("dialog", "dialgo")).toBe(2);
	});

	it("is zero for an exact match and large for an unrelated word", () => {
		expect(editDistance("button", "button")).toBe(0);
		expect(editDistance("button", "zzzzz")).toBeGreaterThan(2);
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

	/**
	 * The registry is static files behind a normal web server, so a miss returns
	 * that server's HTML 404 page. Parsing it would surface a typo as a JSON
	 * error pointing at `<!DOCTYPE`, which tells the user nothing.
	 */
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
