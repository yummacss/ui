import { spawn } from "node:child_process";
import * as p from "@clack/prompts";
import { m } from "./messages";
import { type detectPackageManager, installCommand } from "./project";
import { tag } from "./ui";

// streams the package manager into a log that folds away when it succeeds
export function installPackages(
	root: string,
	pm: ReturnType<typeof detectPackageManager>,
	specs: string[],
	dev = false,
): Promise<boolean> {
	const packages = specs.map((spec) => spec.slice(0, spec.lastIndexOf("@")));
	const { command, args } = installCommand(pm, specs, dev);
	const log = p.taskLog({
		title: tag("install", m.install.running(pm)),
		limit: 8,
	});
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
			log.error(tag("install", m.install.noStart(command)));
			resolve(false);
		});
		child.on("close", (code) => {
			if (code === 0) log.success(tag("install", packages.join(", ")));
			else
				log.error(tag("install", m.install.exited(command, code)), {
					showLog: true,
				});
			resolve(code === 0);
		});
	});
}
