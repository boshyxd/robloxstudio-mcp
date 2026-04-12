import Utils from "../Utils";

const { getInstancePath, getInstanceByPath, readScriptSource } = Utils;
const CollectionService = game.GetService("CollectionService");
const HttpService = game.GetService("HttpService");

const DEFAULT_COMPACT_MAX_NODES = 200;
const DEFAULT_SEARCH_MAX_RESULTS = 50;
const DEFAULT_MAX_CHILDREN = 50;
const MAX_SUMMARY_STRING_LENGTH = 240;

interface TreeNode {
	name: string;
	className: string;
	path?: string;
	children: TreeNode[];
	hasSource?: boolean;
	scriptType?: string;
	enabled?: boolean;
}

function getRootInstance(requestData: Record<string, unknown>): LuaTuple<[Instance | undefined, string]> {
	const rootPath = (requestData.rootPath as string) ?? (requestData.path as string) ?? "game";
	return [getInstanceByPath(rootPath), rootPath] as unknown as LuaTuple<[Instance | undefined, string]>;
}

function getNumberOption(
	requestData: Record<string, unknown>,
	name: string,
	defaultValue: number,
	minValue: number,
	maxValue: number,
): number {
	const rawValue = requestData[name];
	const numericValue = typeIs(rawValue, "number") ? rawValue : defaultValue;
	return math.clamp(math.floor(numericValue), minValue, maxValue);
}

function containsIgnoreCase(value: unknown, query: string | undefined): boolean {
	if (query === undefined || query === "") return true;
	return tostring(value).lower().find(query.lower(), 1, true)[0] !== undefined;
}

function normalizeStringList(value: unknown): string[] {
	const results: string[] = [];
	if (typeIs(value, "string")) {
		for (const [entry] of value.gmatch("[^,%s]+")) {
			results.push((entry as string).lower());
		}
	} else if (typeIs(value, "table")) {
		for (const entry of value as unknown[]) {
			if (typeIs(entry, "string")) results.push(entry.lower());
		}
	}
	return results;
}

function normalizeRawStringList(value: unknown): string[] {
	const results: string[] = [];
	if (typeIs(value, "string")) {
		for (const [entry] of value.gmatch("[^,%s]+")) {
			results.push(entry as string);
		}
	} else if (typeIs(value, "table")) {
		for (const entry of value as unknown[]) {
			if (typeIs(entry, "string")) results.push(entry);
		}
	}
	return results;
}

function stringListHas(values: string[], value: string): boolean {
	const lowerValue = value.lower();
	for (const candidate of values) {
		if (candidate === lowerValue) return true;
	}
	return false;
}

function shouldIncludeInMap(instance: Instance, include: string[]): boolean {
	if (include.size() === 0 || stringListHas(include, "all")) return true;
	if (stringListHas(include, "scripts") && instance.IsA("LuaSourceContainer")) return true;
	if (stringListHas(include, instance.ClassName)) return true;
	return false;
}

function compactString(value: string, maxLength = MAX_SUMMARY_STRING_LENGTH): string {
	let result = value.gsub("\n", "\\n")[0].gsub("\r", "\\r")[0];
	if (result.size() > maxLength) {
		result = `${result.sub(1, maxLength)}...`;
	}
	return result;
}

function compactValue(value: unknown): unknown {
	const valueType = typeOf(value);
	if (valueType === "Vector3") {
		const v = value as Vector3;
		return { x: v.X, y: v.Y, z: v.Z };
	}
	if (valueType === "Vector2") {
		const v = value as Vector2;
		return { x: v.X, y: v.Y };
	}
	if (valueType === "Color3") {
		const v = value as Color3;
		return { r: v.R, g: v.G, b: v.B };
	}
	if (valueType === "CFrame") {
		const v = value as CFrame;
		return { position: { x: v.Position.X, y: v.Position.Y, z: v.Position.Z } };
	}
	if (valueType === "UDim2") {
		const v = value as UDim2;
		return {
			x: { scale: v.X.Scale, offset: v.X.Offset },
			y: { scale: v.Y.Scale, offset: v.Y.Offset },
		};
	}
	if (valueType === "BrickColor") {
		const v = value as BrickColor;
		return v.Name;
	}
	if (typeIs(value, "string")) {
		return compactString(value);
	}
	if (value === undefined) return "nil";
	return tostring(value);
}

function compactValueForText(value: unknown): string {
	if (typeIs(value, "string")) return value;
	if (typeIs(value, "table")) {
		const [ok, encoded] = pcall(() => HttpService.JSONEncode(value));
		if (ok) return compactString(encoded);
	}
	return compactString(tostring(value));
}

function formatMapLine(instance: Instance, depth: number): string {
	const childCount = instance.GetChildren().size();
	const flags: string[] = [];
	let sourceInfo = "";

	if (instance.IsA("LuaSourceContainer")) {
		flags.push("source");
		const source = readScriptSource(instance);
		const [lines] = Utils.splitLines(source);
		sourceInfo = `lines=${lines.size()} len=${source.size()}`;
		if (instance.IsA("BaseScript") && !instance.Enabled) flags.push("disabled");
	}
	if (instance.IsA("GuiObject")) flags.push("gui");
	if (instance.IsA("BasePart")) flags.push("part");

	const indent = string.rep("  ", depth);
	return `${indent}${getInstancePath(instance)} | ${instance.ClassName} | children=${childCount} | flags=${flags.size() > 0 ? flags.join(",") : "-"} | ${sourceInfo}`;
}

