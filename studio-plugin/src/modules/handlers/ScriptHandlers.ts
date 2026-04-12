import Utils from "../Utils";
import Recording from "../Recording";

const ScriptEditorService = game.GetService("ScriptEditorService");

const { getInstancePath, getInstanceByPath, readScriptSource, splitLines, joinLines } = Utils;
const { beginRecording, finishRecording } = Recording;

function normalizeEscapes(s: string): string {
	let result = s;
	result = result.gsub("\\\\", "\x01")[0];
	result = result.gsub("\\n", "\n")[0];
	result = result.gsub("\\t", "\t")[0];
	result = result.gsub("\\r", "\r")[0];
	result = result.gsub('\\"', '"')[0];
	result = result.gsub("\x01", "\\")[0];
	return result;
}

function pushUnique(values: string[], value: string, maxItems = 50) {
	if (!value || values.size() >= maxItems) return;
	value = compactToken(value);
	for (const existing of values) {
		if (existing === value) return;
	}
	values.push(value);
}

function compactToken(value: string, maxLength = 180): string {
	let result = value.gsub("\n", "\\n")[0].gsub("\r", "\\r")[0];
	if (result.size() > maxLength) {
		result = `${result.sub(1, maxLength)}...`;
	}
	return result;
}

function computeSourceHash(source: string): string {
	let hash = 5381;
	for (let i = 1; i <= source.size(); i++) {
		const byte = string.byte(source, i)[0] ?? 0;
		hash = (hash * 33 + byte) % 2147483647;
	}
	return tostring(hash);
}

function getScriptOutline(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const source = readScriptSource(instance);
	const [lines] = splitLines(source);
	const requires: string[] = [];
	const services: string[] = [];
	const functions: string[] = [];
	const remoteReferences: string[] = [];

	for (const [match] of source.gmatch("require%s*%(([^%)]+)%)")) {
		pushUnique(requires, tostring(match));
	}
	for (const [match] of source.gmatch("GetService%s*%(%s*[\"']([^\"']+)[\"']%s*%)")) {
		pushUnique(services, tostring(match));
	}
	for (const [match] of source.gmatch("local%s+function%s+([%w_%.:]+)")) {
		pushUnique(functions, tostring(match));
	}
	for (const [match] of source.gmatch("function%s+([%w_%.:]+)")) {
		pushUnique(functions, tostring(match));
	}
	for (const [match] of source.gmatch("([%w_%.:]+)%s*=%s*function")) {
		pushUnique(functions, tostring(match));
	}

	const remoteTokens = [
		"RemoteEvent", "RemoteFunction", "FireServer", "FireClient", "FireAllClients",
		"InvokeServer", "InvokeClient", "OnServerEvent", "OnClientEvent",
		"OnServerInvoke", "OnClientInvoke",
	];
	for (const token of remoteTokens) {
		if (source.find(token, 1, true)[0] !== undefined) pushUnique(remoteReferences, token);
	}

	const outline: Record<string, unknown> = {
		instancePath,
		className: instance.ClassName,
		name: instance.Name,
		sourceLength: source.size(),
		lineCount: lines.size(),
		sourceHash: computeSourceHash(source),
		requires,
		services,
		functions,
		remoteReferences,
	};
	if (instance.IsA("BaseScript")) outline.enabled = instance.Enabled;

	const formatList = (label: string, values: string[]) => `${label}: ${values.size() > 0 ? values.join(", ") : "-"}`;
	return {
		format: "compact",
		text: [
			`script_outline path=${instancePath} class=${instance.ClassName} lines=${lines.size()} len=${source.size()} hash=${outline.sourceHash}${outline.enabled !== undefined ? ` enabled=${outline.enabled}` : ""}`,
			formatList("requires", requires),
			formatList("services", services),
			formatList("functions", functions),
			formatList("remotes", remoteReferences),
		].join("\n"),
		...outline,
	};
}

function clampLine(value: number | undefined, fallback: number, minValue: number, maxValue: number): number {
	return math.clamp(math.floor(value ?? fallback), minValue, maxValue);
}

