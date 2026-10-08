import { existsSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import type { Flags } from "../cli";
import { m } from "../messages";
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
import { setUpStyling } from "../setup";
import { c, cancelled, fail, intro, outro, say } from "../ui";

export async function init(flags: Flags): Promise<number> {
	intro();

	const root = findProjectRoot();
	if (!root) return fail(m.project.missing);

	if (readConfig(root) && !flags.force) {
		outro("next", m.init.exists());
		return 0;
	}

	const framework = detectFramework(root);
	const alias = detectAlias(root);
	say.info(
		"project",
		m.init.detected(framework, detectPackageManager(root), alias),
	);

	const fallback = existsSync(join(root, "src"))
		? "src/components/ui"
		: "components/ui";
	const componentsDir = flags.yes
		? fallback
		: await p.text({
				message: m.init.where,
				placeholder: fallback,
				defaultValue: fallback,
			});
	if (p.isCancel(componentsDir)) return cancelled();

	let useAlias = Boolean(alias);
	if (alias && !flags.yes) {
		const answer = await p.confirm({
			message: m.init.useAlias(alias),
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

	if (!(await setUpStyling(root, componentsDir, flags.yes === true))) return 1;

	outro("next", c.accent(`${runner(root)} add`));
	return 0;
}