function getProjectMap(requestData: Record<string, unknown>) {
	const [rootInstance, rootPath] = getRootInstance(requestData);
	if (!rootInstance) return { error: `Path not found: ${rootPath}` };

	const maxDepth = getNumberOption(requestData, "maxDepth", 4, 0, 50);
	const maxNodes = getNumberOption(requestData, "maxNodes", DEFAULT_COMPACT_MAX_NODES, 1, 5000);
	const offset = getNumberOption(requestData, "offset", 0, 0, math.huge);
	const include = normalizeStringList(requestData.include);
	const format = ((requestData.format as string) ?? "compact").lower();

	const entries: Record<string, unknown>[] = [];
	const lines: string[] = [];
	let matchingSeen = 0;
	let emitted = 0;
	let truncated = false;
	let depthLimited = false;

	function visit(instance: Instance, depth: number) {
		if (truncated) return;

		if (shouldIncludeInMap(instance, include)) {
			if (matchingSeen >= offset) {
				if (emitted >= maxNodes) {
					truncated = true;
					return;
				}
				lines.push(formatMapLine(instance, depth));
				entries.push({
					path: getInstancePath(instance),
					name: instance.Name,
					className: instance.ClassName,
					depth,
					childCount: instance.GetChildren().size(),
					hasSource: instance.IsA("LuaSourceContainer"),
				});
				emitted++;
			}
			matchingSeen++;
		}

		const children = instance.GetChildren();
		if (depth >= maxDepth) {
			if (children.size() > 0) depthLimited = true;
			return;
		}

		for (const child of children) {
			visit(child, depth + 1);
			if (truncated) return;
		}
	}

	visit(rootInstance, 0);

	const metadata = `project_map root=${rootPath} count=${emitted} skipped=${offset} maxDepth=${maxDepth} maxNodes=${maxNodes} truncated=${truncated || depthLimited}${truncated ? ` nextOffset=${offset + emitted}` : ""}`;
	if (format === "json") {
		return {
			format: "json",
			rootPath,
			entries,
			count: emitted,
			skipped: offset,
			maxDepth,
			maxNodes,
			truncated: truncated || depthLimited,
			nextOffset: truncated ? offset + emitted : undefined,
			note: truncated || depthLimited ? "Use rootPath/maxDepth/maxNodes/offset to continue or narrow the map." : undefined,
		};
	}

	return {
		format: "compact",
		text: `${metadata}\npath | class | children | flags | source\n${lines.join("\n")}`,
		rootPath,
		count: emitted,
		skipped: offset,
		truncated: truncated || depthLimited,
		nextOffset: truncated ? offset + emitted : undefined,
	};
}

function instanceMatchesFilters(instance: Instance, requestData: Record<string, unknown>): boolean {
	const name = requestData.name as string | undefined;
	const className = requestData.className as string | undefined;
	const isA = requestData.isA as string | undefined;
	const tag = requestData.tag as string | undefined;
	const propertyName = requestData.propertyName as string | undefined;
	const propertyValue = requestData.propertyValue as string | undefined;
	const hasSource = requestData.hasSource as boolean | undefined;

	if (name && !containsIgnoreCase(instance.Name, name)) return false;
	if (className && !containsIgnoreCase(instance.ClassName, className)) return false;
	if (isA && !instance.IsA(isA as keyof Instances)) return false;
	if (tag && !CollectionService.HasTag(instance, tag)) return false;
	if (hasSource !== undefined && instance.IsA("LuaSourceContainer") !== hasSource) return false;
	if (propertyName) {
		const [ok, value] = pcall(() => tostring((instance as unknown as Record<string, unknown>)[propertyName]));
		if (!ok) return false;
		if (propertyValue !== undefined && !containsIgnoreCase(value, propertyValue)) return false;
	}

	return true;
}

function formatInstanceResult(instance: Instance): string {
	const childCount = instance.GetChildren().size();
	const flags: string[] = [];
	if (instance.IsA("LuaSourceContainer")) flags.push("source");
	if (instance.IsA("BaseScript") && !instance.Enabled) flags.push("disabled");
	if (instance.IsA("GuiObject")) flags.push("gui");
	if (instance.IsA("BasePart")) flags.push("part");
	return `${getInstancePath(instance)} | ${instance.ClassName} | name=${instance.Name} | children=${childCount} | flags=${flags.size() > 0 ? flags.join(",") : "-"}`;
}

function findInstances(requestData: Record<string, unknown>) {
	const [rootInstance, rootPath] = getRootInstance(requestData);
	if (!rootInstance) return { error: `Path not found: ${rootPath}` };

	const maxResults = getNumberOption(requestData, "maxResults", DEFAULT_SEARCH_MAX_RESULTS, 1, 1000);
	const offset = getNumberOption(requestData, "offset", 0, 0, math.huge);
	const results: Record<string, unknown>[] = [];
	const lines: string[] = [];
	let matchedSeen = 0;
	let truncated = false;

	function visit(instance: Instance) {
		if (truncated) return;
		if (instanceMatchesFilters(instance, requestData)) {
			if (matchedSeen >= offset) {
				if (results.size() >= maxResults) {
					truncated = true;
					return;
				}
				results.push({
					path: getInstancePath(instance),
					name: instance.Name,
					className: instance.ClassName,
					childCount: instance.GetChildren().size(),
					hasSource: instance.IsA("LuaSourceContainer"),
				});
				lines.push(formatInstanceResult(instance));
			}
			matchedSeen++;
		}

		for (const child of instance.GetChildren()) {
			visit(child);
			if (truncated) return;
		}
	}

	visit(rootInstance);

	return {
		format: "compact",
		text: `find_instances root=${rootPath} count=${results.size()} skipped=${offset} maxResults=${maxResults} truncated=${truncated}${truncated ? ` nextOffset=${offset + results.size()}` : ""}\npath | class | name | children | flags\n${lines.join("\n")}`,
		rootPath,
		results,
		count: results.size(),
		skipped: offset,
		truncated,
		nextOffset: truncated ? offset + results.size() : undefined,
	};
}

function scriptMatchesSource(source: string, requestData: Record<string, unknown>): boolean {
	const query = requestData.query as string | undefined;
	const dependency = requestData.dependency as string | undefined;
	const service = requestData.service as string | undefined;
	const lowerSource = source.lower();

	if (query && lowerSource.find(query.lower(), 1, true)[0] === undefined) return false;
	if (dependency && lowerSource.find(dependency.lower(), 1, true)[0] === undefined) return false;
	if (service && lowerSource.find(service.lower(), 1, true)[0] === undefined) return false;
	return true;
}

function findFirstMatchingLine(lines: string[], requestData: Record<string, unknown>): LuaTuple<[number | undefined, string | undefined]> {
	const query = requestData.query as string | undefined;
	const dependency = requestData.dependency as string | undefined;
	const service = requestData.service as string | undefined;
	const patterns: string[] = [];
	if (query) patterns.push(query.lower());
	if (dependency) patterns.push(dependency.lower());
	if (service) patterns.push(service.lower());
	if (patterns.size() === 0) return [undefined, undefined] as unknown as LuaTuple<[number | undefined, string | undefined]>;

	for (let i = 0; i < lines.size(); i++) {
		const lowerLine = lines[i].lower();
		for (const pattern of patterns) {
			if (lowerLine.find(pattern, 1, true)[0] !== undefined) {
				return [i + 1, compactString(lines[i], 220)] as unknown as LuaTuple<[number | undefined, string | undefined]>;
			}
		}
	}
	return [undefined, undefined] as unknown as LuaTuple<[number | undefined, string | undefined]>;
}