function readScriptSlice(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const source = readScriptSource(instance);
	const [lines] = splitLines(source);
	const totalLines = lines.size();
	const aroundPattern = requestData.aroundPattern as string | undefined;
	const contextLines = math.clamp(math.floor((requestData.contextLines as number) ?? 6), 0, 100);
	const maxChars = math.clamp(math.floor((requestData.maxChars as number) ?? 12000), 1000, 100000);
	const numbered = (requestData.numbered as boolean) ?? true;

	let startLine = clampLine(requestData.startLine as number | undefined, 1, 1, totalLines);
	let endLine = clampLine(requestData.endLine as number | undefined, math.min(totalLines, startLine + 119), 1, totalLines);
	let matchLine: number | undefined;

	if (aroundPattern && aroundPattern !== "") {
		const query = aroundPattern.lower();
		for (let i = 0; i < totalLines; i++) {
			if (lines[i].lower().find(query, 1, true)[0] !== undefined) {
				matchLine = i + 1;
				startLine = math.max(1, matchLine - contextLines);
				endLine = math.min(totalLines, matchLine + contextLines);
				break;
			}
		}
		if (matchLine === undefined) {
			return {
				format: "compact",
				text: `script_slice path=${instancePath} pattern_not_found=${aroundPattern} lineCount=${totalLines}`,
				instancePath,
				lineCount: totalLines,
				patternFound: false,
			};
		}
	}

	if (endLine < startLine) endLine = startLine;

	const outLines: string[] = [];
	let charCount = 0;
	let truncated = false;

	for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
		const rawLine = lines[lineNo - 1] ?? "";
		const renderedLine = numbered ? `${lineNo}: ${rawLine}` : rawLine;
		const nextCharCount = charCount + renderedLine.size() + 1;
		if (nextCharCount > maxChars) {
			const remaining = maxChars - charCount;
			if (remaining > 20) {
				outLines.push(`${renderedLine.sub(1, remaining - 3)}...`);
			}
			truncated = true;
			break;
		}
		outLines.push(renderedLine);
		charCount = nextCharCount;
	}

	const text = [
		`script_slice path=${instancePath} class=${instance.ClassName} lines=${startLine}-${endLine}/${totalLines} chars=${charCount} truncated=${truncated}${matchLine !== undefined ? ` matchLine=${matchLine}` : ""}`,
		outLines.join("\n"),
	].join("\n");

	return {
		format: "compact",
		text,
		instancePath,
		className: instance.ClassName,
		name: instance.Name,
		startLine,
		endLine,
		lineCount: totalLines,
		matchLine,
		truncated,
	};
}

function getScriptSource(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const startLine = requestData.startLine as number | undefined;
	const endLine = requestData.endLine as number | undefined;

	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const [success, result] = pcall(() => {
		const fullSource = readScriptSource(instance);
		const [lines, hasTrailingNewline] = splitLines(fullSource);
		const totalLineCount = lines.size();

		let sourceToReturn = fullSource;
		let returnedStartLine = 1;
		let returnedEndLine = totalLineCount;

		if (startLine !== undefined || endLine !== undefined) {
			const actualStartLine = math.max(1, startLine ?? 1);
			const actualEndLine = math.min(lines.size(), endLine ?? lines.size());

			const selectedLines: string[] = [];
			for (let i = actualStartLine; i <= actualEndLine; i++) {
				selectedLines.push(lines[i - 1] ?? "");
			}

			sourceToReturn = selectedLines.join("\n");
			if (hasTrailingNewline && actualEndLine === lines.size() && sourceToReturn.sub(-1) !== "\n") {
				sourceToReturn += "\n";
			}
			returnedStartLine = actualStartLine;
			returnedEndLine = actualEndLine;
		}

		const numberedLines: string[] = [];
		const linesToNumber = startLine !== undefined ? splitLines(sourceToReturn)[0] : lines;
		const lineOffset = returnedStartLine - 1;
		for (let i = 0; i < linesToNumber.size(); i++) {
			numberedLines.push(`${i + 1 + lineOffset}: ${linesToNumber[i]}`);
		}
		const numberedSource = numberedLines.join("\n");

		const resp: Record<string, unknown> = {
			instancePath,
			className: instance.ClassName,
			name: instance.Name,
			source: sourceToReturn,
			numberedSource,
			sourceLength: fullSource.size(),
			lineCount: totalLineCount,
			startLine: returnedStartLine,
			endLine: returnedEndLine,
			isPartial: startLine !== undefined || endLine !== undefined,
			truncated: false,
		};

		if (startLine === undefined && endLine === undefined && fullSource.size() > 50000) {
			const truncatedLines: string[] = [];
			const truncatedNumberedLines: string[] = [];
			const maxLines = math.min(1000, lines.size());
			for (let i = 0; i < maxLines; i++) {
				truncatedLines.push(lines[i]);
				truncatedNumberedLines.push(`${i + 1}: ${lines[i]}`);
			}
			resp.source = truncatedLines.join("\n");
			resp.numberedSource = truncatedNumberedLines.join("\n");
			resp.truncated = true;
			resp.endLine = maxLines;
			resp.note = "Script truncated to first 1000 lines. Use startLine/endLine parameters to read specific sections.";
		}

		if (instance.IsA("BaseScript")) {
			resp.enabled = instance.Enabled;
		}

		let topServiceInst: Instance = instance;
		while (topServiceInst.Parent && topServiceInst.Parent !== game) {
			topServiceInst = topServiceInst.Parent;
		}
		resp.topService = topServiceInst.Name;

		return resp;
	});

	if (success) {
		return result;
	} else {
		return { error: `Failed to get script source: ${result}` };
	}
}

