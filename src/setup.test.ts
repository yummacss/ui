import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { planSetup, sources, stylesheet } from "./setup";

const dirs: string[] = [];

function project(files: Record<string, string | object>): string {
	const dir = mkdtempSync(join(tmpdir(), "yummaui-"));
	dirs.push(dir);
	for (const [name, body] of Object.entries(files)) {
		const path = join(dir, name);
		mkdirSync(join(path, ".."), { recursive: true });
		writeFileSync(
			path,
			typeof body === "string" ? body : JSON.stringify(body, null, 2),
		);
	}
	return dir;
}

afterEach(() => {
	for (const dir of dirs.splice(0))
		rmSync(dir, { recursive: true, force: true });
});

async function run(dir: string) {
	const plan = planSetup(dir, "components/ui");
	for (const step of plan.steps) await step.apply();
	return plan;
}

const read = (dir: string, file: string) =>
	readFileSync(join(dir, file), "utf8");

describe("planSetup on Vite", () => {
	const vite = () =>
		project({
			"package.json": { devDependencies: { vite: "7" } },
			"vite.config.ts": `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`,
			"src/main.tsx": `import "./index.css";\n`,
			"src/index.css": "body { margin: 0; }\n",
		});

	it("installs both packages and registers the plugin", async () => {
		const dir = vite();
		const plan = await run(dir);
		expect(plan.packages).toEqual(["yummacss", "@yummacss/vite"]);
		expect(plan.manual).toEqual([]);
		const config = read(dir, "vite.config.ts");
		expect(config).toContain(`import yummacss from "@yummacss/vite"`);
		expect(config).toMatch(/plugins: \[react\(\), yummacss\(\)\]/);
	});

	it("writes the config and marks the stylesheet the entry imports", async () => {
		const dir = vite();
		await run(dir);
		expect(read(dir, "yumma.config.mjs")).toContain(
			`source: ["./src/**/*.{js,jsx,ts,tsx,mdx}", "./components/**/*.{js,jsx,ts,tsx,mdx}"]`,
		);
		expect(read(dir, "src/index.css")).toBe(
			"@yummacss;\n\nbody { margin: 0; }\n",
		);
	});

	it("has nothing left to do the second time", async () => {
		const dir = vite();
		await run(dir);
		const deps = { yummacss: "4", "@yummacss/vite": "4", vite: "7" };
		writeFileSync(
			join(dir, "package.json"),
			JSON.stringify({ devDependencies: deps }),
		);
		expect(planSetup(dir, "components/ui")).toEqual({
			packages: [],
			steps: [],
			manual: [],
		});
	});
});

describe("planSetup on Next.js", () => {
	it("extends an existing PostCSS config", async () => {
		const dir = project({
			"package.json": { dependencies: { next: "16" } },
			"app/globals.css": "",
			"postcss.config.mjs": `const config = {\n  plugins: {\n    autoprefixer: {},\n  },\n};\n\nexport default config;\n`,
		});
		await run(dir);
		const config = read(dir, "postcss.config.mjs");
		expect(config).toContain(`"@yummacss/postcss": {}`);
		expect(config).toContain("autoprefixer");
		expect(read(dir, "app/globals.css")).toBe("@yummacss;\n\n");
	});

	it("writes a PostCSS config when there is none", async () => {
		const dir = project({
			"package.json": { dependencies: { next: "16" } },
			"src/app/globals.css": "",
		});
		const plan = await run(dir);
		expect(plan.packages).toContain("@yummacss/postcss");
		expect(read(dir, "postcss.config.mjs")).toContain("@yummacss/postcss");
	});
});

describe("planSetup without a known build", () => {
	it("leaves the build to the reader and says so", () => {
		const dir = project({ "package.json": {} });
		const plan = planSetup(dir, "components/ui");
		expect(plan.packages).toEqual(["yummacss"]);
		expect(plan.manual).toHaveLength(2);
	});
});

describe("stylesheet", () => {
	it("falls back to a conventional name when the entry imports none", () => {
		const dir = project({ "src/main.ts": "", "src/style.css": "" });
		expect(stylesheet(dir, "vite")).toBe("src/style.css");
	});

	it("finds nothing rather than guessing", () => {
		expect(stylesheet(project({}), "vite")).toBeNull();
	});
});

describe("sources", () => {
	it("covers the components folder even before it exists", () => {
		const dir = project({ "app/page.tsx": "" });
		expect(sources(dir, "components/ui")).toEqual([
			"./app/**/*.{js,jsx,ts,tsx,mdx}",
			"./components/**/*.{js,jsx,ts,tsx,mdx}",
		]);
	});
});