function findScripts(requestData: Record<string, unknown>) {
	const [rootInstance, rootPath] = getRootInstance(requestData);
	if (!rootInstance) return { error: `Path not found: ${rootPath}` };

	const classFilter = requestData.classFilter as string | undefined;
	const filesOnly = (requestData.filesOnly as boolean) ?? true;
	const includeSnippet = (requestData.includeSnippet as boolean) ?? false;
	const maxResults = getNumberOption(requestData, "maxResults", DEFAULT_SEARCH_MAX_RESULTS, 1, 1000);
	const offset = getNumberOption(requestData, "offset", 0, 0, math.huge);
	const results: Record<string, unknown>[] = [];
	const linesOut: string[] = [];
	let matchedSeen = 0;
	let scriptsSearched = 0;
	let truncated = false;

	function visit(instance: Instance) {
		if (truncated) return;

		if (instance.IsA("LuaSourceContainer")) {
			if (!classFilter || instance.ClassName === classFilter) {
				scriptsSearched++;
				const source = readScriptSource(instance);
				if (scriptMatchesSource(source, requestData)) {
					if (matchedSeen >= offset) {
						if (results.size() >= maxResults) {
							truncated = true;
							return;
						}

						const [sourceLines] = Utils.splitLines(source);
						const [matchLine, snippet] = findFirstMatchingLine(sourceLines, requestData);
						const result: Record<string, unknown> = {
							path: getInstancePath(instance),
							name: instance.Name,
							className: instance.ClassName,
							lineCount: sourceLines.size(),
							sourceLength: source.size(),
							matchLine,
						};
						if (instance.IsA("BaseScript")) result.enabled = instance.Enabled;
						if (!filesOnly || includeSnippet) result.snippet = snippet;
						results.push(result);

						const snippetPart = (!filesOnly || includeSnippet) && snippet ? ` | line=${matchLine} | ${snippet}` : "";
						linesOut.push(`${getInstancePath(instance)} | ${instance.ClassName} | lines=${sourceLines.size()} len=${source.size()}${snippetPart}`);
					}
					matchedSeen++;
				}
			}
		}

		for (const child of instance.GetChildren()) {
			visit(child);
			if (truncated) return;
		}
	}

	visit(rootInstance);

	return {
		format: "compact",
		text: `find_scripts root=${rootPath} count=${results.size()} scriptsSearched=${scriptsSearched} skipped=${offset} maxResults=${maxResults} filesOnly=${filesOnly} truncated=${truncated}${truncated ? ` nextOffset=${offset + results.size()}` : ""}\npath | class | lines/sourceLength | snippet\n${linesOut.join("\n")}`,
		rootPath,
		results,
		count: results.size(),
		scriptsSearched,
		skipped: offset,
		truncated,
		nextOffset: truncated ? offset + results.size() : undefined,
	};
}

function getLastPathSegment(path: string): string | undefined {
	let result: string | undefined;
	for (const [part] of path.gmatch("[^%.]+")) {
		result = part as string;
	}
	return result;
}

function pushUniquePattern(patterns: string[], value: string | undefined) {
	if (!value || value === "") return;
	const lowerValue = value.lower();
	for (const existing of patterns) {
		if (existing === lowerValue) return;
	}
	patterns.push(lowerValue);
}

function inferReferenceType(requestData: Record<string, unknown>, targetInstance: Instance | undefined): string {
	const rawType = requestData.referenceType as string | undefined;
	if (rawType && rawType !== "auto") return rawType.lower();
	if (targetInstance?.IsA("ModuleScript")) return "module";
	if (targetInstance?.IsA("RemoteEvent") || targetInstance?.IsA("RemoteFunction")) return "remote";
	if (requestData.service !== undefined) return "service";
	if (requestData.symbol !== undefined) return "symbol";
	if (requestData.query !== undefined) return "literal";
	return "literal";
}

function buildReferenceQuery(requestData: Record<string, unknown>) {
	const targetPath = requestData.targetPath as string | undefined;
	const targetInstance = targetPath ? getInstanceByPath(targetPath) : undefined;
	const targetName =
		(requestData.name as string | undefined) ??
		(requestData.targetName as string | undefined) ??
		(requestData.symbol as string | undefined) ??
		(requestData.service as string | undefined) ??
		(requestData.query as string | undefined) ??
		targetInstance?.Name ??
		(targetPath ? getLastPathSegment(targetPath) : undefined);
	const referenceType = inferReferenceType(requestData, targetInstance);
	const patterns: string[] = [];

	pushUniquePattern(patterns, targetName);
	if (targetPath) {
		pushUniquePattern(patterns, targetPath);
		pushUniquePattern(patterns, targetPath.gsub("^game%.", "")[0]);
	}

	return {
		targetPath,
		targetName,
		referenceType,
		patterns,
		targetClassName: targetInstance?.ClassName,
	};
}

function lowerLineHasAnyPattern(lowerLine: string, patterns: string[]): boolean {
	for (const pattern of patterns) {
		if (lowerLine.find(pattern, 1, true)[0] !== undefined) return true;
	}
	return false;
}

function lowerLineHasRemoteUsage(lowerLine: string): boolean {
	const remoteTokens = [
		"remotes", "remoteevent", "remotefunction", "fireserver", "fireclient", "fireallclients",
		"invokeserver", "invokeclient", "onserverevent", "onclientevent",
		"onserverinvoke", "onclientinvoke",
	];
	for (const token of remoteTokens) {
		if (lowerLine.find(token, 1, true)[0] !== undefined) return true;
	}
	return false;
}

function lowerLineMatchesReference(lowerLine: string, referenceType: string, patterns: string[]): boolean {
	if (patterns.size() === 0) return false;
	if (referenceType === "module") {
		return lowerLine.find("require", 1, true)[0] !== undefined && lowerLineHasAnyPattern(lowerLine, patterns);
	}
	if (referenceType === "remote") {
		return lowerLineHasAnyPattern(lowerLine, patterns) && lowerLineHasRemoteUsage(lowerLine);
	}
	if (referenceType === "service") {
		const serviceName = patterns[0];
		const compactLine = lowerLine.gsub("%s+", "")[0];
		return (
			compactLine.find(`getservice("${serviceName}")`, 1, true)[0] !== undefined ||
			compactLine.find(`getservice('${serviceName}')`, 1, true)[0] !== undefined ||
			compactLine.find(`game.${serviceName}`, 1, true)[0] !== undefined
		);
	}
	return lowerLineHasAnyPattern(lowerLine, patterns);
}