function setScriptSource(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const newSource = requestData.source as string;

	if (!instancePath || !newSource) return { error: "Instance path and source are required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const sourceToSet = normalizeEscapes(newSource);
	const recordingId = beginRecording(`Set script source: ${instance.Name}`);

	const [updateSuccess, updateResult] = pcall(() => {
		const oldSourceLength = readScriptSource(instance).size();

		ScriptEditorService.UpdateSourceAsync(instance, () => sourceToSet);

		return {
			success: true, instancePath,
			oldSourceLength, newSourceLength: sourceToSet.size(),
			method: "UpdateSourceAsync",
			message: "Script source updated successfully (editor-safe)",
		};
	});

	if (updateSuccess) {
		finishRecording(recordingId, true);
		return updateResult;
	}

	const [directSuccess, directResult] = pcall(() => {
		const oldSource = (instance as unknown as { Source: string }).Source;
		(instance as unknown as { Source: string }).Source = sourceToSet;

		return {
			success: true, instancePath,
			oldSourceLength: oldSource.size(), newSourceLength: sourceToSet.size(),
			method: "direct",
			message: "Script source updated successfully (direct assignment)",
		};
	});

	if (directSuccess) {
		finishRecording(recordingId, true);
		return directResult;
	}

	const [replaceSuccess, replaceResult] = pcall(() => {
		const parent = instance.Parent;
		const name = instance.Name;
		const className = instance.ClassName;
		const wasBaseScript = instance.IsA("BaseScript");
		const enabled = wasBaseScript ? instance.Enabled : undefined;

		const newScript = new Instance(className as keyof CreatableInstances) as LuaSourceContainer;
		newScript.Name = name;
		(newScript as unknown as { Source: string }).Source = sourceToSet;
		if (wasBaseScript && enabled !== undefined) {
			(newScript as BaseScript).Enabled = enabled;
		}

		newScript.Parent = parent;
		instance.Destroy();

		return {
			success: true,
			instancePath: getInstancePath(newScript),
			method: "replace",
			message: "Script replaced successfully with new source",
		};
	});

	if (replaceSuccess) {
		finishRecording(recordingId, true);
		return replaceResult;
	}

	finishRecording(recordingId, false);
	return {
		error: `Failed to set script source. UpdateSourceAsync failed: ${updateResult}. Direct assignment failed: ${directResult}. Replace method failed: ${replaceResult}`,
	};
}

function editScriptLines(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	let oldString = requestData.old_string as string;
	let newString = requestData.new_string as string;

	if (!instancePath || oldString === undefined || newString === undefined) {
		return { error: "Instance path, old_string, and new_string are required" };
	}

	oldString = normalizeEscapes(oldString);
	newString = normalizeEscapes(newString);

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const recordingId = beginRecording(`Edit script: ${instance.Name}`);

	const [success, result] = pcall(() => {
		const source = readScriptSource(instance);

		// Count occurrences to ensure uniqueness
		let count = 0;
		let searchPos = 1;
		const searchLen = oldString.size();

		while (true) {
			const [foundStart] = string.find(source, oldString, searchPos, true);
			if (foundStart === undefined) break;
			count++;
			if (count > 1) break;
			searchPos = foundStart + searchLen;
		}

		if (count === 0) error("old_string not found in script");
		if (count > 1) error("old_string matches multiple locations. Provide more surrounding context to make it unique");

		// Perform the replacement (plain literal find + replace)
		const escaped = escapeLuaPattern(oldString);
		const escapedRepl = escapeLuaReplacement(newString);
		const [newSource] = string.gsub(source, escaped, escapedRepl, 1);

		ScriptEditorService.UpdateSourceAsync(instance, () => newSource);

		return {
			success: true,
			instancePath,
			message: "Script edited successfully",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to edit script: ${result}` };
}

function insertScriptLines(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const afterLine = (requestData.afterLine as number) ?? 0;
	let newContent = requestData.newContent as string;

	if (!instancePath || !newContent) return { error: "Instance path and newContent are required" };

	newContent = normalizeEscapes(newContent);

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const recordingId = beginRecording(`Insert script lines after line ${afterLine}: ${instance.Name}`);

	const [success, result] = pcall(() => {
		const [lines, hadTrailingNewline] = splitLines(readScriptSource(instance));
		const totalLines = lines.size();

		if (afterLine < 0 || afterLine > totalLines) error(`afterLine out of range (0-${totalLines})`);

		const [newLines] = splitLines(newContent);
		const resultLines: string[] = [];

		for (let i = 0; i < afterLine; i++) resultLines.push(lines[i]);
		for (const line of newLines) resultLines.push(line);
		for (let i = afterLine; i < totalLines; i++) resultLines.push(lines[i]);

		const newSource = joinLines(resultLines, hadTrailingNewline);
		ScriptEditorService.UpdateSourceAsync(instance, () => newSource);

		return {
			success: true, instancePath,
			insertedAfterLine: afterLine,
			linesInserted: newLines.size(),
			newLineCount: resultLines.size(),
			message: "Script lines inserted successfully",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to insert script lines: ${result}` };
}

function deleteScriptLines(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const startLine = requestData.startLine as number;
	const endLine = requestData.endLine as number;

	if (!instancePath || !startLine || !endLine) {
		return { error: "Instance path, startLine, and endLine are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	if (!instance.IsA("LuaSourceContainer")) {
		return { error: `Instance is not a script-like object: ${instance.ClassName}` };
	}

	const recordingId = beginRecording(`Delete script lines ${startLine}-${endLine}: ${instance.Name}`);

	const [success, result] = pcall(() => {
		const [lines, hadTrailingNewline] = splitLines(readScriptSource(instance));
		const totalLines = lines.size();

		if (startLine < 1 || startLine > totalLines) error(`startLine out of range (1-${totalLines})`);
		if (endLine < startLine || endLine > totalLines) error(`endLine out of range (${startLine}-${totalLines})`);

		const resultLines: string[] = [];
		for (let i = 0; i < startLine - 1; i++) resultLines.push(lines[i]);
		for (let i = endLine; i < totalLines; i++) resultLines.push(lines[i]);

		const newSource = joinLines(resultLines, hadTrailingNewline);
		ScriptEditorService.UpdateSourceAsync(instance, () => newSource);

		return {
			success: true, instancePath,
			deletedLines: { startLine, endLine },
			linesDeleted: endLine - startLine + 1,
			newLineCount: resultLines.size(),
			message: "Script lines deleted successfully",
		};
	});

	if (success) {
		finishRecording(recordingId, true);
		return result;
	}
	finishRecording(recordingId, false);
	return { error: `Failed to delete script lines: ${result}` };
}

function escapeLuaPattern(s: string): string {
	return s.gsub("([%(%)%.%%%+%-%*%?%[%]%^%$])", "%%%1")[0];
}

function escapeLuaReplacement(s: string): string {
	return s.gsub("%%", "%%%%")[0];
}

function caseInsensitiveLiteralReplace(src: string, searchStr: string, repl: string): [string, number] {
	const lowerSrc = src.lower();
	const lowerSearch = searchStr.lower();
	const parts: string[] = [];
	let lastEnd = 1;
	const searchLen = lowerSearch.size();
	let pos = 1;
	let replCount = 0;

	while (true) {
		const [foundStart] = string.find(lowerSrc, lowerSearch, pos, true);
		if (foundStart === undefined) break;
		parts.push(string.sub(src, lastEnd, foundStart - 1));
		parts.push(repl);
		lastEnd = foundStart + searchLen;
		pos = foundStart + searchLen;
		replCount++;
	}
	parts.push(string.sub(src, lastEnd));
	return [parts.join(""), replCount];
}

function findAndReplaceInScripts(requestData: Record<string, unknown>) {
	const searchPattern = requestData.pattern as string;
	const replacement = requestData.replacement as string;

	if (!searchPattern) return { error: "pattern is required" };
	if (replacement === undefined) return { error: "replacement is required" };

	const caseSensitive = (requestData.caseSensitive as boolean) ?? false;
	const usePattern = (requestData.usePattern as boolean) ?? false;
	const searchPath = (requestData.path as string) ?? "";
	const classFilter = requestData.classFilter as string | undefined;
	const dryRun = (requestData.dryRun as boolean) ?? false;
	const maxReplacements = (requestData.maxReplacements as number) ?? 1000;

	if (!caseSensitive && usePattern) {
		return { error: "Case-insensitive Lua pattern replacement is not supported. Use caseSensitive: true with usePattern: true, or use literal matching." };
	}

	const startInstance = searchPath !== "" ? getInstanceByPath(searchPath) : game;
	if (!startInstance) return { error: `Path not found: ${searchPath}` };

	interface ScriptChange {
		instancePath: string;
		name: string;
		className: string;
		replacements: number;
	}

	const changes: ScriptChange[] = [];
	let totalReplacements = 0;
	let scriptsSearched = 0;
	let hitLimit = false;

	const recordingId = dryRun ? undefined : beginRecording("Find and replace in scripts");

	function processInstance(instance: Instance) {
		if (hitLimit) return;

		if (instance.IsA("LuaSourceContainer")) {
			if (classFilter && !instance.ClassName.lower().find(classFilter.lower())[0]) return;

			scriptsSearched++;
			const source = readScriptSource(instance);

			let newSource: string;
			let replCount: number;

			if (usePattern) {
				const [result, count] = string.gsub(source, searchPattern, replacement);
				newSource = result;
				replCount = count;
			} else if (caseSensitive) {
				const escaped = escapeLuaPattern(searchPattern);
				const escapedRepl = escapeLuaReplacement(replacement);
				const [result, count] = string.gsub(source, escaped, escapedRepl);
				newSource = result;
				replCount = count;
			} else {
				[newSource, replCount] = caseInsensitiveLiteralReplace(source, searchPattern, replacement);
			}

			if (replCount > 0) {
				if (totalReplacements + replCount > maxReplacements) {
					hitLimit = true;
					return;
				}
				totalReplacements += replCount;

				if (!dryRun) {
					const [ok] = pcall(() => {
						ScriptEditorService.UpdateSourceAsync(instance, () => newSource);
					});
					if (!ok) {
						(instance as unknown as { Source: string }).Source = newSource;
					}
				}

				changes.push({
					instancePath: getInstancePath(instance),
					name: instance.Name,
					className: instance.ClassName,
					replacements: replCount,
				});
			}
		}

		for (const child of instance.GetChildren()) {
			if (hitLimit) return;
			processInstance(child);
		}
	}

	processInstance(startInstance);

	if (recordingId !== undefined) {
		finishRecording(recordingId, changes.size() > 0);
	}

	return {
		success: true,
		dryRun,
		pattern: searchPattern,
		replacement,
		totalReplacements,
		scriptsSearched,
		scriptsModified: changes.size(),
		changes,
		truncated: hitLimit,
	};
}

function getScriptAnalysis(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	if (!instancePath) return { error: "Instance path is required" };

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const results: Record<string, unknown>[] = [];

	function analyzeScript(scriptInstance: Instance) {
		if (!scriptInstance.IsA("LuaSourceContainer")) return;
		const source = readScriptSource(scriptInstance);
		const diagnostics: Record<string, unknown>[] = [];

		const [fn, compileError] = loadstring(source);
		if (!fn && compileError) {
			const [lineStr] = tostring(compileError).match(":(%d+):");
			diagnostics.push({
				line: lineStr ? tonumber(lineStr) : undefined,
				message: tostring(compileError),
				severity: "error",
			});
		}

		results.push({
			scriptPath: getInstancePath(scriptInstance),
			scriptName: scriptInstance.Name,
			diagnostics,
			hasErrors: diagnostics.size() > 0,
		});
	}

	if (instance.IsA("LuaSourceContainer")) {
		analyzeScript(instance);
	} else {
		for (const desc of instance.GetDescendants()) {
			analyzeScript(desc);
		}
	}

	return {
		results,
		totalScripts: results.size(),
		scriptsWithErrors: results.filter(r => (r as { hasErrors: boolean }).hasErrors).size(),
	};
}

export = {
	getScriptSource,
	getScriptOutline,
	readScriptSlice,
	setScriptSource,
	editScriptLines,
	insertScriptLines,
	deleteScriptLines,
	findAndReplaceInScripts,
	getScriptAnalysis,
};
