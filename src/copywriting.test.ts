import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// every sentence the CLI prints lives in messages.ts
const source = readFileSync(new URL("./messages.ts", import.meta.url), "utf8");

const strings = [...source.matchAll(/"([^"\n]*)"|`([^`]*)`/g)]
	.map((match) => (match[1] ?? match[2] ?? "").replace(/\$\{[^}]*\}/g, " "))
	.filter((text) => /[a-z]{3}/i.test(text) && text.trim().includes(" "));

function offenders(pattern: RegExp): string[] {
	return strings
		.filter((text) => pattern.test(text))
		.map((text) => text.trim());
}

describe("CLI copy", () => {
	it("has copy to check", () => {
		expect(strings.length).toBeGreaterThan(10);
	});

	it("uses no em dashes", () => {
		expect(offenders(/—/)).toEqual([]);
	});

	it("uses no contractions", () => {
		expect(offenders(/\b\w+(?:n't|'re|'ll|'ve|'d)\b|\bit's\b/i)).toEqual([]);
	});

	it("spells `cannot` as one word", () => {
		expect(offenders(/\bcan not\b/)).toEqual([]);
	});

	it("uses US spelling", () => {
		expect(
			offenders(/\b\w*(?:behaviour|colour|recognis|normalis|centre)\w*/i),
		).toEqual([]);
	});

	it("never mentions Tailwind", () => {
		expect(offenders(/\btailwind\b/i)).toEqual([]);
	});

	it("calls the focus indicator an outline", () => {
		expect(offenders(/\brings?\b/i)).toEqual([]);
	});

	it("spells an ellipsis as one character", () => {
		expect(offenders(/[A-Za-z,)]\s*\.{3}(?![\w$])/)).toEqual([]);
	});
});