function findReferenceInLines(
	lines: string[],
	referenceType: string,
	patterns: string[],
): LuaTuple<[number | undefined, string | undefined, number]> {
	let firstLine: number | undefined;
	let firstSnippet: string | undefined;
	let matchCount = 0;

	for (let i = 0; i < lines.size(); i++) {
		if (lowerLineMatchesReference(lines[i].lower(), referenceType, patterns)) {
			matchCount++;
			if (firstLine === undefined) {
				firstLine = i + 1;
				firstSnippet = compactString(lines[i], 220);
			}
		}
	}

	return [firstLine, firstSnippet, matchCount] as unknown as LuaTuple<[number | undefined, string | undefined, number]>;
}

function findReferences(requestData: Record<string, unknown>) {
	const [rootInstance, rootPath] = getRootInstance(requestData);
	if (!rootInstance) return { error: `Path not found: ${rootPath}` };

	const query = buildReferenceQuery(requestData);
	if (!query.targetName || query.patterns.size() === 0) {
		return { error: "name, targetName, targetPath, symbol, service, or query is required" };
	}

	const classFilter = requestData.classFilter as string | undefined;
	const includeSnippet = (requestData.includeSnippet as boolean) ?? false;
	const maxResults = getNumberOption(requestData, "maxResults", DEFAULT_SEARCH_MAX_RESULTS, 1, 1000);
	const offset = getNumberOption(requestData, "offset", 0, 0, math.huge);
	const results: Record<string, unknown>[] = [];
	const linesOut: string[] = [];
	let matchedSeen = 0;
	let scriptsSearched = 0;
	let truncated = false;

	function visit(instance: Instance) {
		if (truncated) return;

		if (instance.IsA("LuaSourceContainer") && (!classFilter || instance.ClassName === classFilter)) {
			scriptsSearched++;
			const source = readScriptSource(instance);
			const [sourceLines] = Utils.splitLines(source);
			const [matchLine, snippet, matchCount] = findReferenceInLines(sourceLines, query.referenceType, query.patterns);

			if (matchLine !== undefined && matchCount > 0) {
				if (matchedSeen >= offset) {
					if (results.size() >= maxResults) {
						truncated = true;
						return;
					}

					const result: Record<string, unknown> = {
						path: getInstancePath(instance),
						name: instance.Name,
						className: instance.ClassName,
						lineCount: sourceLines.size(),
						sourceLength: source.size(),
						matchLine,
						matchCount,
					};
					if (instance.IsA("BaseScript")) result.enabled = instance.Enabled;
					if (includeSnippet) result.snippet = snippet;
					results.push(result);

					const snippetPart = includeSnippet && snippet ? ` | ${snippet}` : "";
					linesOut.push(`${getInstancePath(instance)} | ${instance.ClassName} | line=${matchLine} | matches=${matchCount}${snippetPart}`);
				}
				matchedSeen++;
			}
		}

		for (const child of instance.GetChildren()) {
			visit(child);
			if (truncated) return;
		}
	}

	visit(rootInstance);

	return {
		format: "compact",
		text: `find_references root=${rootPath} type=${query.referenceType} target=${query.targetName} targetPath=${query.targetPath ?? "-"} count=${results.size()} scriptsSearched=${scriptsSearched} skipped=${offset} maxResults=${maxResults} truncated=${truncated}${truncated ? ` nextOffset=${offset + results.size()}` : ""}\npath | class | line | matches | snippet\n${linesOut.join("\n")}`,
		rootPath,
		referenceType: query.referenceType,
		targetName: query.targetName,
		targetPath: query.targetPath,
		targetClassName: query.targetClassName,
		results,
		count: results.size(),
		scriptsSearched,
		skipped: offset,
		truncated,
		nextOffset: truncated ? offset + results.size() : undefined,
	};
}

function getInstanceSummary(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const includeChildren = (requestData.includeChildren as boolean) ?? false;
	const maxChildren = getNumberOption(requestData, "maxChildren", DEFAULT_MAX_CHILDREN, 1, 500);
	const propertyNames = normalizeRawStringList(requestData.propertyNames);
	const sourceInfo: Record<string, unknown> = {};

	if (instance.IsA("LuaSourceContainer")) {
		const source = readScriptSource(instance);
		const [lines] = Utils.splitLines(source);
		sourceInfo.hasSource = true;
		sourceInfo.sourceLength = source.size();
		sourceInfo.lineCount = lines.size();
		if (instance.IsA("BaseScript")) sourceInfo.enabled = instance.Enabled;
	}

	const properties: Record<string, unknown> = {};
	for (const propertyName of propertyNames) {
		if (propertyName.lower() === "source" && instance.IsA("LuaSourceContainer")) {
			properties[propertyName] = {
				omitted: true,
				reason: "Source is intentionally omitted from get_instance_summary. Use read_script_slice for targeted reads.",
				sourceLength: sourceInfo.sourceLength,
				lineCount: sourceInfo.lineCount,
			};
			continue;
		}

		const [ok, value] = pcall(() => (instance as unknown as Record<string, unknown>)[propertyName]);
		if (ok) properties[propertyName] = compactValue(value);
	}

	const children: Record<string, unknown>[] = [];
	if (includeChildren) {
		let emittedChildren = 0;
		for (const child of instance.GetChildren()) {
			if (emittedChildren >= maxChildren) break;
			children.push({
				name: child.Name,
				className: child.ClassName,
				path: getInstancePath(child),
				childCount: child.GetChildren().size(),
				hasSource: child.IsA("LuaSourceContainer"),
			});
			emittedChildren++;
		}
	}

	const childrenTruncated = includeChildren ? instance.GetChildren().size() > maxChildren : undefined;
	const summary = {
		instancePath,
		name: instance.Name,
		className: instance.ClassName,
		parent: instance.Parent ? getInstancePath(instance.Parent) : undefined,
		childCount: instance.GetChildren().size(),
		...sourceInfo,
		properties,
		children: includeChildren ? children : undefined,
		childrenTruncated,
	};

	const propertyLines: string[] = [];
	for (const [propertyName, value] of pairs(properties)) {
		propertyLines.push(`${propertyName}=${compactValueForText(value)}`);
	}

	const childLines: string[] = [];
	for (const child of children) {
		childLines.push(`${child.path} | ${child.className} | children=${child.childCount} | hasSource=${child.hasSource}`);
	}

	return {
		format: "compact",
		text: [
			`instance_summary path=${instancePath} class=${instance.ClassName} name=${instance.Name} children=${instance.GetChildren().size()} hasSource=${sourceInfo.hasSource ?? false}${sourceInfo.lineCount !== undefined ? ` lines=${sourceInfo.lineCount}` : ""}${sourceInfo.sourceLength !== undefined ? ` len=${sourceInfo.sourceLength}` : ""}`,
			`parent=${instance.Parent ? getInstancePath(instance.Parent) : "-"}`,
			`properties: ${propertyLines.size() > 0 ? propertyLines.join(" | ") : "-"}`,
			includeChildren ? `children emitted=${children.size()} truncated=${childrenTruncated ?? false}` : "children: omitted",
			...childLines,
		].join("\n"),
		...summary,
	};
}

