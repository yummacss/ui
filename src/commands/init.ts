import * as p from "@clack/prompts";
import type { Flags } from "../cli";
import {
	CONFIG_FILE,
	type Config,
	detectAlias,
	detectFramework,
	detectPackageManager,
	findProjectRoot,
	readConfig,
	runner,
	writeConfig,
} from "../project";
import { DEFAULT_REGISTRY } from "../registry";
import { warnStyling } from "../styling";
import { c, cancelled, fail, intro, outro, say } from "../ui";

export async function init(flags: Flags): Promise<number> {
	intro();

	const root = findProjectRoot();
	if (!root) return fail("No package.json found. Run this inside a project.");

	if (readConfig(root) && !flags.force) {
		outro("next", `${CONFIG_FILE} exists. ${c.accent("--force")} replaces it.`);
		return 0;
	}

	const framework = detectFramework(root);
	const alias = detectAlias(root);
	say.info(
		"project",
		`${framework ?? "No framework"} with ${detectPackageManager(root)}${
			alias ? `, imports through ${alias}/` : ""
		}`,
	);

	const componentsDir = flags.yes
		? "components/ui"
		: await p.text({
				message: "Where do components go?",
				placeholder: "components/ui",
				defaultValue: "components/ui",
			});
	if (p.isCancel(componentsDir)) return cancelled();

	let useAlias = Boolean(alias);
	if (alias && !flags.yes) {
		const answer = await p.confirm({
			message: `Import them through ${c.bold(`${alias}/`)}?`,
		});
		if (p.isCancel(answer)) return cancelled();
		useAlias = answer;
	}

	const config: Config = {
		componentsDir,
		alias: useAlias ? `${alias}/${componentsDir}` : null,
		registry: DEFAULT_REGISTRY,
	};
	writeConfig(root, config);
	say.done("write", CONFIG_FILE);

	warnStyling(root);

	outro("next", c.accent(`${runner(root)} add`));
	return 0;
}