function getFileTree(requestData: Record<string, unknown>) {
	const path = (requestData.path as string) ?? "";
	const startInstance = getInstanceByPath(path);

	if (!startInstance) {
		return { error: `Path not found: ${path}` };
	}

	function buildTree(instance: Instance, depth: number): TreeNode {
		if (depth > 10) {
			return { name: instance.Name, className: instance.ClassName, children: [] };
		}

		const node: TreeNode = {
			name: instance.Name,
			className: instance.ClassName,
			path: getInstancePath(instance),
			children: [],
		};

		if (instance.IsA("LuaSourceContainer")) {
			node.hasSource = true;
			node.scriptType = instance.ClassName;
			if (instance.IsA("BaseScript")) {
				node.enabled = instance.Enabled;
			}
		}

		for (const child of instance.GetChildren()) {
			node.children.push(buildTree(child, depth + 1));
		}

		return node;
	}

	return {
		tree: buildTree(startInstance, 0),
		timestamp: tick(),
	};
}

function searchFiles(requestData: Record<string, unknown>) {
	const query = requestData.query as string;
	const searchType = (requestData.searchType as string) ?? "name";

	if (!query) return { error: "Query is required" };

	const results: { name: string; className: string; path: string; hasSource: boolean; enabled?: boolean }[] = [];

	function searchRecursive(instance: Instance) {
		let match = false;

		if (searchType === "name") {
			match = instance.Name.lower().find(query.lower())[0] !== undefined;
		} else if (searchType === "type") {
			match = instance.ClassName.lower().find(query.lower())[0] !== undefined;
		} else if (searchType === "content" && instance.IsA("LuaSourceContainer")) {
			match = readScriptSource(instance).lower().find(query.lower())[0] !== undefined;
		}

		if (match) {
			const entry: { name: string; className: string; path: string; hasSource: boolean; enabled?: boolean } = {
				name: instance.Name,
				className: instance.ClassName,
				path: getInstancePath(instance),
				hasSource: instance.IsA("LuaSourceContainer"),
			};
			if (instance.IsA("BaseScript")) {
				entry.enabled = instance.Enabled;
			}
			results.push(entry);
		}

		for (const child of instance.GetChildren()) {
			searchRecursive(child);
		}
	}

	searchRecursive(game);

	return { results, query, searchType, count: results.size() };
}

function getPlaceInfo(_requestData: Record<string, unknown>) {
	return {
		placeName: game.Name,
		placeId: game.PlaceId,
		gameId: game.GameId,
		jobId: game.JobId,
		workspace: {
			name: game.Workspace.Name,
			className: game.Workspace.ClassName,
		},
	};
}

function getServices(requestData: Record<string, unknown>) {
	const serviceName = requestData.serviceName as string | undefined;

	if (serviceName) {
		const [ok, service] = pcall(() => game.GetService(serviceName as keyof Services));
		if (ok && service) {
			return {
				service: {
					name: service.Name,
					className: service.ClassName,
					path: getInstancePath(service as Instance),
					childCount: (service as Instance).GetChildren().size(),
				},
			};
		} else {
			return { error: `Service not found: ${serviceName}` };
		}
	} else {
		const services: { name: string; className: string; path: string; childCount: number }[] = [];
		const commonServices = [
			"Workspace", "Players", "StarterGui", "StarterPack", "StarterPlayer",
			"ReplicatedStorage", "ServerStorage", "ServerScriptService",
			"HttpService", "TeleportService", "DataStoreService",
		];

		for (const svcName of commonServices) {
			const [ok, service] = pcall(() => game.GetService(svcName as keyof Services));
			if (ok && service) {
				services.push({
					name: service.Name,
					className: service.ClassName,
					path: getInstancePath(service as Instance),
					childCount: (service as Instance).GetChildren().size(),
				});
			}
		}

		return { services };
	}
}

function searchObjects(requestData: Record<string, unknown>) {
	const query = requestData.query as string;
	const searchType = (requestData.searchType as string) ?? "name";
	const propertyName = requestData.propertyName as string | undefined;

	if (!query) return { error: "Query is required" };

	const results: { name: string; className: string; path: string }[] = [];

	function searchRecursive(instance: Instance) {
		let match = false;

		if (searchType === "name") {
			match = instance.Name.lower().find(query.lower())[0] !== undefined;
		} else if (searchType === "class") {
			match = instance.ClassName.lower().find(query.lower())[0] !== undefined;
		} else if (searchType === "property" && propertyName) {
			const [success, value] = pcall(() => tostring((instance as unknown as Record<string, unknown>)[propertyName]));
			if (success) {
				match = (value as string).lower().find(query.lower())[0] !== undefined;
			}
		}

		if (match) {
			results.push({
				name: instance.Name,
				className: instance.ClassName,
				path: getInstancePath(instance),
			});
		}

		for (const child of instance.GetChildren()) {
			searchRecursive(child);
		}
	}

	searchRecursive(game);

	return { results, query, searchType, count: results.size() };
}

function getInstanceProperties(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const excludeSource = (requestData.excludeSource as boolean) ?? false;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const properties: Record<string, unknown> = {};
	const [success, result] = pcall(() => {
		const basicProps = ["Name", "ClassName", "Parent"];
		for (const prop of basicProps) {
			const [propSuccess, propValue] = pcall(() => {
				const val = (instance as unknown as Record<string, unknown>)[prop];
				if (prop === "Parent" && val) return getInstancePath(val as Instance);
				if (val === undefined) return "nil";
				return tostring(val);
			});
			if (propSuccess) properties[prop] = propValue;
		}

		const commonProps = [
			"Size", "Position", "Rotation", "CFrame", "Anchored", "CanCollide",
			"Transparency", "BrickColor", "Material", "Color", "Text", "TextColor3",
			"BackgroundColor3", "Image", "ImageColor3", "Visible", "Active", "ZIndex",
			"BorderSizePixel", "BackgroundTransparency", "ImageTransparency",
			"TextTransparency", "Value", "Enabled", "Brightness", "Range", "Shadows",
			"Face", "SurfaceType",
		];

		for (const prop of commonProps) {
			const [propSuccess, propValue] = pcall(() => {
				const val = (instance as unknown as Record<string, unknown>)[prop];
				if (typeOf(val) === "UDim2") {
					const udim = val as UDim2;
					return {
						X: { Scale: udim.X.Scale, Offset: udim.X.Offset },
						Y: { Scale: udim.Y.Scale, Offset: udim.Y.Offset },
						_type: "UDim2",
					};
				}
				return tostring(val);
			});
			if (propSuccess) properties[prop] = propValue;
		}

		if (instance.IsA("LuaSourceContainer")) {
			if (!excludeSource) {
				properties.Source = readScriptSource(instance);
			} else {
				const src = readScriptSource(instance);
				properties.SourceLength = src.size();
				properties.LineCount = Utils.splitLines(src)[0].size();
			}
			if (instance.IsA("BaseScript")) {
				properties.Enabled = tostring(instance.Enabled);
			}
		}

		if (instance.IsA("Part")) {
			properties.Shape = tostring(instance.Shape);
		}

		if (instance.IsA("BasePart")) {
			properties.TopSurface = tostring(instance.TopSurface);
			properties.BottomSurface = tostring(instance.BottomSurface);
		}

		if (instance.IsA("MeshPart")) {
			properties.MeshId = tostring(instance.MeshId);
			properties.TextureID = tostring(instance.TextureID);
		}

		if (instance.IsA("SpecialMesh")) {
			properties.MeshId = tostring(instance.MeshId);
			properties.TextureId = tostring(instance.TextureId);
			properties.MeshType = tostring(instance.MeshType);
		}

		if (instance.IsA("Sound")) {
			properties.SoundId = tostring(instance.SoundId);
			properties.TimeLength = tostring(instance.TimeLength);
			properties.IsPlaying = tostring(instance.IsPlaying);
		}

		if (instance.IsA("Animation")) {
			properties.AnimationId = tostring(instance.AnimationId);
		}

		if (instance.IsA("Decal") || instance.IsA("Texture")) {
			properties.Texture = tostring((instance as Decal | Texture).Texture);
		}

		if (instance.IsA("Shirt")) {
			properties.ShirtTemplate = tostring(instance.ShirtTemplate);
		} else if (instance.IsA("Pants")) {
			properties.PantsTemplate = tostring(instance.PantsTemplate);
		} else if (instance.IsA("ShirtGraphic")) {
			properties.Graphic = tostring(instance.Graphic);
		}

		properties.ChildCount = tostring(instance.GetChildren().size());
	});

	if (success) {
		return { instancePath, className: instance.ClassName, properties };
	} else {
		return { error: `Failed to get properties: ${result}` };
	}
}

function getInstanceChildren(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const children: { name: string; className: string; path: string; hasChildren: boolean; hasSource: boolean; enabled?: boolean }[] = [];
	for (const child of instance.GetChildren()) {
		const entry: { name: string; className: string; path: string; hasChildren: boolean; hasSource: boolean; enabled?: boolean } = {
			name: child.Name,
			className: child.ClassName,
			path: getInstancePath(child),
			hasChildren: child.GetChildren().size() > 0,
			hasSource: child.IsA("LuaSourceContainer"),
		};
		if (child.IsA("BaseScript")) {
			entry.enabled = child.Enabled;
		}
		children.push(entry);
	}

	return { instancePath, children, count: children.size() };
}

function searchByProperty(requestData: Record<string, unknown>) {
	const propertyName = requestData.propertyName as string;
	const propertyValue = requestData.propertyValue as string;

	if (!propertyName || !propertyValue) {
		return { error: "Property name and value are required" };
	}

	const results: { name: string; className: string; path: string; propertyValue: string }[] = [];

	function searchRecursive(instance: Instance) {
		const [success, value] = pcall(() => tostring((instance as unknown as Record<string, unknown>)[propertyName]));
		if (success && (value as string).lower().find(propertyValue.lower())[0] !== undefined) {
			results.push({
				name: instance.Name,
				className: instance.ClassName,
				path: getInstancePath(instance),
				propertyValue: value as string,
			});
		}
		for (const child of instance.GetChildren()) {
			searchRecursive(child);
		}
	}

	searchRecursive(game);
	return { propertyName, propertyValue, results, count: results.size() };
}

function getClassInfo(requestData: Record<string, unknown>) {
	const className = requestData.className as string;
	if (!className) return { error: "Class name is required" };

	let [success, tempInstance] = pcall(() => new Instance(className as keyof CreatableInstances));
	let isService = false;

	if (!success) {
		const [serviceSuccess, serviceInstance] = pcall(() =>
			game.GetService(className as keyof Services),
		);
		if (serviceSuccess && serviceInstance) {
			success = true;
			tempInstance = serviceInstance as unknown as Instance;
			isService = true;
		}
	}

	if (!success) return { error: `Invalid class name: ${className}` };

	const classInfo: {
		className: string;
		isService: boolean;
		properties: string[];
		methods: string[];
		events: string[];
	} = { className, isService, properties: [], methods: [], events: [] };

	const commonProps = [
		"Name", "ClassName", "Parent", "Size", "Position", "Rotation", "CFrame",
		"Anchored", "CanCollide", "Transparency", "BrickColor", "Material", "Color",
		"Text", "TextColor3", "BackgroundColor3", "Image", "ImageColor3", "Visible",
		"Active", "ZIndex", "BorderSizePixel", "BackgroundTransparency",
		"ImageTransparency", "TextTransparency", "Value", "Enabled", "Brightness",
		"Range", "Shadows",
	];

	for (const prop of commonProps) {
		const [propSuccess] = pcall(() => (tempInstance as unknown as Record<string, unknown>)[prop]);
		if (propSuccess) classInfo.properties.push(prop);
	}

	const commonMethods = [
		"Destroy", "Clone", "FindFirstChild", "FindFirstChildOfClass",
		"GetChildren", "IsA", "IsAncestorOf", "IsDescendantOf", "WaitForChild",
	];

	for (const method of commonMethods) {
		const [methodSuccess] = pcall(() => (tempInstance as unknown as Record<string, unknown>)[method]);
		if (methodSuccess) classInfo.methods.push(method);
	}

	if (!isService) {
		(tempInstance as Instance).Destroy();
	}

	return classInfo;
}

function getProjectStructure(requestData: Record<string, unknown>) {
	const startPath = (requestData.path as string) ?? "";
	const maxDepth = (requestData.maxDepth as number) ?? 3;
	const showScriptsOnly = (requestData.scriptsOnly as boolean) ?? false;

	if (startPath === "" || startPath === "game") {
		const services: Record<string, unknown>[] = [];
		const mainServices = [
			"Workspace", "ServerScriptService", "ServerStorage", "ReplicatedStorage",
			"StarterGui", "StarterPack", "StarterPlayer", "Players",
		];

		for (const serviceName of mainServices) {
			const [svcOk, service] = pcall(() => game.GetService(serviceName as keyof Services));
			if (svcOk && service) {
				services.push({
					name: service.Name,
					className: service.ClassName,
					path: getInstancePath(service as Instance),
					childCount: (service as Instance).GetChildren().size(),
					hasChildren: (service as Instance).GetChildren().size() > 0,
				});
			}
		}

		return {
			type: "service_overview",
			services,
			timestamp: tick(),
			note: "Use path parameter to explore specific locations (e.g., 'game.ServerScriptService')",
		};
	}

	const startInstance = getInstanceByPath(startPath);
	if (!startInstance) return { error: `Path not found: ${startPath}` };

	function getStructure(instance: Instance, depth: number): Record<string, unknown> {
		if (depth > maxDepth) {
			return {
				name: instance.Name,
				className: instance.ClassName,
				path: getInstancePath(instance),
				childCount: instance.GetChildren().size(),
				hasMore: true,
				note: "Max depth reached - use this path to explore further",
			};
		}

		const node: Record<string, unknown> = {
			name: instance.Name,
			className: instance.ClassName,
			path: getInstancePath(instance),
			children: [] as Record<string, unknown>[],
		};

		if (instance.IsA("LuaSourceContainer")) {
			node.hasSource = true;
			node.scriptType = instance.ClassName;
			if (instance.IsA("BaseScript")) {
				node.enabled = instance.Enabled;
			}
		}

		if (instance.IsA("GuiObject")) {
			node.visible = instance.Visible;
			if (instance.IsA("Frame") || instance.IsA("ScreenGui")) {
				node.guiType = "container";
			} else if (instance.IsA("TextLabel") || instance.IsA("TextButton")) {
				node.guiType = "text";
				const textInst = instance as TextLabel | TextButton;
				if (textInst.Text !== "") node.text = textInst.Text;
			} else if (instance.IsA("ImageLabel") || instance.IsA("ImageButton")) {
				node.guiType = "image";
			}
		}

		let children = instance.GetChildren();
		if (showScriptsOnly) {
			children = children.filter(
				(child) => child.IsA("BaseScript") || child.IsA("Folder") || child.IsA("ModuleScript"),
			);
		}

		const nodeChildren = node.children as Record<string, unknown>[];
		const childCount = children.size();
		if (childCount > 20 && depth < maxDepth) {
			const classGroups = new Map<string, Instance[]>();
			for (const child of children) {
				const cn = child.ClassName;
				if (!classGroups.has(cn)) classGroups.set(cn, []);
				classGroups.get(cn)!.push(child);
			}

			const childSummary: Record<string, unknown>[] = [];
			classGroups.forEach((classChildren, cn) => {
				childSummary.push({
					className: cn,
					count: classChildren.size(),
					examples: [classChildren[0]?.Name, classChildren[1]?.Name],
				});
			});
			node.childSummary = childSummary;

			classGroups.forEach((classChildren, cn) => {
				const limit = math.min(3, classChildren.size());
				for (let i = 0; i < limit; i++) {
					nodeChildren.push(getStructure(classChildren[i], depth + 1));
				}
				if (classChildren.size() > 3) {
					nodeChildren.push({
						name: `... ${classChildren.size() - 3} more ${cn} objects`,
						className: "MoreIndicator",
						path: `${getInstancePath(instance)} [${cn} children]`,
						note: "Use specific path to explore these objects",
					});
				}
			});
		} else {
			for (const child of children) {
				nodeChildren.push(getStructure(child, depth + 1));
			}
		}

		return node;
	}

	const result = getStructure(startInstance, 0);
	result.requestedPath = startPath;
	result.maxDepth = maxDepth;
	result.scriptsOnly = showScriptsOnly;
	result.timestamp = tick();

	return result;
}

function grepScripts(requestData: Record<string, unknown>) {
	const pattern = requestData.pattern as string;
	if (!pattern) return { error: "pattern is required" };

	const caseSensitive = (requestData.caseSensitive as boolean) ?? false;
	const contextLines = (requestData.contextLines as number) ?? 0;
	const maxResults = (requestData.maxResults as number) ?? 100;
	const maxResultsPerScript = (requestData.maxResultsPerScript as number) ?? 0;
	const usePattern = (requestData.usePattern as boolean) ?? false;
	const filesOnly = (requestData.filesOnly as boolean) ?? false;
	const searchPath = (requestData.path as string) ?? "";
	const classFilter = requestData.classFilter as string | undefined;

	const startInstance = searchPath !== "" ? getInstanceByPath(searchPath) : game;
	if (!startInstance) return { error: `Path not found: ${searchPath}` };

	// Prepare pattern for matching
	const searchPattern = caseSensitive ? pattern : pattern.lower();

	interface LineMatch {
		line: number;
		column: number;
		text: string;
		before: string[];
		after: string[];
	}

	interface ScriptResult {
		instancePath: string;
		name: string;
		className: string;
		enabled?: boolean;
		matches: LineMatch[];
	}

	const results: ScriptResult[] = [];
	let totalMatches = 0;
	let scriptsSearched = 0;
	let hitLimit = false;

	function searchInstance(instance: Instance) {
		if (hitLimit) return;

		if (instance.IsA("LuaSourceContainer")) {
			// Apply class filter
			if (classFilter) {
				if (!instance.ClassName.lower().find(classFilter.lower())[0]) return;
			}

			scriptsSearched++;
			const source = readScriptSource(instance);
			const [lines] = Utils.splitLines(source);
			const scriptMatches: LineMatch[] = [];
			let scriptMatchCount = 0;

			for (let i = 0; i < lines.size(); i++) {
				if (hitLimit) break;
				if (maxResultsPerScript > 0 && scriptMatchCount >= maxResultsPerScript) break;

				const line = lines[i];
				const searchLine = caseSensitive ? line : line.lower();

				let matchStart: number | undefined;
				let matchEnd: number | undefined;

				if (usePattern) {
					[matchStart, matchEnd] = string.find(searchLine, searchPattern);
				} else {
					[matchStart, matchEnd] = string.find(searchLine, searchPattern, 1, true);
				}

				if (matchStart !== undefined) {
					scriptMatchCount++;
					totalMatches++;

					if (totalMatches > maxResults) {
						hitLimit = true;
						break;
					}

					if (!filesOnly) {
						// Gather context lines
						const before: string[] = [];
						const after: string[] = [];

						if (contextLines > 0) {
							const beforeStart = math.max(0, i - contextLines);
							for (let j = beforeStart; j < i; j++) {
								before.push(lines[j]);
							}
							const afterEnd = math.min(lines.size() - 1, i + contextLines);
							for (let j = i + 1; j <= afterEnd; j++) {
								after.push(lines[j]);
							}
						}

						scriptMatches.push({
							line: i + 1, // 1-indexed
							column: matchStart,
							text: line,
							before,
							after,
						});
					}
				}
			}

			if (scriptMatchCount > 0) {
				const scriptResult: ScriptResult = {
					instancePath: getInstancePath(instance),
					name: instance.Name,
					className: instance.ClassName,
					matches: scriptMatches,
				};
				if (instance.IsA("BaseScript")) {
					scriptResult.enabled = instance.Enabled;
				}
				results.push(scriptResult);
			}
		}

		for (const child of instance.GetChildren()) {
			if (hitLimit) return;
			searchInstance(child);
		}
	}

	searchInstance(startInstance);

	return {
		results,
		pattern,
		totalMatches: hitLimit ? `>${maxResults}` : totalMatches,
		scriptsSearched,
		scriptsMatched: results.size(),
		truncated: hitLimit,
		options: { caseSensitive, contextLines, usePattern, filesOnly, maxResults, maxResultsPerScript },
	};
}

function getDescendants(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const maxDepth = (requestData.maxDepth as number) ?? 10;
	const classFilter = requestData.classFilter as string | undefined;

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const descendants: { name: string; className: string; path: string; depth: number }[] = [];

	function collect(inst: Instance, depth: number) {
		if (depth > maxDepth) return;
		for (const child of inst.GetChildren()) {
			if (classFilter && !child.IsA(classFilter as keyof Instances)) continue;
			descendants.push({
				name: child.Name,
				className: child.ClassName,
				path: getInstancePath(child),
				depth,
			});
			collect(child, depth + 1);
		}
	}

	collect(instance, 1);

	return { instancePath, descendants, count: descendants.size(), maxDepth };
}

function compareInstances(requestData: Record<string, unknown>) {
	const instancePathA = requestData.instancePathA as string;
	const instancePathB = requestData.instancePathB as string;

	if (!instancePathA || !instancePathB) {
		return { error: "Both instancePathA and instancePathB are required" };
	}

	const instA = getInstanceByPath(instancePathA);
	if (!instA) return { error: `Instance not found: ${instancePathA}` };

	const instB = getInstanceByPath(instancePathB);
	if (!instB) return { error: `Instance not found: ${instancePathB}` };

	const commonProps = [
		"Name", "ClassName",
		"Size", "Position", "Rotation", "CFrame", "Anchored", "CanCollide",
		"Transparency", "BrickColor", "Material", "Color", "Text", "TextColor3",
		"BackgroundColor3", "Image", "ImageColor3", "Visible", "Active", "ZIndex",
		"BorderSizePixel", "BackgroundTransparency", "ImageTransparency",
		"TextTransparency", "Value", "Enabled", "Brightness", "Range", "Shadows",
	];

	const matching: Record<string, string> = {};
	const differing: Record<string, { a: string; b: string }> = {};
	const onlyA: string[] = [];
	const onlyB: string[] = [];

	for (const prop of commonProps) {
		const [okA, valA] = pcall(() => tostring((instA as unknown as Record<string, unknown>)[prop]));
		const [okB, valB] = pcall(() => tostring((instB as unknown as Record<string, unknown>)[prop]));

		if (okA && okB) {
			if (valA === valB) {
				matching[prop] = valA as string;
			} else {
				differing[prop] = { a: valA as string, b: valB as string };
			}
		} else if (okA) {
			onlyA.push(prop);
		} else if (okB) {
			onlyB.push(prop);
		}
	}

	return {
		instancePathA,
		instancePathB,
		classNameA: instA.ClassName,
		classNameB: instB.ClassName,
		matching,
		differing,
		onlyA,
		onlyB,
	};
}

function getOutputLog(requestData: Record<string, unknown>) {
	const maxEntries = (requestData.maxEntries as number) ?? 100;
	const messageTypeFilter = requestData.messageType as string | undefined;

	const [success, result] = pcall(() => {
		const LogService = game.GetService("LogService");
		const history = LogService.GetLogHistory();
		const allEntries: Record<string, unknown>[] = [];

		for (const entry of history) {
			const msgType = tostring(entry.messageType);
			if (messageTypeFilter && msgType !== messageTypeFilter) continue;
			allEntries.push({
				message: entry.message,
				messageType: msgType,
				timestamp: entry.timestamp,
			});
		}

		const startIdx = math.max(0, allEntries.size() - maxEntries);
		const finalEntries: Record<string, unknown>[] = [];
		for (let i = startIdx; i < allEntries.size(); i++) {
			finalEntries.push(allEntries[i]);
		}

		return { entries: finalEntries, count: finalEntries.size(), totalAvailable: allEntries.size() };
	});

	if (success) return result;
	return { error: `Failed to get output log: ${result}` };
}

export = {
	getFileTree,
	searchFiles,
	getPlaceInfo,
	getServices,
	searchObjects,
	getInstanceProperties,
	getInstanceChildren,
	searchByProperty,
	getClassInfo,
	getProjectStructure,
	getProjectMap,
	findInstances,
	findScripts,
	findReferences,
	getInstanceSummary,
	grepScripts,
	getDescendants,
	compareInstances,
	getOutputLog,
};
